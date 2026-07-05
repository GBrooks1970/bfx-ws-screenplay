import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { SYMBOLS } from '../../config';
import { isSubscribedAck } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/**
 * send subscribe + await the `subscribed` ack, recording `chanId`
 * (spec Section 6.3). The remembered chanId keys the snapshot/update
 * questions that follow.
 */
export class SubscribeToTicker extends Task {
  static forThePrimarySymbol(): SubscribeToTicker {
    return new SubscribeToTicker(SYMBOLS.primary);
  }

  static forSymbol(symbol: string): SubscribeToTicker {
    return new SubscribeToTicker(symbol);
  }

  private constructor(private readonly symbol: string) {
    super(`subscribe to the ticker for ${symbol}`);
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    actor.remembers('ticker:symbol', this.symbol);
    return ws
      .send({ event: 'subscribe', channel: 'ticker', symbol: this.symbol })
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'ticker' },
              { path: 'symbol', op: 'eq', value: this.symbol },
            ],
          },
          { description: `the ticker subscription ack for ${this.symbol}` },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first || !isSubscribedAck(first.frame, 'ticker')) {
          throw new AssertionError('The subscription ack does not match the ticker ack schema');
        }
        actor.remembers('ticker:chanId', first.frame.chanId);
      });
  }
}
