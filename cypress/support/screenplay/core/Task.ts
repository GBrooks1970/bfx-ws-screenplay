import type { Activity } from './Activity';
import type { Actor } from './Actor';

/**
 * A Task is a business-level activity that captures intent in domain terms
 * (spec layer 3), composing Interactions and ability calls beneath it.
 */
export abstract class Task implements Activity {
  protected constructor(private readonly description: string) {}

  abstract performAs(actor: Actor): Cypress.Chainable;

  toString(): string {
    return this.description;
  }
}
