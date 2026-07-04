import { Ability, type AbilityType } from './Ability';
import type { Activity } from './Activity';
import { ConfigurationError } from './errors';
import type { Question } from './Question';

/**
 * An Actor represents a person or external system interacting with the system
 * under test. Actors are given Abilities, perform Activities (Tasks and
 * Interactions), and answer Questions.
 *
 * API surface mirrors hand-baked-screenplay-pattern (whoCan / abilityTo /
 * attemptsTo), adapted to return Cypress chainables. The notepad
 * (remembers / recalled) carries state between steps within a scenario,
 * e.g. the ping correlation ID.
 */
export class Actor {
  private readonly abilities = new Map<AbilityType<Ability>, Ability>();
  private readonly notepad = new Map<string, unknown>();

  static named(name: string): Actor {
    return new Actor(name);
  }

  private constructor(public readonly name: string) {}

  whoCan(...abilities: Ability[]): this {
    for (const ability of abilities) {
      this.abilities.set(ability.constructor as AbilityType<Ability>, ability);
    }
    return this;
  }

  abilityTo<T extends Ability>(doSomething: AbilityType<T>): T {
    const ability = this.abilities.get(doSomething);
    if (!ability) {
      throw new ConfigurationError(
        `${this.name} does not have the ability to ${doSomething.name}. Did you grant it with whoCan(...)?`,
      );
    }
    return ability as T;
  }

  attemptsTo(...activities: Activity[]): Cypress.Chainable {
    let chain: Cypress.Chainable = cy.wrap(null, { log: false });
    for (const activity of activities) {
      chain = chain.then(() => {
        Cypress.log({ name: 'screenplay', message: `${this.name} attempts to ${activity}` });
        return activity.performAs(this);
      });
    }
    return chain;
  }

  asks<T>(question: Question<T>): Cypress.Chainable<T> {
    return question.answeredBy(this);
  }

  remembers(key: string, value: unknown): void {
    this.notepad.set(key, value);
  }

  recalled<T>(key: string): T {
    if (!this.notepad.has(key)) {
      throw new ConfigurationError(`${this.name} has nothing remembered under '${key}'`);
    }
    return this.notepad.get(key) as T;
  }

  toString(): string {
    return this.name;
  }
}
