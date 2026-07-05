import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isSubscribedCandlesAck, type SubscribedCandlesAck } from '../../../schemas';
import { AssertionError, Question } from '../core';

/**
 * Candles ack, confirmed by KEY — the candles ack has no symbol/pair fields,
 * so it cannot share TheSubscriptionConfirmation's channel+symbol matching.
 */
export class TheCandlesConfirmation {
  static ack(): Question<SubscribedCandlesAck> {
    return Question.about('the candles subscription confirmation', (actor) => {
      const key = actor.recalled<string>('candles:key');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'candles' },
              { path: 'key', op: 'eq', value: key },
            ],
          },
          { description: `the candles subscription ack for ${key}` },
        )
        .then((frames): SubscribedCandlesAck => {
          const first = frames[0];
          if (!first || !isSubscribedCandlesAck(first.frame)) {
            throw new AssertionError('The subscription ack does not match the candles ack schema');
          }
          return first.frame;
        });
    });
  }

  static channelId(): Question<number> {
    return Question.about('the confirmed candles channel ID', (actor) =>
      actor.asks(TheCandlesConfirmation.ack()).then((ack) => ack.chanId),
    );
  }

  static key(): Question<string> {
    return Question.about('the key echoed by the candles confirmation', (actor) =>
      actor.asks(TheCandlesConfirmation.ack()).then((ack) => ack.key),
    );
  }
}
