/**
 * Unit tests for the Screenplay error taxonomy (`cypress/support/screenplay/core/errors.ts`,
 * CODEX-06). The three error kinds are how outcomes are *routed* in reports:
 * `AssertionError` (the SUT misbehaved), `ConfigurationError` (the framework was
 * misused), and `EnvironmentBlockedError` (a distinguishable environment outcome,
 * not a product failure) — whose `environment-blocked:` message prefix and name
 * are the markers reports filter on, so both are pinned here.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssertionError,
  ConfigurationError,
  EnvironmentBlockedError,
} from '../../cypress/support/screenplay/core';

describe('error taxonomy', () => {
  test('AssertionError carries its name and message and is an Error', () => {
    const error = new AssertionError('bid exceeded ask');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'AssertionError');
    assert.equal(error.message, 'bid exceeded ask');
  });

  test('ConfigurationError carries its name and message', () => {
    const error = new ConfigurationError('missing ability');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'ConfigurationError');
    assert.equal(error.message, 'missing ability');
  });

  test('EnvironmentBlockedError prefixes its message with the report marker and names itself', () => {
    const error = new EnvironmentBlockedError('platform in maintenance');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'EnvironmentBlockedError');
    assert.equal(error.message, 'environment-blocked: platform in maintenance');
  });

  test('the three kinds are mutually distinguishable by instanceof', () => {
    assert.ok(!(new AssertionError('x') instanceof EnvironmentBlockedError));
    assert.ok(!(new EnvironmentBlockedError('x') instanceof ConfigurationError));
  });
});
