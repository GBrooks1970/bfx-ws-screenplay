import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { SYMBOLS, TIMEOUTS } from '../../config';
import { isBookChecksumFrame } from '../../../schemas';
import { AssertionError, Question } from '../core';
import { onChannelObservationTimeout } from '../streams';
import { extractBookFrames } from './bookFolding';
import { verifyChecksumAtIndex, type ChecksumVerification } from './checksumDiagnostics';
import { attachChecksumReplay, captureChecksumReplayV2 } from './checksumReplay';

export type { ChecksumVerification } from './checksumDiagnostics';

/**
 * The flagship question (spec Section 6.4): for each of the first `count`
 * 'cs' frames, fold the book from the snapshot plus exactly the updates
 * that arrived BEFORE that frame (buffer-index determinism) and compute the
 * local CRC-32 alongside the platform's value.
 */
export class ChecksumVerifications {
  static firstConsecutive(count: number): Question<ChecksumVerification[]> {
    return Question.about(`${count} consecutive checksum verifications`, (actor) => {
      const chanId = actor.recalled<number>('book:chanId');
      const ws = CommunicateOverWebSocket.as(actor);
      // The inner `.then` returns either the results or, on a mismatch, a chain that
      // yields them. Cypress unwraps a returned chain, so the subject is always
      // ChecksumVerification[]; its typings cannot express that union, hence the cast.
      return ws
        .messagesWhere(
          { kind: 'channel', chanId, label: 'cs' },
          {
            minCount: count,
            timeoutMs: TIMEOUTS.updateWaitMs,
            description: `${count} checksum frame(s)`,
            // ADR-010: cs frames follow book activity, so a quiet book delivers
            // fewer than `count` within the window — an environment outcome.
            // quietFloor 1 is load-bearing: *zero* cs frames while the book
            // streams means the conf flag was never honoured, and that stays a
            // loud product failure rather than being excused as market quiet.
            onTimeout: onChannelObservationTimeout({
              chanId,
              channel: 'book',
              symbol: SYMBOLS.primary,
              awaited: `${count} checksum frame(s)`,
              timeoutMs: TIMEOUTS.updateWaitMs,
              requiredCount: count,
              quietFloor: 1,
              countedFrames: { kind: 'channel', chanId, label: 'cs' },
            }),
          },
        )
        .then((csFrames) =>
          ws
            .messagesWhere(
              { kind: 'channel', chanId, frameType: 'data' },
              { description: 'the buffered book frames' },
            )
            .then((dataFrames): ChecksumVerification[] | Cypress.Chainable<ChecksumVerification[]> => {
              const log = extractBookFrames(dataFrames);
              const selected = csFrames.slice(0, count);
              const results = selected.map((buffered) => {
                // Predicate selection already matched [chanId,'cs',...]; the guard
                // validates the exact frame shape before we trust frame[2].
                if (!isBookChecksumFrame(buffered.frame, chanId)) {
                  throw new AssertionError(
                    'A checksum frame does not match the [chanId, "cs", integer] schema',
                  );
                }
                return verifyChecksumAtIndex(
                  log.snapshotLevels,
                  log.snapshotIndex,
                  log.updates,
                  buffered.index,
                  buffered.frame[2],
                );
              });
              if (results.every((result) => result.actual === result.expected)) {
                // The passing path stays exactly as before: no extra buffer read.
                return results;
              }
              // A mismatch: read the whole buffer once, so the version 2 envelope can
              // name every non-data index as well as carry the book's data frames
              // (LIVE-01, plan 2026-11-24).
              return ws
                .peek({ kind: 'any' })
                .then((buffered): ChecksumVerification[] =>
                  attachChecksumReplay(results, (byteBudget) =>
                    captureChecksumReplayV2(
                      ws.diagnosticSessionId(),
                      chanId,
                      selected[selected.length - 1]!.index,
                      buffered,
                      byteBudget,
                    ),
                  ),
                );
            }),
        ) as unknown as Cypress.Chainable<ChecksumVerification[]>;
    });
  }
}
