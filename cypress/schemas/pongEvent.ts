/**
 * Schema (type guard) for the pong event. Verified against
 * https://docs.bitfinex.com/docs/ws-general, 4 July 2026:
 * { "event": "pong", "ts": 1511545528111, "cid": 1234 }
 */
export type PongEvent = {
  event: 'pong';
  cid: number;
  ts: number;
};

export function isPongEvent(frame: unknown): frame is PongEvent {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'pong' &&
    typeof candidate.cid === 'number' &&
    typeof candidate.ts === 'number'
  );
}
