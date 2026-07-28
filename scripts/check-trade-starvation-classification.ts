/**
 * Deterministic unit check for `classifyTradeStream` (CODEX-03, Codex review
 * v1, HIGH): proves the trades-window outcome contract defined in
 * `docs/adr/ADR-008-trade-starvation-classification.md`.
 *
 * The classifier decides how a trades observation window that yielded no
 * matching `te` frame should be reported — the whole point of the change is
 * that a quiet market (`starved`) is a distinguishable environment outcome,
 * never a silent pass and never confused with a genuine channel/protocol
 * failure (`malformed` / `unconfirmed` / `no-snapshot`). This check pins each
 * branch and, critically, the precedence between them so a real regression can
 * never be masked by market quiet.
 *
 * Deliberately outside Cypress: `classifyTradeStream` is pure, so this proves
 * the decision without a browser context or a live connection. Run with:
 *
 *   npx tsx scripts/check-trade-starvation-classification.ts
 *
 * Exits 0 with a summary line per check on success, exits 1 otherwise.
 */
import {
  classifyTradeStream,
  type TradeStreamEvidence,
} from '../cypress/support/screenplay/trades';

type CheckResult = { name: string; pass: boolean; detail?: string };

/** A healthy, quiet window: connected, subscribed, snapshot present, no te. */
function baseEvidence(): TradeStreamEvidence {
  return {
    symbol: 'tBTCUSD',
    timeoutMs: 30_000,
    subscriptionConfirmed: true,
    snapshotReceived: true,
    snapshotSize: 42,
    executedTradeCount: 0,
    tradeUpdateCount: 0,
    malformedFrameSeen: false,
    blockingStatusSeen: false,
    totalDataFrames: 3,
  };
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}: ${JSON.stringify(haystack)} does not contain ${JSON.stringify(needle)}`);
  }
}

const checks: Array<[string, () => void]> = [
  [
    'starved: connected + subscribed + snapshot but no te → environment-blocked, not a product failure',
    () => {
      const outcome = classifyTradeStream(baseEvidence());
      assertEqual(outcome.kind, 'starved', 'quiet-window kind');
      assertEqual(outcome.severity, 'environment', 'quiet-window severity');
      assertIncludes(outcome.message, 'quiet market', 'quiet-window message');
    },
  ],
  [
    'starved diagnostics carry symbol, timeout and observed frame counts (actionable evidence)',
    () => {
      const outcome = classifyTradeStream({ ...baseEvidence(), totalDataFrames: 5, tradeUpdateCount: 1 });
      assertIncludes(outcome.message, 'symbol=tBTCUSD', 'symbol in diagnostics');
      assertIncludes(outcome.message, 'timeout=30000ms', 'timeout in diagnostics');
      assertIncludes(outcome.message, 'te=0', 'te count in diagnostics');
      assertIncludes(outcome.message, 'tu=1', 'tu count in diagnostics');
      assertIncludes(outcome.message, 'dataFrames=5', 'data-frame count in diagnostics');
    },
  ],
  [
    'streamed: a te actually arrived → pass, never reported as blocked',
    () => {
      const outcome = classifyTradeStream({ ...baseEvidence(), executedTradeCount: 2 });
      assertEqual(outcome.kind, 'streamed', 'streamed kind');
      assertEqual(outcome.severity, 'pass', 'streamed severity');
    },
  ],
  [
    'malformed: a bad/mis-paired frame is a PRODUCT failure and outranks a quiet market',
    () => {
      // Malformed set alongside zero te (starvation shape): product must win.
      const outcome = classifyTradeStream({ ...baseEvidence(), malformedFrameSeen: true });
      assertEqual(outcome.kind, 'malformed', 'malformed kind');
      assertEqual(outcome.severity, 'product', 'malformed severity');
    },
  ],
  [
    'unconfirmed: subscription never acknowledged → product failure',
    () => {
      const outcome = classifyTradeStream({ ...baseEvidence(), subscriptionConfirmed: false });
      assertEqual(outcome.kind, 'unconfirmed', 'unconfirmed kind');
      assertEqual(outcome.severity, 'product', 'unconfirmed severity');
    },
  ],
  [
    'no-snapshot: channel never delivered its snapshot → product failure',
    () => {
      const outcome = classifyTradeStream({
        ...baseEvidence(),
        snapshotReceived: false,
        snapshotSize: 0,
        totalDataFrames: 0,
      });
      assertEqual(outcome.kind, 'no-snapshot', 'no-snapshot kind');
      assertEqual(outcome.severity, 'product', 'no-snapshot severity');
    },
  ],
  [
    'blocked: a platform maintenance status outranks everything → environment-blocked',
    () => {
      // Blocking set together with a malformed frame: blocked (environment) wins,
      // because a maintenance window explains the disruption at the platform level.
      const outcome = classifyTradeStream({
        ...baseEvidence(),
        blockingStatusSeen: true,
        malformedFrameSeen: true,
      });
      assertEqual(outcome.kind, 'blocked', 'blocked kind');
      assertEqual(outcome.severity, 'environment', 'blocked severity');
    },
  ],
  [
    'precedence: malformed outranks unconfirmed and no-snapshot (most specific defect wins)',
    () => {
      const outcome = classifyTradeStream({
        ...baseEvidence(),
        malformedFrameSeen: true,
        subscriptionConfirmed: false,
        snapshotReceived: false,
      });
      assertEqual(outcome.kind, 'malformed', 'precedence malformed>unconfirmed>no-snapshot');
    },
  ],
];

const results: CheckResult[] = checks.map(([name, fn]) => {
  try {
    fn();
    return { name, pass: true };
  } catch (error) {
    return { name, pass: false, detail: error instanceof Error ? error.message : String(error) };
  }
});

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}`);
  if (!result.pass) {
    console.log(`       ${result.detail}`);
  }
}

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  process.exit(1);
}
