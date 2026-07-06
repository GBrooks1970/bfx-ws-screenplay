import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { NEGATIVE, SYMBOLS } from '../../config';
import { isSubscriptionErrorEvent } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

type FieldMatch = { path: string; op: 'eq'; value: string | number };

/**
 * Catalogue addition, 5 July 2026 (SPEC-006 review): mirrors
 * AttemptConnection — sends a subscription expected to fail, records the
 * resulting error event for later questioning, and does NOT fail the
 * scenario itself.
 */
export class AttemptSubscription extends Task {
  static toTradesForAnUnknownSymbol(): AttemptSubscription {
    // The error echoes the attempted channel AND symbol (probed 5 July 2026).
    return new AttemptSubscription(
      { event: 'subscribe', channel: 'trades', symbol: NEGATIVE.unknownSymbol },
      [
        { path: 'channel', op: 'eq', value: 'trades' },
        { path: 'symbol', op: 'eq', value: NEGATIVE.unknownSymbol },
      ],
      `attempt to subscribe to trades for the unknown symbol ${NEGATIVE.unknownSymbol}`,
    );
  }

  static toAnUnknownChannel(): AttemptSubscription {
    return new AttemptSubscription(
      { event: 'subscribe', channel: NEGATIVE.unknownChannel, symbol: SYMBOLS.primary },
      [{ path: 'channel', op: 'eq', value: NEGATIVE.unknownChannel }],
      `attempt to subscribe to the unknown channel ${NEGATIVE.unknownChannel}`,
    );
  }

  private constructor(
    private readonly request: Record<string, string | number>,
    private readonly errorMatch: FieldMatch[],
    description: string,
  ) {
    super(description);
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    return ws
      .send(this.request)
      .then(() =>
        ws.messagesWhere(
          { kind: 'event', event: 'error', where: this.errorMatch },
          { description: 'the rejection error event' },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first || !isSubscriptionErrorEvent(first.frame)) {
          throw new AssertionError('The rejection does not match the error event schema');
        }
        actor.remembers('subscription:error', first.frame);
      });
  }
}
