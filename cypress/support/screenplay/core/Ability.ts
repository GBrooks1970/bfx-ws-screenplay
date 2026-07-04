/**
 * An Ability wraps a capability an Actor can use (spec layer 4). Concrete
 * abilities translate domain vocabulary into bridge vocabulary.
 *
 * Derived from hand-baked-screenplay-pattern (see ADR-002 note): same role,
 * adapted to Cypress's queued-chainable execution model.
 */
export abstract class Ability {}

export type AbilityType<A extends Ability> = new (...args: never[]) => A;
