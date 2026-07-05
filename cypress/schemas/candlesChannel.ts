/**
 * Schemas (type guards) for the public candles channel (trade candles only).
 * Verified against https://docs.bitfinex.com/reference/ws-public-candles AND
 * a live probe (both 5 July 2026; 240 snapshot candles + updates, all valid).
 *
 * FIELD-ORDER TRAP: a candle is [MTS, OPEN, CLOSE, HIGH, LOW, VOLUME] —
 * CLOSE sits at index 2, BEFORE high and low. Not conventional OHLC order;
 * do not "fix" it.
 *
 * The ack carries only { chanId, key } — no symbol/pair fields (they are
 * encoded in the key, e.g. "trade:1m:tBTCUSD"), so candles cannot reuse the
 * shared trading-pair ack schema.
 */

export type CandleFields = readonly [
  number, // MTS — millisecond timestamp, aligned to the timeframe
  number, // OPEN
  number, // CLOSE (yes, before high/low)
  number, // HIGH
  number, // LOW
  number, // VOLUME
];

export const CANDLE_MTS_INDEX = 0;
export const CANDLE_OPEN_INDEX = 1;
export const CANDLE_CLOSE_INDEX = 2;
export const CANDLE_HIGH_INDEX = 3;
export const CANDLE_LOW_INDEX = 4;
export const CANDLE_VOLUME_INDEX = 5;

/** Structural schema: 6 finite numbers, integer MTS aligned to the timeframe. */
export function isCandleFields(payload: unknown, timeframeMs: number): payload is CandleFields {
  return (
    Array.isArray(payload) &&
    payload.length === 6 &&
    payload.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    Number.isInteger(payload[CANDLE_MTS_INDEX]) &&
    (payload[CANDLE_MTS_INDEX] as number) % timeframeMs === 0
  );
}

export type SubscribedCandlesAck = {
  event: 'subscribed';
  channel: 'candles';
  chanId: number;
  key: string;
};

export function isSubscribedCandlesAck(frame: unknown): frame is SubscribedCandlesAck {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'subscribed' &&
    candidate.channel === 'candles' &&
    typeof candidate.chanId === 'number' &&
    typeof candidate.key === 'string'
  );
}
