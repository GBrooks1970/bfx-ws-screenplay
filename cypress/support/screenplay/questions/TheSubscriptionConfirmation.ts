import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isSubscribedAck, type SubscribedAck } from '../../../schemas';
import { AssertionError, Question } from '../core';

/** Channels whose subscriptions this question can confirm (grows per SPEC unit). */
export type SubscribableChannel = 'ticker' | 'trades' | 'book';

/** ack payload incl. `chanId` (spec Section 6.4) — answered from the buffer, idempotently. */
export class TheSubscriptionConfirmation {
  static forChannel(channel: SubscribableChannel): Question<SubscribedAck<SubscribableChannel>> {
    return Question.about(`the ${channel} subscription confirmation`, (actor) => {
      const symbol = actor.recalled<string>(`${channel}:symbol`);
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: channel },
              { path: 'symbol', op: 'eq', value: symbol },
            ],
          },
          { description: `the ${channel} subscription ack for ${symbol}` },
        )
        .then((frames): SubscribedAck<SubscribableChannel> => {
          const first = frames[0];
          if (!first || !isSubscribedAck(first.frame, channel)) {
            throw new AssertionError(
              `The subscription ack does not match the ${channel} ack schema`,
            );
          }
          return first.frame;
        });
    });
  }

  static channelId(channel: SubscribableChannel): Question<number> {
    return Question.about(`the confirmed ${channel} channel ID`, (actor) =>
      actor.asks(TheSubscriptionConfirmation.forChannel(channel)).then((ack) => ack.chanId),
    );
  }

  static symbol(channel: SubscribableChannel): Question<string> {
    return Question.about(`the symbol echoed by the ${channel} confirmation`, (actor) =>
      actor.asks(TheSubscriptionConfirmation.forChannel(channel)).then((ack) => ack.symbol),
    );
  }
}
