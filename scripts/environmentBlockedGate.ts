/**
 * The build gate ADR-008 promised but never wired up (ADR-010).
 *
 * `EnvironmentBlockedError` is documented as "a distinguishable environment
 * outcome, not a product failure … the name is the marker reports are filtered
 * on" (`cypress/support/screenplay/core/errors.ts`). Nothing filtered on it:
 * `cypress run` counts any thrown error as a failing test and exits non-zero,
 * so a classified quiet market still turned the build red — nightly
 * #31068372818 failed on exactly the outcome the classifier had just explained
 * as "not a product failure".
 *
 * This module reads the cucumber JSON report and decides whether a non-zero
 * Cypress exit is explained *entirely* by environment-blocked outcomes. It is
 * deliberately pure — no filesystem, no process — so every branch is unit-tested
 * (`test/unit/environment-blocked-gate.test.ts`).
 *
 * The bias is conservative in one direction on purpose: anything the gate cannot
 * positively account for stays red. A crash before the suite runs, an
 * unparseable report, a failure with no recorded scenario — all keep the
 * original exit code. The gate only ever *downgrades* a failure it can name.
 */

/** The `error_message` marker: the error's own name, pinned by `errors.test.ts`. */
const ENVIRONMENT_BLOCKED_NAME = 'EnvironmentBlockedError';

/** The message prefix the error constructor applies, also pinned by `errors.test.ts`. */
const ENVIRONMENT_BLOCKED_PREFIX = 'environment-blocked:';

/** A failed scenario, reduced to what the gate decides on. */
export type FailedScenario = {
  feature: string;
  scenario: string;
  /** The failing step's error message, first line only. */
  error: string;
  /** The failure carries the environment-blocked marker. */
  environmentBlocked: boolean;
};

export type GateDecision = {
  /** The exit code the suite should report. */
  exitCode: number;
  /** Failures excused as environment outcomes (empty unless the gate opened). */
  blocked: FailedScenario[];
  /** Failures that keep the build red. */
  failures: FailedScenario[];
  /** One line explaining the decision, for the runner to print. */
  reason: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * True when a failing step's error carries the environment-blocked marker.
 *
 * Matching is anchored to the start of the message so a *product* failure whose
 * assertion text merely quotes the phrase can never open the gate: only an error
 * actually thrown as `EnvironmentBlockedError` qualifies.
 */
export function isEnvironmentBlockedMessage(errorMessage: string): boolean {
  const firstLine = errorMessage.split('\n', 1)[0]?.trim() ?? '';
  return (
    firstLine.startsWith(ENVIRONMENT_BLOCKED_NAME) ||
    firstLine.startsWith(ENVIRONMENT_BLOCKED_PREFIX)
  );
}

/**
 * Reduces a cucumber JSON report to its failed scenarios. Unknown shapes yield
 * no scenarios rather than throwing — the caller treats "nothing recognised" as
 * "cannot explain the failure" and keeps the build red.
 */
export function collectFailedScenarios(report: unknown): FailedScenario[] {
  if (!Array.isArray(report)) {
    return [];
  }
  const failures: FailedScenario[] = [];
  for (const feature of report) {
    if (!isRecord(feature) || !Array.isArray(feature.elements)) {
      continue;
    }
    const featureName = asString(feature.name) || asString(feature.uri) || '(unnamed feature)';
    for (const element of feature.elements) {
      if (!isRecord(element) || !Array.isArray(element.steps)) {
        continue;
      }
      const scenarioName = asString(element.name) || '(unnamed scenario)';
      for (const step of element.steps) {
        if (!isRecord(step) || !isRecord(step.result)) {
          continue;
        }
        if (asString(step.result.status) !== 'failed') {
          continue;
        }
        const error = asString(step.result.error_message);
        failures.push({
          feature: featureName,
          scenario: scenarioName,
          error: error.split('\n', 1)[0]?.trim() ?? '',
          environmentBlocked: isEnvironmentBlockedMessage(error),
        });
        // One failure per scenario: cucumber marks later steps skipped.
        break;
      }
    }
  }
  return failures;
}

/**
 * Decides the suite's exit code from Cypress's own code plus the report.
 *
 * The gate opens only when there is at least one failed scenario and *every*
 * failed scenario is environment-blocked. A single product failure alongside a
 * quiet market keeps the original code, so a real regression is never masked —
 * the same precedence ADR-008 fixed inside the classifier, applied at the gate.
 */
export function decideExitCode(report: unknown, cypressExitCode: number): GateDecision {
  if (cypressExitCode === 0) {
    return { exitCode: 0, blocked: [], failures: [], reason: 'Cypress reported success.' };
  }

  const scenarios = collectFailedScenarios(report);
  if (scenarios.length === 0) {
    return {
      exitCode: cypressExitCode,
      blocked: [],
      failures: [],
      reason:
        `Cypress exited ${cypressExitCode} with no failed scenario in the report — ` +
        'the run failed outside the scenarios (crash, config or missing report). Staying red.',
    };
  }

  const blocked = scenarios.filter((scenario) => scenario.environmentBlocked);
  const failures = scenarios.filter((scenario) => !scenario.environmentBlocked);

  if (failures.length > 0) {
    return {
      exitCode: cypressExitCode,
      blocked,
      failures,
      reason:
        `${failures.length} product failure(s) alongside ${blocked.length} environment-blocked ` +
        'outcome(s). Staying red.',
    };
  }

  return {
    exitCode: 0,
    blocked,
    failures: [],
    reason:
      `All ${blocked.length} failed scenario(s) are environment-blocked (quiet market or ` +
      'platform status), not product failures. Passing the build.',
  };
}

/** Renders a decision as the runner's console summary. */
export function formatDecision(decision: GateDecision): string {
  const lines = ['', '='.repeat(80), 'environment-blocked gate (ADR-010)', '='.repeat(80)];
  for (const scenario of decision.blocked) {
    lines.push(`  [environment] ${scenario.feature} › ${scenario.scenario}`);
    lines.push(`                ${scenario.error}`);
  }
  for (const scenario of decision.failures) {
    lines.push(`  [FAILURE]     ${scenario.feature} › ${scenario.scenario}`);
    lines.push(`                ${scenario.error}`);
  }
  lines.push(decision.reason, '='.repeat(80), '');
  return lines.join('\n');
}
