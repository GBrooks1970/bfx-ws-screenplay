import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isSubscribedBookAck } from '../../../schemas';
import { AssertionError, Question } from '../core';

export type BookSubscriptionSettings = { prec: string; freq: string; len: string };

/** the settings the book ack echoes back (prec/freq/len) — spec Section 6.4. */
export class TheBookConfirmation {
  static settings(): Question<BookSubscriptionSettings> {
    return Question.about('the settings echoed by the book confirmation', (actor) => {
      const symbol = actor.recalled<string>('book:symbol');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'book' },
              { path: 'symbol', op: 'eq', value: symbol },
            ],
          },
          { description: `the book subscription ack for ${symbol}` },
        )
        .then((frames): BookSubscriptionSettings => {
          const first = frames[0];
          if (!first || !isSubscribedBookAck(first.frame)) {
            throw new AssertionError('The subscription ack does not match the book ack schema');
          }
          return { prec: first.frame.prec, freq: first.frame.freq, len: first.frame.len };
        });
    });
  }
}
