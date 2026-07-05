/**
 * Schemas (type guards) for the public trades channel, trading pairs only.
 * Verified against https://docs.bitfinex.com/reference/ws-public-trades AND
 * a live probe (both 5 July 2026): snapshot trades and te/tu payloads are
 * exactly four elements — [ID, MTS, AMOUNT, PRICE] — with tu following its
 * te within ~50 ms. AMOUNT is signed (positive buy, negative sell).
 * The exact-length check rejects five-element funding trades by design.
 */

export type TradeFields = readonly [
  number, // ID (integer)
  number, // MTS — millisecond timestamp (integer)
  number, // AMOUNT — signed; positive buy, negative sell
  number, // PRICE
];

export const TRADE_ID_INDEX = 0;
export const TRADE_AMOUNT_INDEX = 2;
export const TRADE_PRICE_INDEX = 3;

export function isTradeFields(payload: unknown): payload is TradeFields {
  return (
    Array.isArray(payload) &&
    payload.length === 4 &&
    payload.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    Number.isInteger(payload[TRADE_ID_INDEX]) &&
    Number.isInteger(payload[1])
  );
}
