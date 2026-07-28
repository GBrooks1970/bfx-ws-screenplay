/**
 * Pure order-book maintenance and checksum derivation (SPEC-004).
 *
 * Book-maintenance rules (docs + live probe, 5 July 2026):
 * - count > 0: add/update the level; AMOUNT sign picks the side (bids > 0)
 * - count = 0: remove the level; amount = 1 from bids, amount = -1 from asks
 *
 * Checksum recipe (proven live, 8/8): top 25 bids (price desc) and top 25
 * asks (price asc), interleaved per index bid,ask,bid,ask..., each level as
 * `wireNumber(price):wireNumber(amount)`, joined with ':', CRC-32, signed
 * 32-bit. `wireNumber` guards against `String()`'s exponent-notation
 * fallback for very small/large magnitudes — see its own doc comment.
 */
import {
  LEVEL_AMOUNT_INDEX,
  LEVEL_COUNT_INDEX,
  LEVEL_PRICE_INDEX,
  type BookLevel,
} from '../../schemas';
import { crc32Signed } from './crc32';

/**
 * Thrown when a price/amount cannot be serialised into the checksum wire
 * string without falling back to exponent notation (see `wireNumber`).
 */
export class ChecksumSerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChecksumSerializationError';
  }
}

export type BookSideEntry = { price: number; count: number; amount: number };

export type MaintainedBook = {
  bids: Map<number, BookSideEntry>;
  asks: Map<number, BookSideEntry>;
};

export function emptyBook(): MaintainedBook {
  return { bids: new Map(), asks: new Map() };
}

export function applyLevel(book: MaintainedBook, level: BookLevel): void {
  const price = level[LEVEL_PRICE_INDEX];
  const count = level[LEVEL_COUNT_INDEX];
  const amount = level[LEVEL_AMOUNT_INDEX];
  if (count > 0) {
    const side = amount > 0 ? book.bids : book.asks;
    side.set(price, { price, count, amount });
  } else {
    (amount === 1 ? book.bids : book.asks).delete(price);
  }
}

export function foldBook(snapshot: readonly BookLevel[], updates: readonly BookLevel[]): MaintainedBook {
  const book = emptyBook();
  snapshot.forEach((level) => applyLevel(book, level));
  updates.forEach((level) => applyLevel(book, level));
  return book;
}

/**
 * A serialisable projection of a book's sides — plain arrays, not `Map`s
 * (review Risk #7 / backlog Risk #8: a `MaintainedBook` stringifies to
 * `{"bids":{},"asks":{}}`, hiding the state a failed diagnostic needs).
 * Bids price-descending, asks price-ascending — the checksum ordering.
 */
export type SortedBookSides = { bids: BookSideEntry[]; asks: BookSideEntry[] };

export function sortedSides(book: MaintainedBook): SortedBookSides {
  return {
    bids: [...book.bids.values()].sort((a, b) => b.price - a.price),
    asks: [...book.asks.values()].sort((a, b) => a.price - b.price),
  };
}

/**
 * Serialises a single price/amount for the checksum wire string exactly as the
 * platform expects: a plain decimal token, never exponent notation. Implements
 * the numeric-token contract in `docs/adr/ADR-007-checksum-numeric-token-contract.md`.
 *
 * `String(number)` silently switches to exponent notation outside roughly
 * `1e-6 <= |n| < 1e21` (e.g. `String(1e-7) === '1e-7'`), which would diverge
 * from Bitfinex's own plain-decimal serialisation and produce a false CRC
 * mismatch. Earlier this function *threw* on such values (a safe interim guard),
 * but valid live data (a `1e-8` order amount) reaches that path, so it now
 * converts deterministically to plain decimal instead. A non-finite value is
 * outside the schema's contract and still fails loudly.
 */
export function wireNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new ChecksumSerializationError(
      `checksum serialisation gap: ${value} is not a finite number; the book schema admits only ` +
        'finite prices and amounts, so this is malformed input, not a serialisable value',
    );
  }
  return toPlainDecimal(value);
}

/**
 * Expands a finite number to canonical plain-decimal text with no exponent, per
 * ADR-007: `1e-8` → `"0.00000001"`, `-1e-8` → `"-0.00000001"`, `1e21` →
 * `"1000000000000000000000"`; ordinary in-range decimals (`0.10783801`) already
 * stringify plainly and pass through unchanged. Both `0` and `-0` yield `"0"`.
 */
function toPlainDecimal(value: number): string {
  // `-0 === 0` is true, so this single guard collapses negative zero to "0" too.
  if (value === 0) {
    return '0';
  }

  const token = String(value);
  if (!token.includes('e') && !token.includes('E')) {
    return token; // already plain decimal
  }

  const negative = token.startsWith('-');
  const unsigned = negative ? token.slice(1) : token;
  // `unsigned` is known to contain an exponent marker (guarded above), so these
  // slices are always defined — avoids the possibly-undefined array destructure.
  const eIndex = unsigned.search(/[eE]/);
  const coefficient = unsigned.slice(0, eIndex);
  const exponent = Number(unsigned.slice(eIndex + 1));
  const pointIndex = coefficient.indexOf('.');
  const digits = coefficient.replace('.', '');
  // Where the decimal point sits, counted from the left of `digits`.
  const pointPosition = (pointIndex === -1 ? coefficient.length : pointIndex) + exponent;

  let magnitude: string;
  if (pointPosition <= 0) {
    magnitude = `0.${'0'.repeat(-pointPosition)}${digits}`;
  } else if (pointPosition >= digits.length) {
    magnitude = digits + '0'.repeat(pointPosition - digits.length);
  } else {
    magnitude = `${digits.slice(0, pointPosition)}.${digits.slice(pointPosition)}`;
  }

  return negative ? `-${magnitude}` : magnitude;
}

export function checksumString(book: MaintainedBook): string {
  const { bids, asks } = sortedSides(book);
  const parts: string[] = [];
  for (let i = 0; i < 25; i += 1) {
    const bid = bids[i];
    const ask = asks[i];
    if (bid) {
      parts.push(wireNumber(bid.price), wireNumber(bid.amount));
    }
    if (ask) {
      parts.push(wireNumber(ask.price), wireNumber(ask.amount));
    }
  }
  return parts.join(':');
}

export function bookChecksum(book: MaintainedBook): number {
  return crc32Signed(checksumString(book));
}
