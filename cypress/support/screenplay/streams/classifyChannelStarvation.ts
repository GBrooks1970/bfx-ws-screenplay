/**
 * Cypress-side evidence gatherer for a timed-out channel window (ADR-010), the
 * ticker/book counterpart of `../trades/classifyTradeStarvation.ts`. The pure
 * decision lives in `channelWindowDiagnostics.ts`; this file only reads the
 * driver's buffer and maps the returned outcome onto the right error type, so
 * the "quiet market vs product failure" judgement stays testable without a
 * socket.
 *
 * Reached only from `messagesWhere`'s `onTimeout` hook, which fires *after* the
 * blocking-code rescan — so by construction the platform is operative here.
 * `blocked` is modelled in the pure classifier for completeness but cannot
 * originate on this path.
 */
import type { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { AssertionError, EnvironmentBlockedError } from '../core';
import type { BufferedFrame, PredicateSpec } from '../../../../node-driver/protocol';
import { classifyChannelWindow, type ChannelWindowEvidence } from './channelWindowDiagnostics';

export type ChannelTimeoutContext = {
  chanId: number;
  /** The channel name for diagnostics, e.g. `ticker`. */
  channel: string;
  symbol: string;
  /** What the wait was for, e.g. `1 ticker update(s) after the snapshot`. */
  awaited: string;
  timeoutMs: number;
  /** Frames the wait needed; compared against what the buffer actually holds. */
  requiredCount: number;
  /** See `ChannelWindowEvidence.quietFloor` — 0 unless zero frames is a defect. */
  quietFloor: number;
  /**
   * Selects the frames the wait was counting. Omit when the wait counted plain
   * channel data frames (the ticker case), in which case the snapshot itself is
   * excluded from `observedCount` — it is not an update.
   */
  countedFrames?: PredicateSpec;
};

/**
 * Builds an `onTimeout` handler for a bounded channel wait: on a bare timeout it
 * peeks the buffer for snapshot and matching-frame evidence, classifies it, and
 * throws an `EnvironmentBlockedError` (quiet market — distinguishable, not a
 * product defect) or an `AssertionError` (a genuine channel/protocol failure).
 * The channel ID is already recalled by the caller, so the subscription is
 * confirmed by construction.
 */
export function onChannelObservationTimeout(
  context: ChannelTimeoutContext,
): (ability: CommunicateOverWebSocket) => Cypress.Chainable<BufferedFrame[]> {
  const { chanId, channel, symbol, awaited, timeoutMs, requiredCount, quietFloor, countedFrames } =
    context;
  return (ability) =>
    ability.peek({ kind: 'channel', chanId, frameType: 'data' }).then((dataFrames) =>
      ability
        .peek(countedFrames ?? { kind: 'channel', chanId, frameType: 'data' })
        .then((matched): BufferedFrame[] => {
          // With no explicit selector the wait counted post-snapshot data frames,
          // so the snapshot (the channel's first data frame) is not an update.
          const observedCount = countedFrames ? matched.length : Math.max(0, matched.length - 1);
          const evidence: ChannelWindowEvidence = {
            channel,
            symbol,
            awaited,
            timeoutMs,
            subscriptionConfirmed: true,
            snapshotReceived: dataFrames.length > 0,
            observedCount,
            requiredCount,
            quietFloor,
            blockingStatusSeen: false,
            totalDataFrames: dataFrames.length,
          };
          const outcome = classifyChannelWindow(evidence);
          if (outcome.severity === 'product') {
            throw new AssertionError(outcome.message);
          }
          // Both 'quiet' and the benign post-window 'delivered' race are reported
          // as environment-blocked — neither is a product defect, and the marker
          // keeps them out of failure counts (see scripts/environmentBlockedGate.ts).
          throw new EnvironmentBlockedError(outcome.message);
        }),
    );
}
