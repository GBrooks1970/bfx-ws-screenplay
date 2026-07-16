/**
 * Schema (type guard) for the `conf` acknowledgement. Verified against
 * https://docs.bitfinex.com/docs/ws-config, 17 July 2026:
 * { "event": "conf", "status": "OK" }
 *
 * `flags` is not present in the documented example but is kept optional
 * here rather than assumed absent — the acknowledgement's own request
 * echoes it in some other Bitfinex config responses, and an optional field
 * accepts either shape without narrowing what a valid ack can look like.
 */
export type ConfEvent = {
  event: 'conf';
  status: string;
  flags?: number;
};

export function isConfEvent(frame: unknown): frame is ConfEvent {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  return (
    candidate.event === 'conf' &&
    typeof candidate.status === 'string' &&
    (candidate.flags === undefined || typeof candidate.flags === 'number')
  );
}
