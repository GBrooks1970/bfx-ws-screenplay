/**
 * Unit tests for the environment-blocked build gate (`scripts/environmentBlockedGate.ts`,
 * ADR-010) — the piece that makes `EnvironmentBlockedError` actually mean
 * something to CI rather than just reading well in a log.
 *
 * The gate is safety-critical in one direction: it can only ever turn a red
 * build green, so every branch that must STAY red is pinned here — a mixed run,
 * an unparseable report, a crash with no scenarios, and a product failure whose
 * text merely quotes the marker.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectFailedScenarios,
  decideExitCode,
  isEnvironmentBlockedMessage,
} from '../../scripts/environmentBlockedGate';

/** The real shape emitted by @badeball/cypress-cucumber-preprocessor. */
function reportWith(...errors: string[]): unknown {
  return [
    {
      name: 'Trades channel',
      uri: 'cypress/e2e/features/SPEC-003-trades-channel.feature',
      elements: errors.map((error, index) => ({
        name: `scenario ${index + 1}`,
        type: 'scenario',
        steps: [
          { keyword: 'Given ', name: 'a connection', result: { status: 'passed', duration: 1 } },
          {
            keyword: 'Then ',
            name: 'an assertion',
            result: { status: 'failed', duration: 2, error_message: error },
          },
        ],
      })),
    },
  ];
}

/** The exact message the nightly #31068372818 failure carried. */
const QUIET_MARKET =
  'EnvironmentBlockedError: environment-blocked: no new trade executed within the ' +
  'observation window; connection, subscription and a schema-valid snapshot are all ' +
  'present, so this is a quiet market, not a product failure (symbol=tBTCUSD te=0)\n' +
  '    at Context.eval (http://localhost:33961/__cypress/tests?p=…:14275:17)';

const PRODUCT_FAILURE =
  'AssertionError: Expected the maintained book to match the platform checksum\n    at Context.eval';

describe('isEnvironmentBlockedMessage', () => {
  test('matches the error name marker', () => {
    assert.equal(isEnvironmentBlockedMessage(QUIET_MARKET), true);
  });

  test('matches the bare message prefix the constructor applies', () => {
    assert.equal(isEnvironmentBlockedMessage('environment-blocked: platform in maintenance'), true);
  });

  test('does NOT match a product failure', () => {
    assert.equal(isEnvironmentBlockedMessage(PRODUCT_FAILURE), false);
  });

  test('does NOT match a product failure that merely quotes the marker in its text', () => {
    // Anchoring to the start of the message is what prevents this false pass.
    assert.equal(
      isEnvironmentBlockedMessage(
        'AssertionError: expected status to be "environment-blocked: quiet" but got "open"',
      ),
      false,
    );
  });

  test('does not match an empty message', () => {
    assert.equal(isEnvironmentBlockedMessage(''), false);
  });
});

describe('collectFailedScenarios', () => {
  test('reduces a report to one entry per failed scenario, first line of the error', () => {
    const scenarios = collectFailedScenarios(reportWith(QUIET_MARKET, PRODUCT_FAILURE));
    assert.equal(scenarios.length, 2);
    assert.equal(scenarios[0]?.feature, 'Trades channel');
    assert.equal(scenarios[0]?.environmentBlocked, true);
    assert.equal(scenarios[1]?.environmentBlocked, false);
    assert.ok(!scenarios[0]?.error.includes('\n'), 'the stack tail is dropped');
  });

  test('a report with no failures yields nothing', () => {
    const passing = [
      {
        name: 'Ticker channel',
        elements: [{ name: 's', steps: [{ result: { status: 'passed', duration: 1 } }] }],
      },
    ];
    assert.deepEqual(collectFailedScenarios(passing), []);
  });

  test('unknown shapes yield nothing rather than throwing', () => {
    assert.deepEqual(collectFailedScenarios(null), []);
    assert.deepEqual(collectFailedScenarios('not a report'), []);
    assert.deepEqual(collectFailedScenarios([{ elements: 'nonsense' }]), []);
    assert.deepEqual(collectFailedScenarios([{ elements: [{ steps: [{ result: null }] }] }]), []);
  });
});

describe('decideExitCode', () => {
  test('a passing run stays green and is not second-guessed', () => {
    const decision = decideExitCode(reportWith(), 0);
    assert.equal(decision.exitCode, 0);
  });

  test('a run failing ONLY on environment-blocked outcomes passes the build', () => {
    // This is nightly #31068372818: 22 passing, 1 classified quiet market.
    const decision = decideExitCode(reportWith(QUIET_MARKET), 1);
    assert.equal(decision.exitCode, 0);
    assert.equal(decision.blocked.length, 1);
    assert.equal(decision.failures.length, 0);
    assert.match(decision.reason, /environment-blocked/);
  });

  test('a product failure ALONGSIDE a quiet market keeps the build red', () => {
    // The masking risk: one real regression must never ride out on a quiet night.
    const decision = decideExitCode(reportWith(QUIET_MARKET, PRODUCT_FAILURE), 1);
    assert.equal(decision.exitCode, 1);
    assert.equal(decision.failures.length, 1);
    assert.equal(decision.blocked.length, 1);
  });

  test('a product failure alone keeps the build red', () => {
    assert.equal(decideExitCode(reportWith(PRODUCT_FAILURE), 1).exitCode, 1);
  });

  test('a non-zero exit with NO failed scenario stays red (crash, config, missing report)', () => {
    const decision = decideExitCode(reportWith(), 1);
    assert.equal(decision.exitCode, 1);
    assert.match(decision.reason, /outside the scenarios/);
  });

  test('an unreadable report can never open the gate', () => {
    assert.equal(decideExitCode(null, 1).exitCode, 1);
    assert.equal(decideExitCode('garbage', 1).exitCode, 1);
  });

  test('the original non-zero code is preserved, not normalised to 1', () => {
    // Cypress exits with the failure count; #30686140556 exited 2.
    assert.equal(decideExitCode(reportWith(PRODUCT_FAILURE, PRODUCT_FAILURE), 2).exitCode, 2);
  });
});
