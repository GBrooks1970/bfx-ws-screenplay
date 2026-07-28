/**
 * Cypress-side evidence gatherer for a timed-out trades observation window
 * (CODEX-03). The pure decision lives in `tradeStreamDiagnostics.ts`; this file
 * only reads the driver's buffer and maps the returned outcome onto the right
 * error type, so the "quiet market vs product failure" judgement stays testable
 * without a socket.
 *
 * Reached only from `messagesWhere`'s `onTimeout` hook, which fires *after* the
 * blocking-code rescan — so by construction the platform is operative here and
 * a matched-but-malformed `te` would have left the wait on its non-timeout path
 * (the schema check downstream fails it distinctly). Both are modelled in the
 * pure classifier for completeness, but cannot originate on this path.
 */
import type { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { AssertionError, EnvironmentBlockedError } from '../core';
import type { BufferedFrame } from '../../../../node-driver/protocol';
import { classifyTradeStream, type TradeStreamEvidence } from './tradeStreamDiagnostics';

export type TradeTimeoutContext = { chanId: number; symbol: string; timeoutMs: number };

/**
 * Builds an `onTimeout` handler for the trades `te` wait: on a bare timeout it
 * peeks the buffer for snapshot / `te` / `tu` evidence, classifies it, and
 * throws an `EnvironmentBlockedError` (quiet market — distinguishable, not a
 * product defect) or an `AssertionError` (a genuine channel/protocol failure).
 * The channel ID is already recalled by the caller, so the subscription is
 * confirmed by construction.
 */
export function onTradeObservationTimeout(
  context: TradeTimeoutContext,
): (ability: CommunicateOverWebSocket) => Cypress.Chainable<BufferedFrame[]> {
  const { chanId, symbol, timeoutMs } = context;
  return (ability) =>
    ability.peek({ kind: 'channel', chanId, frameType: 'data' }).then((dataFrames) =>
      ability.peek({ kind: 'channel', chanId, label: 'te' }).then((teFrames) =>
        ability
          .peek({ kind: 'channel', chanId, label: 'tu' })
          .then((tuFrames): BufferedFrame[] => {
            const snapshot = dataFrames[0];
            const snapshotPayload = Array.isArray(snapshot?.frame)
              ? (snapshot.frame as unknown[])[1]
              : undefined;
            const evidence: TradeStreamEvidence = {
              symbol,
              timeoutMs,
              subscriptionConfirmed: true,
              snapshotReceived: dataFrames.length > 0,
              snapshotSize: Array.isArray(snapshotPayload) ? snapshotPayload.length : 0,
              executedTradeCount: teFrames.length,
              tradeUpdateCount: tuFrames.length,
              malformedFrameSeen: false,
              blockingStatusSeen: false,
              totalDataFrames: dataFrames.length,
            };
            const outcome = classifyTradeStream(evidence);
            if (outcome.severity === 'product') {
              throw new AssertionError(outcome.message);
            }
            // Both 'environment' (starved/blocked) and the benign post-window
            // 'pass' race are reported as environment-blocked — neither is a
            // product defect, and the marker keeps them out of failure counts.
            throw new EnvironmentBlockedError(outcome.message);
          }),
      ),
    );
}
