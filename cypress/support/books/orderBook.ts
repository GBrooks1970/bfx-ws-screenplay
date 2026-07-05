/**
 * Pure order-book maintenance and checksum derivation (SPEC-004).
 *
 * Book-maintenance rules (docs + live probe, 5 July 2026):
 * - count > 0: add/update the level; AMOUNT sign picks the side (bids > 0)
 * - count = 0: remove the level; amount = 1 from bids, amount = -1 from asks
 *
 * Checksum recipe (proven live, 8/8): top 25 bids (price desc) and top 25
 * asks (price asc), interleaved per index bid,ask,bid,ask..., each level as
 * `String(price):String(amount)`, joined with ':', CRC-32, signed 32-bit.
 */
import {
  LEVEL_AMOUNT_INDEX,
  LEVEL_COUNT_INDEX,
  LEVEL_PRICE_INDEX,
  type BookLevel,
} from '../../schemas';
import { crc32Signed } from './crc32';

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

/** Bids price-descending, asks price-ascending — the checksum ordering. */
export function sortedSides(book: MaintainedBook): {
  bids: BookSideEntry[];
  asks: BookSideEntry[];
} {
  return {
    bids: [...book.bids.values()].sort((a, b) => b.price - a.price),
    asks: [...book.asks.values()].sort((a, b) => a.price - b.price),
  };
}

export function checksumString(book: MaintainedBook): string {
  const { bids, asks } = sortedSides(book);
  const parts: string[] = [];
  for (let i = 0; i < 25; i += 1) {
    const bid = bids[i];
    const ask = asks[i];
    if (bid) {
      parts.push(String(bid.price), String(bid.amount));
    }
    if (ask) {
      parts.push(String(ask.price), String(ask.amount));
    }
  }
  return parts.join(':');
}

export function bookChecksum(book: MaintainedBook): number {
  return crc32Signed(checksumString(book));
}
