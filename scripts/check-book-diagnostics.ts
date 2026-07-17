/**
 * Standalone unit check for the book-invariant diagnostic fix (review Risk
 * #7 / backlog Risk #8, LOW): a failed `Expectation.verify` renders its
 * subject via `JSON.stringify` (`Ensure.ts`) — over the raw `Map`-based
 * `MaintainedBook` that stringifies to `{"bids":{},"asks":{}}`, hiding the
 * actual price levels a debugger needs. Book Questions now answer the
 * serialisable `sortedSides()` projection (plain arrays) instead.
 *
 * Deliberately outside Cypress: proves the diagnostic-message fix over the
 * pure book/invariants modules without a browser context. Run with:
 *
 *   npx tsx scripts/check-book-diagnostics.ts
 *
 * Exits 0 with a summary line per check on success, exits 1 and prints the
 * failing check(s) otherwise.
 */
import { applyLevel, emptyBook, sortedSides } from '../cypress/support/books/orderBook';
import { bookSidesArePureAndOrdered } from '../cypress/support/books/invariants';
import type { BookLevel } from '../cypress/schemas';

type CheckResult = { name: string; pass: boolean; detail?: string };

function assertThrowsWithMessage(fn: () => void, mustInclude: string[], mustNotInclude: string[], label: string): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const fragment of mustInclude) {
      if (!message.includes(fragment)) {
        throw new Error(`${label}: expected message to include ${JSON.stringify(fragment)}, got: ${message}`, {
          cause: error,
        });
      }
    }
    for (const fragment of mustNotInclude) {
      if (message.includes(fragment)) {
        throw new Error(`${label}: expected message NOT to include ${JSON.stringify(fragment)}, got: ${message}`, {
          cause: error,
        });
      }
    }
    return;
  }
  throw new Error(`${label}: expected a throw, but the call returned normally`);
}

const checks: Array<[string, () => void]> = [
  [
    'defect baseline: a raw MaintainedBook (Map-based) stringifies to the useless {"bids":{},"asks":{}}',
    () => {
      const book = emptyBook();
      applyLevel(book, [64000.5, 1, 0.75] satisfies BookLevel);
      const stringified = JSON.stringify(book);
      if (stringified !== '{"bids":{},"asks":{}}') {
        throw new Error(`expected the historical Map-stringify defect, got: ${stringified}`);
      }
    },
  ],
  [
    'fix: a failed sides invariant on the sortedSides() projection prints the actual levels, not {}',
    () => {
      const book = emptyBook();
      // A single bid with no matching ask fails bookSidesArePureAndOrdered's
      // "at least one level per side" check — a realistic invariant failure.
      applyLevel(book, [64000.5, 1, 0.75] satisfies BookLevel);
      const sides = sortedSides(book);
      assertThrowsWithMessage(
        () => bookSidesArePureAndOrdered.verify(sides, 'the book'),
        ['64000.5', '"bids":[', '"asks":[]'],
        ['{"bids":{},"asks":{}}'],
        'bookSidesArePureAndOrdered.verify(empty-ask-side book)',
      );
    },
  ],
];

const results: CheckResult[] = checks.map(([name, fn]) => {
  try {
    fn();
    return { name, pass: true };
  } catch (error) {
    return { name, pass: false, detail: error instanceof Error ? error.message : String(error) };
  }
});

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}`);
  if (!result.pass) {
    console.log(`       ${result.detail}`);
  }
}

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  process.exit(1);
}
