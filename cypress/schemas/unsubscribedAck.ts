/**
 * Schema (type guard) for the `unsubscribed` acknowledgement. Verified
 * against https://docs.bitfinex.com/docs/ws-general, 20 July 2026:
 * { "event": "unsubscribed", "status": "OK", "chanId": CHANNEL_ID }
 */
export type UnsubscribedAck = {
  event: 'unsubscribed';
  status: string;
  chanId: number;
};

export function isUnsubscribedAck(frame: unknown): frame is UnsubscribedAck {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'unsubscribed' &&
    typeof candidate.status === 'string' &&
    typeof candidate.chanId === 'number'
  );
}
