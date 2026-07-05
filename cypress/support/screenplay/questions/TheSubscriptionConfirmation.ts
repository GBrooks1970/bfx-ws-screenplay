import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isSubscribedTickerAck, type SubscribedTickerAck } from '../../../schemas';
import { AssertionError, Question } from '../core';

/** ack payload incl. `chanId` (spec Section 6.4) — answered from the buffer, idempotently. */
export class TheSubscriptionConfirmation {
  static forTheTicker(): Question<SubscribedTickerAck> {
    return Question.about('the ticker subscription confirmation', (actor) => {
      const symbol = actor.recalled<string>('ticker:symbol');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'ticker' },
              { path: 'symbol', op: 'eq', value: symbol },
            ],
          },
          { description: `the ticker subscription ack for ${symbol}` },
        )
        .then((frames): SubscribedTickerAck => {
          const first = frames[0];
          if (!first || !isSubscribedTickerAck(first.frame)) {
            throw new AssertionError('The subscription ack does not match the ticker ack schema');
          }
          return first.frame;
        });
    });
  }

  static channelId(): Question<number> {
    return Question.about('the confirmed ticker channel ID', (actor) =>
      actor.asks(TheSubscriptionConfirmation.forTheTicker()).then((ack) => ack.chanId),
    );
  }

  static symbol(): Question<string> {
    return Question.about('the symbol echoed by the ticker confirmation', (actor) =>
      actor.asks(TheSubscriptionConfirmation.forTheTicker()).then((ack) => ack.symbol),
    );
  }
}
