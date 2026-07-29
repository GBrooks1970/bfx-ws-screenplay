/**
 * Exact-shape guards for the two array channel frames that carry no data
 * payload of their own — the order-book checksum (`cs`) and the heartbeat
 * (`hb`) frames (CODEX-08). Verified against
 * https://docs.bitfinex.com/reference/ws-public-books (cs) and
 * https://docs.bitfinex.com/docs/ws-general (hb), 5 July 2026, and reproduced
 * live (checksum probe 8/8; heartbeats at 15.0 s on tZECBTC).
 *
 * The predicate DSL SELECTS candidate frames by channel id + label; these
 * guards VALIDATE the selected frame's exact tuple length, label, payload type
 * and channel id at the assertion boundary — the two responsibilities stay
 * separate (review Risk #4 / recommendation P2).
 */

/** `[CHANNEL_ID, 'cs', CHECKSUM]` — CHECKSUM is the platform's signed 32-bit CRC. */
export type BookChecksumFrame = readonly [number, 'cs', number];

/** `[CHANNEL_ID, 'hb']` — a bare keep-alive, no payload. */
export type HeartbeatFrame = readonly [number, 'hb'];

const CHANNEL_ID_INDEX = 0;
const LABEL_INDEX = 1;
const CHECKSUM_INDEX = 2;

/**
 * Exactly `[chanId, 'cs', <integer checksum>]`: length 3, the expected channel
 * id, the `cs` label, and an integer payload (the signed 32-bit CRC compared
 * against the locally recomputed book checksum).
 */
export function isBookChecksumFrame(frame: unknown, chanId: number): frame is BookChecksumFrame {
  return (
    Array.isArray(frame) &&
    frame.length === 3 &&
    frame[CHANNEL_ID_INDEX] === chanId &&
    frame[LABEL_INDEX] === 'cs' &&
    typeof frame[CHECKSUM_INDEX] === 'number' &&
    Number.isInteger(frame[CHECKSUM_INDEX])
  );
}

/**
 * Exactly `[chanId, 'hb']`: length 2, the expected channel id and the `hb`
 * label — no trailing payload.
 */
export function isHeartbeatFrame(frame: unknown, chanId: number): frame is HeartbeatFrame {
  return (
    Array.isArray(frame) &&
    frame.length === 2 &&
    frame[CHANNEL_ID_INDEX] === chanId &&
    frame[LABEL_INDEX] === 'hb'
  );
}
