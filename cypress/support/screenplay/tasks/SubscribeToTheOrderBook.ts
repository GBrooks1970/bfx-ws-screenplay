import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { BOOK_SETTINGS, SYMBOLS } from '../../config';
import { isSubscribedBookAck } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/**
 * send subscribe + await the `subscribed` ack, recording `chanId`
 * (spec Section 6.3). Settings are pinned to BOOK_SETTINGS (P0/F0/25) — the
 * combination the checksum algorithm was proven against live.
 */
export class SubscribeToTheOrderBook extends Task {
  static forThePrimarySymbol(): SubscribeToTheOrderBook {
    return new SubscribeToTheOrderBook(SYMBOLS.primary);
  }

  private constructor(private readonly symbol: string) {
    super(
      `subscribe to the ${BOOK_SETTINGS.prec}/${BOOK_SETTINGS.freq}/${BOOK_SETTINGS.len} order book for ${symbol}`,
    );
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    actor.remembers('book:symbol', this.symbol);
    return ws
      .send({
        event: 'subscribe',
        channel: 'book',
        symbol: this.symbol,
        prec: BOOK_SETTINGS.prec,
        freq: BOOK_SETTINGS.freq,
        len: BOOK_SETTINGS.len,
      })
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'book' },
              { path: 'symbol', op: 'eq', value: this.symbol },
            ],
          },
          { description: `the book subscription ack for ${this.symbol}` },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first || !isSubscribedBookAck(first.frame)) {
          throw new AssertionError('The subscription ack does not match the book ack schema');
        }
        actor.remembers('book:chanId', first.frame.chanId);
      });
  }
}
