import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { TIMEOUTS } from '../../config';
import { isTradeFields, TRADE_ID_INDEX } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/**
 * Catalogue addition, 5 July 2026 (SPEC-003 review): waits (bounded) for one
 * `te` frame and records its trade ID and buffer index, so the pairing
 * question can wait for *that trade's* `tu` as a single condition.
 */
export type ObservedExecution = { tradeId: number; bufferIndex: number };

export class ObserveAnExecutedTrade extends Task {
  static onTheTradesChannel(): ObserveAnExecutedTrade {
    return new ObserveAnExecutedTrade();
  }

  private constructor() {
    super('observe an executed trade');
  }

  performAs(actor: Actor): Cypress.Chainable {
    const chanId = actor.recalled<number>('trades:chanId');
    return CommunicateOverWebSocket.as(actor)
      .messagesWhere(
        { kind: 'channel', chanId, label: 'te' },
        { timeoutMs: TIMEOUTS.updateWaitMs, description: 'an executed trade (te frame)' },
      )
      .then((frames) => {
        const first = frames[0];
        const payload = Array.isArray(first?.frame) ? (first.frame as unknown[])[2] : undefined;
        if (!first || !isTradeFields(payload)) {
          throw new AssertionError('The executed trade does not match the trade schema');
        }
        const observed: ObservedExecution = {
          tradeId: payload[TRADE_ID_INDEX],
          bufferIndex: first.index,
        };
        actor.remembers('trades:observedExecution', observed);
      });
  }
}
