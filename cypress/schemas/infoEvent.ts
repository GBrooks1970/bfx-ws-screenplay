/**
 * Schema (type guard) for the platform info event received on connect.
 * Verified against https://docs.bitfinex.com/docs/ws-general, 4 July 2026:
 * { "event": "info", "version": VERSION, "platform": { "status": 0 | 1 } }
 */
export type PlatformInfoEvent = {
  event: 'info';
  version: number;
  platform: { status: number };
};

export function isPlatformInfoEvent(frame: unknown): frame is PlatformInfoEvent {
  if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
    return false;
  }
  const candidate = frame as Record<string, unknown>;
  if (candidate.event !== 'info' || typeof candidate.version !== 'number') {
    return false;
  }
  const platform = candidate.platform;
  return (
    typeof platform === 'object' &&
    platform !== null &&
    typeof (platform as Record<string, unknown>).status === 'number'
  );
}
