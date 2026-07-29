/**
 * Unit tests for pure order-book maintenance (`cypress/support/books/orderBook.ts`,
 * SPEC-004): the add/update/remove rules (amount sign picks the side; count=0
 * removes, with amount=1 removing from bids and amount=-1 from asks), snapshot
 * folding, and the `sortedSides` projection (bids descending, asks ascending).
 * These are the branches the checksum ordering depends on (CODEX-06).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLevel, emptyBook, foldBook, sortedSides } from '../../cypress/support/books';
import type { BookLevel } from '../../cypress/schemas';

const bid = (price: number, count: number, amount: number): BookLevel => [price, count, amount];

describe('applyLevel', () => {
  test('adds bids (amount > 0) and asks (amount < 0) to the correct side', () => {
    const book = emptyBook();
    applyLevel(book, bid(100, 1, 2));
    applyLevel(book, bid(101, 1, -2));
    assert.equal(book.bids.size, 1);
    assert.equal(book.asks.size, 1);
    assert.equal(book.bids.get(100)?.amount, 2);
    assert.equal(book.asks.get(101)?.amount, -2);
  });

  test('updates an existing level in place (same price, new count/amount)', () => {
    const book = emptyBook();
    applyLevel(book, bid(100, 1, 2));
    applyLevel(book, bid(100, 3, 5));
    assert.equal(book.bids.size, 1);
    assert.equal(book.bids.get(100)?.count, 3);
    assert.equal(book.bids.get(100)?.amount, 5);
  });

  test('count=0 removes: amount=1 clears a bid, amount=-1 clears an ask', () => {
    const book = emptyBook();
    applyLevel(book, bid(100, 1, 2));
    applyLevel(book, bid(101, 1, -2));
    applyLevel(book, bid(100, 0, 1)); // remove bid
    applyLevel(book, bid(101, 0, -1)); // remove ask
    assert.equal(book.bids.size, 0);
    assert.equal(book.asks.size, 0);
  });
});

describe('foldBook', () => {
  test('applies a snapshot then updates in order', () => {
    const snapshot: BookLevel[] = [bid(100, 1, 2), bid(101, 1, -2)];
    const updates: BookLevel[] = [bid(99, 1, 1.5), bid(100, 0, 1)]; // add a deeper bid, remove the top bid
    const book = foldBook(snapshot, updates);
    assert.deepEqual([...book.bids.keys()], [99]);
    assert.equal(book.asks.size, 1);
  });
});

describe('sortedSides', () => {
  test('orders bids price-descending and asks price-ascending', () => {
    const book = foldBook(
      [bid(98, 2, 3), bid(100, 1, 2), bid(99, 1, 1.5), bid(103, 2, -3), bid(101, 1, -2), bid(102, 1, -1.5)],
      [],
    );
    const { bids, asks } = sortedSides(book);
    assert.deepEqual(bids.map((level) => level.price), [100, 99, 98]);
    assert.deepEqual(asks.map((level) => level.price), [101, 102, 103]);
  });

  test('an empty book projects to empty, serialisable arrays', () => {
    assert.deepEqual(sortedSides(emptyBook()), { bids: [], asks: [] });
  });
});
