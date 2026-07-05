import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { TIMEOUTS } from '../../config';
import { isTickerFields, type TickerFields } from '../../../schemas';
import { AssertionError, Question } from '../core';

/**
 * first N post-snapshot frames (spec Section 6.4). The snapshot is the first
 * data frame on the channel, so the question waits for count + 1 data frames
 * and drops the first — no hidden state between questions.
 */
export class ReceivedUpdates {
  static fromTheTicker(atLeast: number): Question<TickerFields[]> {
    return Question.about(`at least ${atLeast} ticker update(s)`, (actor) => {
      const chanId = actor.recalled<number>('ticker:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          {
            minCount: atLeast + 1,
            timeoutMs: TIMEOUTS.updateWaitMs,
            description: `${atLeast} ticker update(s) after the snapshot`,
          },
        )
        .then((frames): TickerFields[] =>
          frames.slice(1).map((buffered) => {
            const payload = Array.isArray(buffered.frame)
              ? (buffered.frame as unknown[])[1]
              : undefined;
            if (!isTickerFields(payload)) {
              throw new AssertionError('A ticker update does not match the ticker schema');
            }
            return payload;
          }),
        );
    });
  }
}
