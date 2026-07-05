import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { TIMEOUTS } from '../../config';
import { bookChecksum, foldBook } from '../../books';
import { AssertionError, Question } from '../core';
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
                const expected = Array.isArray(buffered.frame)
                  ? (buffered.frame as unknown[])[2]
                  : undefined;
                if (typeof expected !== 'number' || !Number.isInteger(expected)) {
                  throw new AssertionError('A checksum frame does not carry an integer checksum');
                }
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
