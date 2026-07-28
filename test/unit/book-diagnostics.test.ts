/**
 * Unit tests for the book-invariant diagnostic fix (review Risk #7 / backlog
 * Risk #8): a failed `Expectation.verify` must render the actual price levels,
 * not the useless `{"bids":{},"asks":{}}` that a raw `Map`-based `MaintainedBook`
 * stringifies to. Book Questions answer the serialisable `sortedSides()`
 * projection instead.
 *
 * Migrated from the former `scripts/check-book-diagnostics.ts` proof script into
 * the discoverable `node:test` suite (CODEX-05). Pure over the book/invariants
 * modules — no browser context.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLevel, emptyBook, sortedSides } from '../../cypress/support/books/orderBook';
import { bookSidesArePureAndOrdered } from '../../cypress/support/books/invariants';
import type { BookLevel } from '../../cypress/schemas';

describe('book diagnostics', () => {
  test('defect baseline: a raw Map-based MaintainedBook stringifies to the useless {"bids":{},"asks":{}}', () => {
    const book = emptyBook();
    applyLevel(book, [64000.5, 1, 0.75] satisfies BookLevel);
    // The historical defect this fix is measured against: the raw book hides its levels.
    assert.equal(JSON.stringify(book), '{"bids":{},"asks":{}}');
  });

  test('fix: a failed sides invariant on the sortedSides() projection prints the actual levels, not {}', () => {
    const book = emptyBook();
    // A single bid with no matching ask fails bookSidesArePureAndOrdered's
    // "at least one level per side" check — a realistic invariant failure.
    applyLevel(book, [64000.5, 1, 0.75] satisfies BookLevel);
    const sides = sortedSides(book);
    assert.throws(
      () => bookSidesArePureAndOrdered.verify(sides, 'the book'),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /64000\.5/);
        assert.match(message, /"bids":\[/);
        assert.match(message, /"asks":\[\]/);
        assert.doesNotMatch(message, /\{"bids":\{\},"asks":\{\}\}/);
        return true;
      },
    );
  });
});
