/**
 * Schema (type guard) for subscription error events.
 *
 * LIVE-vs-DOCS DELTA (probed 5 July 2026): the docs' code table implies
 * specific codes (10001 "unknown pair", 10302 "unknown channel"), but the
 * live platform rejects BOTH bad subscriptions with generic code 10300 and
 * a distinguishing msg:
 *   {"channel":"trades","symbol":"tFAKEPAIRXYZ","event":"error",
 *    "msg":"symbol: invalid","code":10300,"pair":"FAKEPAIRXYZ"}
 *   {"channel":"bogus-channel","event":"error",
 *    "msg":"channel: unknown","code":10300}
 * The error also echoes the attempted channel/symbol — richer than
 * documented. Assertions check code AND msg substring (review Q1, approved).
 */

export type SubscriptionErrorEvent = {
  event: 'error';
  msg: string;
  code: number;
  channel?: string;
  symbol?: string;
};

export function isSubscriptionErrorEvent(frame: unknown): frame is SubscriptionErrorEvent {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'error' &&
    typeof candidate.msg === 'string' &&
    typeof candidate.code === 'number'
  );
}
