/**
 * Unit tests for the pure book and candle invariants (CODEX-06):
 * `strictlyAscending`/`strictlyDescending`, `sidesPureAndOrdered` (side purity,
 * ordering and the ADR-006 size band 1..30), and the OHLC invariant
 * (`ohlcInvariantsHold`, mind the CLOSE-at-index-2 field order). Each is proven
 * both ways so a real violation cannot pass silently.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { sidesPureAndOrdered, strictlyAscending, strictlyDescending } from '../../cypress/support/books';
import type { BookSideEntry, SortedBookSides } from '../../cypress/support/books';
import { ohlcInvariantsHold, type CandleFields } from '../../cypress/schemas';

const entry = (price: number, amount: number): BookSideEntry => ({ price, count: 1, amount });

describe('monotonic helpers', () => {
  test('strictlyDescending / strictlyAscending accept ordered and reject unordered / equal runs', () => {
    assert.equal(strictlyDescending([3, 2, 1]), true);
    assert.equal(strictlyDescending([3, 3, 1]), false);
    assert.equal(strictlyAscending([1, 2, 3]), true);
    assert.equal(strictlyAscending([1, 1, 3]), false);
    assert.equal(strictlyAscending([5]), true); // single element
    assert.equal(strictlyDescending([]), true); // vacuously true
  });
});

describe('sidesPureAndOrdered', () => {
  const good: SortedBookSides = {
    bids: [entry(100, 2), entry(99, 1.5)],
    asks: [entry(101, -2), entry(102, -1.5)],
  };

  test('accepts pure, correctly ordered sides of plausible size', () => {
    assert.equal(sidesPureAndOrdered(good), true);
  });

  test('rejects an empty side (size < 1)', () => {
    assert.equal(sidesPureAndOrdered({ bids: good.bids, asks: [] }), false);
  });

  test('rejects a side larger than the ADR-006 band (> 30)', () => {
    const tooDeep = Array.from({ length: 31 }, (_unused, i) => entry(1000 - i, 1));
    assert.equal(sidesPureAndOrdered({ bids: tooDeep, asks: good.asks }), false);
  });

  test('rejects a bid with a non-positive amount and an ask with a non-negative amount', () => {
    assert.equal(sidesPureAndOrdered({ bids: [entry(100, -2)], asks: good.asks }), false);
    assert.equal(sidesPureAndOrdered({ bids: good.bids, asks: [entry(101, 2)] }), false);
  });

  test('rejects mis-ordered sides (bids not descending, asks not ascending)', () => {
    assert.equal(sidesPureAndOrdered({ bids: [entry(99, 1), entry(100, 2)], asks: good.asks }), false);
    assert.equal(sidesPureAndOrdered({ bids: good.bids, asks: [entry(102, -1), entry(101, -2)] }), false);
  });
});

describe('ohlcInvariantsHold', () => {
  // Candle field order is [MTS, OPEN, CLOSE, HIGH, LOW, VOLUME] — CLOSE at index 2.
  const candle = (open: number, close: number, high: number, low: number, volume: number): CandleFields =>
    [1751731200000, open, close, high, low, volume];

  test('accepts low <= open,close <= high with non-negative volume', () => {
    assert.equal(ohlcInvariantsHold(candle(62600, 62696, 62710, 62580, 12.5)), true);
  });

  test('rejects open below low, close above high, and negative volume', () => {
    assert.equal(ohlcInvariantsHold(candle(62570, 62696, 62710, 62580, 12.5)), false); // open < low
    assert.equal(ohlcInvariantsHold(candle(62600, 62720, 62710, 62580, 12.5)), false); // close > high
    assert.equal(ohlcInvariantsHold(candle(62600, 62696, 62710, 62580, -1)), false); // negative volume
  });
});
