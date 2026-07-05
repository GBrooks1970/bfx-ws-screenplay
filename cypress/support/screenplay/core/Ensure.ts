import type { Activity } from './Activity';
import type { Actor } from './Actor';
import { AssertionError } from './errors';
import type { Question } from './Question';

/** A named check over an answer. Kept data-light so failures read well. */
export class Expectation<T> {
  constructor(
    private readonly description: string,
    private readonly predicate: (actual: T) => boolean,
  ) {}

  verify(actual: T, subject: string): void {
    if (!this.predicate(actual)) {
      throw new AssertionError(
        `Expected ${subject} to ${this.description}, but got ${JSON.stringify(actual)}`,
      );
    }
  }

  toString(): string {
    return this.description;
  }
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export const equals = <T>(expected: T): Expectation<T> =>
  new Expectation(`equal ${JSON.stringify(expected)}`, (actual) => same(actual, expected));

export const isDefined = <T>(): Expectation<T | undefined | null> =>
  new Expectation('be present', (actual) => actual !== undefined && actual !== null);

export const isTrue = (): Expectation<boolean> => new Expectation('be true', (actual) => actual === true);

export const isFalse = (): Expectation<boolean> =>
  new Expectation('be false', (actual) => actual === false);

export const isIn = <T>(candidates: readonly T[]): Expectation<T> =>
  new Expectation(`be one of ${JSON.stringify(candidates)}`, (actual) =>
    candidates.some((candidate) => same(actual, candidate)),
  );

export const isAtMost = (limit: number): Expectation<number> =>
  new Expectation(`be at most ${limit}`, (actual) => actual <= limit);

/** Named predicate expectation — the home of semantic invariants (ADR-004 category c). */
export const satisfies = <T>(
  description: string,
  predicate: (actual: T) => boolean,
): Expectation<T> => new Expectation(description, predicate);

/**
 * Ensure delegates the assertion itself to an Expectation over a Question's
 * answer, keeping step definitions logic-free (ADR-003).
 */
export class Ensure<T> implements Activity {
  static that<T>(question: Question<T>, expectation: Expectation<T>): Ensure<T> {
    return new Ensure(question, expectation);
  }

  private constructor(
    private readonly question: Question<T>,
    private readonly expectation: Expectation<T>,
  ) {}

  performAs(actor: Actor): Cypress.Chainable {
    return actor.asks(this.question).then((actual) => {
      this.expectation.verify(actual, String(this.question));
    });
  }

  toString(): string {
    return `ensure that ${this.question} does ${this.expectation}`;
  }
}
