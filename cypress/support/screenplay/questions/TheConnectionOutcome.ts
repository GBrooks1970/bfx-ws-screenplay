import type { OpenResult } from '../../../../node-driver/protocol';
import { Question } from '../core';

/**
 * Catalogue addition, 4 July 2026 (SPEC-001 review): the recorded outcome of
 * the last AttemptConnection — read from the actor's notepad, no bridge call.
 */
export class TheConnectionOutcome {
  private static recalledOutcome(actor: {
    recalled<T>(key: string): T;
  }): OpenResult {
    return actor.recalled<OpenResult>('lastConnectionOutcome');
  }

  static successful(): Question<boolean> {
    return Question.about('whether the last connection attempt succeeded', (actor) =>
      cy.wrap(TheConnectionOutcome.recalledOutcome(actor).ok, { log: false }),
    );
  }

  static failureReason(): Question<string> {
    return Question.about('the failure reason of the last connection attempt', (actor) => {
      const outcome = TheConnectionOutcome.recalledOutcome(actor);
      return cy.wrap(outcome.ok ? 'none' : outcome.reason, { log: false });
    });
  }

  static elapsedMs(): Question<number> {
    return Question.about('how long the last connection attempt took', (actor) =>
      cy.wrap(TheConnectionOutcome.recalledOutcome(actor).elapsedMs, { log: false }),
    );
  }
}
