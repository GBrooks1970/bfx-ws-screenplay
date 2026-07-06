import { Question } from '../core';
import type { SubscriptionErrorEvent } from '../../../schemas';

/**
 * Catalogue addition, 5 July 2026 (SPEC-006 review): the error event an
 * AttemptSubscription recorded — the SPEC-001 attempt/outcome pattern
 * (task records, question recalls).
 */
export class TheSubscriptionError {
  static recorded(): Question<SubscriptionErrorEvent> {
    return Question.about('the recorded subscription error', (actor) =>
      cy.wrap(actor.recalled<SubscriptionErrorEvent>('subscription:error'), { log: false }),
    );
  }

  static code(): Question<number> {
    return Question.about('the subscription error code', (actor) =>
      actor.asks(TheSubscriptionError.recorded()).then((error) => error.code),
    );
  }

  static message(): Question<string> {
    return Question.about('the subscription error message', (actor) =>
      actor.asks(TheSubscriptionError.recorded()).then((error) => error.msg),
    );
  }
}
