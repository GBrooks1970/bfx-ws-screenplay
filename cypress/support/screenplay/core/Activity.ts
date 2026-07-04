import type { Actor } from './Actor';

/**
 * An Activity is anything an Actor can attempt — Tasks and Interactions.
 *
 * The signature difference from hand-baked-screenplay-pattern is deliberate
 * and load-bearing: performAs returns Cypress.Chainable, not Promise, because
 * Cypress schedules commands on a queue rather than awaiting them.
 */
export interface Activity {
  // Bare Chainable (Cypress's default-subject idiom): Chainable<T> is
  // invariant in T, so Chainable<unknown> would reject every concrete subject.
  performAs(actor: Actor): Cypress.Chainable;
  toString(): string;
}
