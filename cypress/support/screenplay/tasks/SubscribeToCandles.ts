import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { CANDLES } from '../../config';
import { isSubscribedCandlesAck } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/**
 * send subscribe + await the `subscribed` ack, recording `chanId`
 * (spec Section 6.3). Candles subscribe by KEY (`trade:1m:tBTCUSD`), not by
 * symbol — the key comes from config.
 */
export class SubscribeToCandles extends Task {
  static oneMinuteForThePrimarySymbol(): SubscribeToCandles {
    return new SubscribeToCandles(CANDLES.key);
  }

  private constructor(private readonly key: string) {
    super(`subscribe to candles for the key ${key}`);
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    actor.remembers('candles:key', this.key);
    return ws
      .send({ event: 'subscribe', channel: 'candles', key: this.key })
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'subscribed',
            where: [
              { path: 'channel', op: 'eq', value: 'candles' },
              { path: 'key', op: 'eq', value: this.key },
            ],
          },
          { description: `the candles subscription ack for ${this.key}` },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first || !isSubscribedCandlesAck(first.frame)) {
          throw new AssertionError('The subscription ack does not match the candles ack schema');
        }
        actor.remembers('candles:chanId', first.frame.chanId);
      });
  }
}
