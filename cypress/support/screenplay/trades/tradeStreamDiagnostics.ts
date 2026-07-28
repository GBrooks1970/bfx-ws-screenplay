/**
 * Pure classification of a trades-channel observation window (CODEX-03,
 * Codex review v1, Risk HIGH). Implements the outcome contract defined in
 * `docs/adr/ADR-008-trade-starvation-classification.md`.
 *
 * A bounded wait for a `te` (executed-trade) frame can time out for two very
 * different reasons, and reporting them the same way hides real regressions:
 *
 * - the live market simply did not execute a trade for the symbol inside the
 *   window (a quiet-market **environment** condition — not a product defect),
 *   versus
 * - the channel never acknowledged, never delivered its snapshot, or the
 *   platform is under maintenance (genuine failures that must stay loud).
 *
 * This module is deliberately pure — no Cypress, no sockets — so the decision
 * is unit-testable in isolation (`scripts/check-trade-starvation-classification.ts`).
 * The Cypress side gathers the evidence and maps the returned outcome onto the
 * right error type; it never re-derives the decision itself.
 */

/**
 * Everything observed in (and about) a trades observation window, gathered
 * once the bounded `te` wait has elapsed without a match. Every field is a
 * plain fact from the driver's buffer so a real regression stays actionable.
 */
export type TradeStreamEvidence = {
  /** The subscribed symbol, e.g. `tBTCUSD` — names the market in diagnostics. */
  symbol: string;
  /** The bounded observation window that elapsed, in milliseconds. */
  timeoutMs: number;
  /** A `subscribed` ack with a channel ID was received. */
  subscriptionConfirmed: boolean;
  /** The channel delivered its first data frame (the snapshot). */
  snapshotReceived: boolean;
  /** Number of trades in that snapshot (0 when no snapshot arrived). */
  snapshotSize: number;
  /** `te` frames seen on the channel during the window. */
  executedTradeCount: number;
  /** `tu` frames seen on the channel during the window. */
  tradeUpdateCount: number;
  /**
   * A `te`/`tu` frame arrived but failed its schema (or a `tu` did not pair to
   * its `te`). Distinct from starvation: a malformed frame is a product defect.
   */
  malformedFrameSeen: boolean;
  /** A platform blocking status (20051/20060 / status 0) was buffered. */
  blockingStatusSeen: boolean;
  /** All channel data frames observed in the window (snapshot + any updates). */
  totalDataFrames: number;
};

/**
 * The classified outcome. `severity` is what a report filters on:
 * - `pass` — a trade streamed; not a timeout at all.
 * - `environment` — quiet market: no product defect, distinguishable outcome.
 * - `product` — a genuine failure that must never pass silently.
 */
export type TradeStreamOutcome = {
  kind: 'streamed' | 'starved' | 'malformed' | 'unconfirmed' | 'no-snapshot' | 'blocked';
  severity: 'pass' | 'environment' | 'product';
  /** Human-readable, evidence-bearing summary for the thrown error / report. */
  message: string;
};

/** Renders the gathered evidence as a compact, deterministic diagnostic tail. */
function evidenceTail(evidence: TradeStreamEvidence): string {
  return (
    `symbol=${evidence.symbol} timeout=${evidence.timeoutMs}ms ` +
    `subscribed=${evidence.subscriptionConfirmed} ` +
    `snapshot=${evidence.snapshotReceived}(${evidence.snapshotSize}) ` +
    `te=${evidence.executedTradeCount} tu=${evidence.tradeUpdateCount} ` +
    `dataFrames=${evidence.totalDataFrames}`
  );
}

/**
 * Decides how a trades observation window that produced no matching `te` should
 * be reported. The order is significant — the most specific product failure
 * wins over the benign environment outcome, so a real regression can never be
 * masked by a quiet market:
 *
 *   blocked → malformed → unconfirmed → no-snapshot → streamed → starved
 *
 * `streamed` short-circuits only when a `te` actually arrived (the caller
 * reached this on a non-timeout path, e.g. re-classifying for reporting).
 */
export function classifyTradeStream(evidence: TradeStreamEvidence): TradeStreamOutcome {
  const tail = evidenceTail(evidence);

  if (evidence.blockingStatusSeen) {
    return {
      kind: 'blocked',
      severity: 'environment',
      message: `the platform reported a blocking status during the trades window (${tail})`,
    };
  }

  if (evidence.malformedFrameSeen) {
    return {
      kind: 'malformed',
      severity: 'product',
      message: `a malformed or mis-paired trade frame was received on the trades channel (${tail})`,
    };
  }

  if (!evidence.subscriptionConfirmed) {
    return {
      kind: 'unconfirmed',
      severity: 'product',
      message: `the trades subscription was never acknowledged with a channel ID (${tail})`,
    };
  }

  if (!evidence.snapshotReceived) {
    return {
      kind: 'no-snapshot',
      severity: 'product',
      message: `the trades channel never delivered its snapshot (${tail})`,
    };
  }

  if (evidence.executedTradeCount > 0) {
    return {
      kind: 'streamed',
      severity: 'pass',
      message: `${evidence.executedTradeCount} executed trade(s) streamed on the trades channel (${tail})`,
    };
  }

  return {
    kind: 'starved',
    severity: 'environment',
    message:
      'no new trade executed within the observation window; connection, subscription and a ' +
      `schema-valid snapshot are all present, so this is a quiet market, not a product failure (${tail})`,
  };
}
