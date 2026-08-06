/**
 * Suite runner (ADR-010): runs the Cypress suite for a tag expression, then
 * applies the environment-blocked gate to its exit code.
 *
 * This is the only impure half of the gate — driving Cypress and reading the
 * report. The decision itself lives in `environmentBlockedGate.ts` and is
 * unit-tested there; this file must stay thin enough to read at a glance.
 *
 *   npm run test:smoke      → scripts/run-suite.ts "@smoke"
 *   npm run test:extended   → scripts/run-suite.ts "@smoke or @extended"
 *
 * Cypress is driven through its Node module API rather than by spawning the
 * binary: `cypress/bin/cypress` is not an exported subpath, and the `.bin`
 * shim differs between the project's local (Windows) and CI (Ubuntu) shells,
 * so the module API is the portable route. Extra arguments are parsed by
 * Cypress's own `parseRunArguments`, so
 * `npm run test:extended -- --spec cypress/e2e/features/SPEC-003-*.feature`
 * still works.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import cypress from 'cypress';
import { decideExitCode, formatDecision } from './environmentBlockedGate';

/** Matches the `json.output` path in `.cypress-cucumber-preprocessorrc.json`. */
const REPORT_PATH = resolve(process.cwd(), 'reports/cucumber-report.json');

function readReport(): unknown {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  } catch {
    // Missing or unparseable: the gate treats "cannot explain" as "stay red".
    return null;
  }
}

type RunOutcome = CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult;

/**
 * `CypressRunResult` carries no `status` field at all, so the union is narrowed
 * on the property's presence rather than its value.
 */
function isFailedRun(results: RunOutcome): results is CypressCommandLine.CypressFailedRunResult {
  return 'status' in results && results.status === 'failed';
}

async function main(): Promise<void> {
  const [tags, ...forwarded] = process.argv.slice(2);
  if (!tags) {
    console.error('usage: run-suite.ts <tag-expression> [...cypress run args]');
    process.exit(2);
  }

  const forwardedOptions =
    forwarded.length > 0
      ? await cypress.cli.parseRunArguments(['cypress', 'run', ...forwarded])
      : {};

  const results = await cypress.run({ ...forwardedOptions, env: { tags } });

  // A CypressFailedRunResult means Cypress could not complete the run at all
  // (bad config, missing browser). It carries no scenario results, so the gate
  // will keep it red — which is exactly right: an unrun suite is not a pass.
  const cypressExitCode = isFailedRun(results) ? results.failures || 1 : results.totalFailed;

  const decision = decideExitCode(readReport(), cypressExitCode);

  if (decision.blocked.length > 0 || decision.failures.length > 0) {
    console.log(formatDecision(decision));
  }
  process.exit(decision.exitCode);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
