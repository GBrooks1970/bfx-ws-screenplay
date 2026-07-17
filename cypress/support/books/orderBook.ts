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
 * Serialises a single price/amount for the checksum wire string exactly as
 * the platform expects: a plain decimal token, never exponent notation.
 *
 * `String(number)` silently switches to exponent notation outside roughly
 * `1e-6 <= |n| < 1e21` (e.g. `String(1e-7) === '1e-7'`). Feeding that token
 * into the checksum input would diverge from Bitfinex's own serialisation
 * and produce a false CRC mismatch — a rare, hard-to-reproduce flake in the
 * project's flagship assertion rather than a loud, diagnosable failure.
 * Guarding here turns that latent gap into a named, explained error instead.
 */
export function wireNumber(value: number): string {
  const token = String(value);
  if (token.includes('e') || token.includes('E')) {
    throw new ChecksumSerializationError(
      `checksum serialisation gap: ${value} stringifies to exponent notation ('${token}'), which ` +
        'would diverge from the Bitfinex checksum wire format; extend wireNumber() to handle this ' +
        'magnitude before trusting the checksum assertion for it',
    );
  }
  return token;
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
