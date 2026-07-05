/**
 * Generic schema (type guard) for `subscribed` acks on trading-pair channels.
 * Verified against docs.bitfinex.com for ticker (4 July 2026) and trades
 * (5 July 2026) — both share this shape:
 * { "event":"subscribed","channel":C,"chanId":N,"symbol":"tBTCUSD","pair":"BTCUSD" }
 */
export type SubscribedAck<C extends string = string> = {
  event: 'subscribed';
  channel: C;
  chanId: number;
  symbol: string;
  pair: string;
};

export function isSubscribedAck<C extends string>(
  frame: unknown,
  channel: C,
): frame is SubscribedAck<C> {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'subscribed' &&
    candidate.channel === channel &&
    typeof candidate.chanId === 'number' &&
    typeof candidate.symbol === 'string' &&
    typeof candidate.pair === 'string'
  );
}
