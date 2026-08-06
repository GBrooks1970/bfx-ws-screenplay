import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { SYMBOLS, TIMEOUTS } from '../../config';
import { bookChecksum, foldBook } from '../../books';
import { isBookChecksumFrame } from '../../../schemas';
import { AssertionError, Question } from '../core';
import { onChannelObservationTimeout } from '../streams';
import { extractBookFrames } from './bookFolding';

export type ChecksumVerification = {
  expected: number; // the platform's cs value
  actual: number; // CRC-32 of the book folded up to that cs frame's index
  csIndex: number;
};

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
            .then((dataFrames): ChecksumVerification[] => {
              const log = extractBookFrames(dataFrames);
              return csFrames.slice(0, count).map((buffered) => {
                // Predicate selection already matched [chanId,'cs',...]; the guard
                // validates the exact frame shape before we trust frame[2].
                if (!isBookChecksumFrame(buffered.frame, chanId)) {
                  throw new AssertionError(
                    'A checksum frame does not match the [chanId, "cs", integer] schema',
                  );
                }
                const expected = buffered.frame[2];
                const book = foldBook(
                  log.snapshotLevels,
                  log.updates
                    .filter((update) => update.index < buffered.index)
                    .map((update) => update.level),
                );
                return { expected, actual: bookChecksum(book), csIndex: buffered.index };
              });
            }),
        );
    });
  }
}
