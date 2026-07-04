import type { Actor } from './Actor';

/**
 * A Question retrieves information from the system under test via the actor's
 * abilities (spec layer 3). Questions never 'listen': they query the driver's
 * message buffer through the ability, which is what makes the asynchronous
 * stream synchronously assertable.
 */
export abstract class Question<T> {
  static about<T>(
    description: string,
    answer: (actor: Actor) => Cypress.Chainable<T>,
  ): Question<T> {
    return new AnonymousQuestion(description, answer);
  }

  protected constructor(private readonly description: string) {}

  abstract answeredBy(actor: Actor): Cypress.Chainable<T>;

  toString(): string {
    return this.description;
  }
}

class AnonymousQuestion<T> extends Question<T> {
  constructor(
    description: string,
    private readonly answer: (actor: Actor) => Cypress.Chainable<T>,
  ) {
    super(description);
  }

  answeredBy(actor: Actor): Cypress.Chainable<T> {
    return this.answer(actor);
  }
}
