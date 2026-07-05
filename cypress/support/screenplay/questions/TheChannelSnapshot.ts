import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isTickerFields, type TickerFields } from '../../../schemas';
import { AssertionError, Question } from '../core';

/** first data frame after the ack (spec Section 6.4). */
export class TheChannelSnapshot {
  static ofTheTicker(): Question<TickerFields> {
    return Question.about('the ticker snapshot', (actor) => {
      const chanId = actor.recalled<number>('ticker:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          { description: 'the ticker snapshot' },
        )
        .then((frames): TickerFields => {
          const first = frames[0];
          const payload = Array.isArray(first?.frame) ? (first.frame as unknown[])[1] : undefined;
          if (!isTickerFields(payload)) {
            throw new AssertionError('The ticker snapshot does not match the ticker schema');
          }
          return payload;
        });
    });
  }
}
