import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { SYMBOLS } from '../../config';
import { isSubscribedAck } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/** send subscribe + await the `subscribed` ack, recording `chanId` (spec Section 6.3). */
export class SubscribeToTrades extends Task {
  static forThePrimarySymbol(): SubscribeToTrades {
    return new SubscribeToTrades(SYMBOLS.primary);
  }

  private constructor(private readonly symbol: string) {
    super(`subscribe to trades for ${symbol}`);
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    actor.remembers('trades:symbol', this.symbol);
    return ws
      .send({ event: 'subscribe', channel: 'trades', symbol: this.symbol })
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'trades' },
              { path: 'symbol', op: 'eq', value: this.symbol },
            ],
          },
          { description: `the trades subscription ack for ${this.symbol}` },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first || !isSubscribedAck(first.frame, 'trades')) {
          throw new AssertionError('The subscription ack does not match the trades ack schema');
        }
        actor.remembers('trades:chanId', first.frame.chanId);
      });
  }
}
