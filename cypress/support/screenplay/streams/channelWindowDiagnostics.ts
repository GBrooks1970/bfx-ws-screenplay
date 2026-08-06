/**
 * Pure classification of any bounded "at least N frames" channel window that
 * elapsed without reaching its count. Generalises the trades-specific decision
 * in `../trades/tradeStreamDiagnostics.ts` to the ticker (SPEC-002) and
 * order-book checksum (SPEC-004) waits, per
 * `docs/adr/ADR-010-quiet-window-classification-and-gating.md`.
 *
 * ADR-008 left ticker and candles out of scope ("the same pattern could extend
 * to them if a future quiet-window failure warrants it"). It has: nightly
 * #30953031343 failed on a ticker update window and #30686140556 on a
 * book-checksum window, both with a bare `AssertionError` indistinguishable
 * from a real regression.
 *
 * Deliberately pure — no Cypress, no sockets — so the decision is unit-testable
 * in isolation (`test/unit/channel-window-classification.test.ts`). The Cypress
 * side gathers evidence and maps the outcome onto an error type; it never
 * re-derives the decision.
 */

/**
 * Everything observed in (and about) a bounded channel window, gathered once
 * the wait has elapsed without reaching `requiredCount`. Every field is a plain
 * fact from the driver's buffer so a real regression stays actionable.
 */
export type ChannelWindowEvidence = {
  /** The channel name, e.g. `ticker` — names the stream in diagnostics. */
  channel: string;
  /** The subscribed symbol, e.g. `tBTCUSD` — names the market in diagnostics. */
  symbol: string;
  /** What the wait was for, e.g. `1 ticker update(s) after the snapshot`. */
  awaited: string;
  /** The bounded observation window that elapsed, in milliseconds. */
  timeoutMs: number;
  /** A `subscribed` ack with a channel ID was received. */
  subscriptionConfirmed: boolean;
  /** The channel delivered its first data frame (the snapshot). */
  snapshotReceived: boolean;
  /** Matching frames actually observed during the window. */
  observedCount: number;
  /** Matching frames the wait needed before it would resolve. */
  requiredCount: number;
  /**
   * How many matching frames must have arrived before a shortfall counts as
   * merely quiet rather than a product failure. `0` means "zero is plausible":
   * a genuinely quiet minute delivers no ticker updates at all. `1` means the
   * stream must show *some* progress — zero frames then indicates the feature
   * was never switched on (e.g. checksum frames the platform never emitted),
   * which is a product failure, not market quiet.
   */
  quietFloor: number;
  /** A platform blocking status (20051/20060 / status 0) was buffered. */
  blockingStatusSeen: boolean;
  /** All channel data frames observed in the window (snapshot + any updates). */
  totalDataFrames: number;
};

/**
 * The classified outcome. `severity` is what a report filters on:
 * - `pass` — the window reached its count; not a timeout at all.
 * - `environment` — quiet market: no product defect, distinguishable outcome.
 * - `product` — a genuine failure that must never pass silently.
 */
export type ChannelWindowOutcome = {
  kind: 'delivered' | 'quiet' | 'silent' | 'unconfirmed' | 'no-snapshot' | 'blocked';
  severity: 'pass' | 'environment' | 'product';
  /** Human-readable, evidence-bearing summary for the thrown error / report. */
  message: string;
};

/** Renders the gathered evidence as a compact, deterministic diagnostic tail. */
function evidenceTail(evidence: ChannelWindowEvidence): string {
  return (
    `channel=${evidence.channel} symbol=${evidence.symbol} timeout=${evidence.timeoutMs}ms ` +
    `subscribed=${evidence.subscriptionConfirmed} snapshot=${evidence.snapshotReceived} ` +
    `observed=${evidence.observedCount}/${evidence.requiredCount} ` +
    `dataFrames=${evidence.totalDataFrames}`
  );
}

/**
 * Decides how a channel window that fell short of its frame count should be
 * reported. The order is significant — the most specific product failure wins
 * over the benign environment outcome, so a real regression can never be masked
 * by a quiet market (the precedence ADR-008 fixed for trades):
 *
 *   blocked → unconfirmed → no-snapshot → delivered → silent → quiet
 *
 * `delivered` short-circuits only when the count was in fact reached (the caller
 * arrived here on a non-timeout path, e.g. re-classifying for reporting).
 */
export function classifyChannelWindow(evidence: ChannelWindowEvidence): ChannelWindowOutcome {
  const tail = evidenceTail(evidence);

  if (evidence.blockingStatusSeen) {
    return {
      kind: 'blocked',
      severity: 'environment',
      message: `the platform reported a blocking status while waiting for ${evidence.awaited} (${tail})`,
    };
  }

  if (!evidence.subscriptionConfirmed) {
    return {
      kind: 'unconfirmed',
      severity: 'product',
      message: `the ${evidence.channel} subscription was never acknowledged with a channel ID (${tail})`,
    };
  }

  if (!evidence.snapshotReceived) {
    return {
      kind: 'no-snapshot',
      severity: 'product',
      message: `the ${evidence.channel} channel never delivered its snapshot (${tail})`,
    };
  }

  if (evidence.observedCount >= evidence.requiredCount) {
    return {
      kind: 'delivered',
      severity: 'pass',
      message: `${evidence.awaited} arrived on the ${evidence.channel} channel (${tail})`,
    };
  }

  if (evidence.observedCount < evidence.quietFloor) {
    return {
      kind: 'silent',
      severity: 'product',
      message:
        `the ${evidence.channel} channel delivered its snapshot but not a single ` +
        `${evidence.awaited} frame, so the stream was never switched on — a product ` +
        `failure, not a quiet market (${tail})`,
    };
  }

  return {
    kind: 'quiet',
    severity: 'environment',
    message:
      `only ${evidence.observedCount} of ${evidence.requiredCount} ${evidence.awaited} arrived ` +
      'within the observation window; connection, subscription and a schema-valid snapshot are ' +
      `all present, so this is a quiet market, not a product failure (${tail})`,
  };
}
