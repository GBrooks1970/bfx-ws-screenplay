import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { TIMEOUTS } from '../../config';
import { type Actor, Task } from '../core';

/**
 * Catalogue addition, 5 July 2026 (SPEC-004 implementation, mirrors
 * ObserveAnExecutedTrade): bounded wait until the book channel has delivered
 * the snapshot plus at least `atLeast` updates. The frames stay in the
 * buffer; the maintained-book questions fold them from there.
 */
export class ObserveBookUpdates extends Task {
  static atLeast(updates: number): ObserveBookUpdates {
    return new ObserveBookUpdates(updates);
  }

  private constructor(private readonly updates: number) {
    super(`let the book evolve through at least ${updates} updates`);
  }

  performAs(actor: Actor): Cypress.Chainable {
    const chanId = actor.recalled<number>('book:chanId');
    return CommunicateOverWebSocket.as(actor).messagesWhere(
      { kind: 'channel', chanId, frameType: 'data' },
      {
        minCount: this.updates + 1, // + the snapshot frame
        timeoutMs: TIMEOUTS.updateWaitMs,
        description: `the book snapshot plus ${this.updates} update(s)`,
      },
    );
  }
}
