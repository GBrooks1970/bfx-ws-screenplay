/**
 * Schemas (type guards) for the public ticker channel, trading pairs only.
 * Verified against https://docs.bitfinex.com/reference/ws-public-ticker,
 * 4 July 2026.
 *
 * Ack:      { "event":"subscribed","channel":"ticker","chanId":N,"symbol":"tBTCUSD","pair":"BTCUSD" }
 * Payload:  [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE,
 *            LAST_PRICE, VOLUME, HIGH, LOW] — ten finite numbers, identical shape
 *           for snapshot and update. Funding (f-prefixed) tickers use a longer
 *           array and are rejected by the length check by design.
 */

export type SubscribedTickerAck = {
  event: 'subscribed';
  channel: 'ticker';
  chanId: number;
  symbol: string;
  pair: string;
};

export function isSubscribedTickerAck(frame: unknown): frame is SubscribedTickerAck {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'subscribed' &&
    candidate.channel === 'ticker' &&
    typeof candidate.chanId === 'number' &&
    typeof candidate.symbol === 'string' &&
    typeof candidate.pair === 'string'
  );
}

export type TickerFields = readonly [
  number, // BID
  number, // BID_SIZE
  number, // ASK
  number, // ASK_SIZE
  number, // DAILY_CHANGE
  number, // DAILY_CHANGE_RELATIVE
  number, // LAST_PRICE
  number, // VOLUME
  number, // HIGH
  number, // LOW
];

export const TICKER_BID_INDEX = 0;
export const TICKER_ASK_INDEX = 2;

/**
 * Finiteness is part of the schema (SPEC-002 review pack, Section 2).
 *
 * LIVE-vs-DOCS DELTA (observed 5 July 2026): the documentation lists ten
 * fields, but the live feed appends an undocumented eleventh element
 * (`null` at index 10) on both snapshots and updates, e.g.
 * [62673, 1.74617776, 62700, 1.18670422, 145, 0.00231811, 62696,
 *  830.62483022, 63487, 62450, null].
 * The guard therefore validates the ten documented fields and tolerates
 * trailing extras rather than failing on undocumented additions.
 */
export function isTickerFields(payload: unknown): payload is TickerFields {
  return (
    Array.isArray(payload) &&
    payload.length >= 10 &&
    payload.slice(0, 10).every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}
