import type { Activity } from './Activity';
import type { Actor } from './Actor';

/**
 * An Interaction is a low-level activity that uses an Ability directly.
 * Interaction.where allows concise inline definitions.
 */
export abstract class Interaction implements Activity {
  static where(
    description: string,
    interaction: (actor: Actor) => Cypress.Chainable,
  ): Interaction {
    return new AnonymousInteraction(description, interaction);
  }

  protected constructor(private readonly description: string) {}

  abstract performAs(actor: Actor): Cypress.Chainable;

  toString(): string {
    return this.description;
  }
}

class AnonymousInteraction extends Interaction {
  constructor(
    description: string,
    private readonly interaction: (actor: Actor) => Cypress.Chainable,
  ) {
    super(description);
  }

  performAs(actor: Actor): Cypress.Chainable {
    return this.interaction(actor);
  }
}
