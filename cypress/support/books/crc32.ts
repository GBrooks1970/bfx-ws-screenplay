/**
 * Standard CRC-32 (polynomial 0xEDB88320), table-based, returning the SIGNED
 * 32-bit value Bitfinex sends in 'cs' frames.
 *
 * Implemented in plain TypeScript because Questions run in the browser
 * context, where Node's zlib.crc32 is unavailable. Equivalence with the
 * platform's CRC was proven live on 5 July 2026 (probe: 8/8 checksum frames
 * matched using this exact algorithm) — and every checksum scenario re-proves
 * it against the live platform on every run.
 */

const TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

/** CRC-32 of a string's UTF-8-safe char codes (input here is ASCII by construction). */
export function crc32Signed(input: string): number {
  let crc = -1;
  for (let i = 0; i < input.length; i += 1) {
    crc = (crc >>> 8) ^ (TABLE[(crc ^ input.charCodeAt(i)) & 0xff] as number);
  }
  // Final XOR, kept as a signed 32-bit integer to match the wire value.
  return (crc ^ -1) | 0;
}
