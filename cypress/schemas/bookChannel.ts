/**
 * Schemas (type guards) for the aggregated order-book channel (P precisions,
 * trading pairs). Verified against https://docs.bitfinex.com/reference/ws-public-books
 * and a live probe (both 5 July 2026; probe reproduced 8/8 platform checksums).
 *
 * Ack:      base subscribed ack (subscribedAck.ts) + echoed prec/freq/len.
 * Level:    [PRICE, COUNT, AMOUNT] — AMOUNT sign gives the side (bids > 0).
 * Snapshot: [chanId, [level × ~2·len]]; update: [chanId, level].
 * Checksum: [chanId, 'cs', signed 32-bit CRC] once checksums are enabled.
 */
import { isSubscribedAck, type SubscribedAck } from './subscribedAck';

export type BookLevel = readonly [
  number, // PRICE
  number, // COUNT — orders at this level; 0 means "remove the level"
  number, // AMOUNT — signed total; positive bids, negative asks
];

export const LEVEL_PRICE_INDEX = 0;
export const LEVEL_COUNT_INDEX = 1;
export const LEVEL_AMOUNT_INDEX = 2;

export function isBookLevel(payload: unknown): payload is BookLevel {
  return (
    Array.isArray(payload) &&
    payload.length === 3 &&
    payload.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    Number.isInteger(payload[LEVEL_COUNT_INDEX])
  );
}

export type SubscribedBookAck = SubscribedAck<'book'> & {
  prec: string;
  freq: string;
  len: string;
};

export function isSubscribedBookAck(frame: unknown): frame is SubscribedBookAck {
  if (!isSubscribedAck(frame, 'book')) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    typeof candidate.prec === 'string' &&
    typeof candidate.freq === 'string' &&
    typeof candidate.len === 'string'
  );
}
