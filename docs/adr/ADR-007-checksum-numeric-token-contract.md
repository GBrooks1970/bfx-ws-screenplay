# ADR-007 — Checksum numeric-token wire contract (plain-decimal serialisation)

**Status:** Accepted (design note, 28 July 2026). This is the SDD design
prerequisite for the CODEX-02 implementation; no framework code changes with
this ADR.

`SPECIFICATION.md` Section 8 (SPEC-004) makes local book-state maintenance plus
checksum recomputation the flagship unit, and requires the implementer to follow
the checksum algorithm from the Bitfinex documentation. This ADR fixes the one
piece that algorithm leaves implicit: **how a single price/amount value is turned
into its checksum token**. It closes code review v1 (Codex), Risk #1 (HIGH).

## Problem

`wireNumber()` (`cypress/support/books/orderBook.ts`, lines 78–99) serialises a
value with `String(value)` and then **throws** `ChecksumSerializationError` if the
token contains `e`/`E`. `String(number)` switches to exponent notation outside
roughly `1e-6 <= |n| < 1e21` (e.g. `String(1e-7) === '1e-7'`). Throwing was a safe
interim response to a *silent* CRC divergence — it turned a rare flake into a
loud, named error — but it does not implement the required plain-decimal wire
serialisation, and **valid live Bitfinex data reaches the rejected path**.

**Dated evidence (captured, retained):**

- Nightly run
  [29982495691](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/29982495691)
  on baseline `aa84dc9` failed 22/23: SPEC-004 raised
  `ChecksumSerializationError: checksum serialisation gap: 1e-8`. SPEC-001, 002,
  003, 005 and 006 passed and **no `environment-blocked` marker appeared** — i.e.
  a genuine wire value (`1e-8`, a valid small order amount) aborted the flagship
  scenario before the CRC comparison, not a platform outage.

## Authoritative source (verified 28 July 2026)

Bitfinex WebSocket order-book checksum documentation
(<https://docs.bitfinex.com/docs/ws-websocket-checksum>):

- The checksum covers the **25 highest bids and 25 lowest asks**, compiled
  sequentially as alternating `[bid, ask, bid, ask, …]` data.
- For **P-precision** books each level contributes its **price and amount**
  (raw `R0` books contribute order id and amount).
- Values are **concatenated into a string using a colon (`:`) delimiter**, then a
  **CRC-32** is taken (the docs use the `crc-32` JS library — the same library
  this project uses).
- The documentation's own worked example uses **plain-decimal tokens** with no
  exponent notation: `50968755521:0.10783801:50968615681:-0.4675:…`.

The wire format is therefore plain decimal, matching the string form the platform
sends in the raw book frames. The gap is purely local: parsing a wire token to a
JavaScript `number` and re-stringifying it can produce exponent notation that no
longer equals the token Bitfinex hashed.

## Decision — the numeric-token contract

`wireNumber()` must **support every finite numeric value the book schema accepts**,
by deterministic **exponent-to-plain-decimal serialisation** (not rejection):

1. **Supported range/precision.** Every finite IEEE-754 double that passes the
   book-frame schema (`cypress/schemas/`) is in contract. The serialiser emits the
   value's exact decimal expansion as plain-decimal text: an optional leading `-`,
   digits, an optional single `.` with fractional digits, and **no** exponent,
   **no** leading-zero padding beyond a single `0` before the point, and **no**
   trailing zeros beyond what the value carries.
2. **Exponent → plain-decimal normalisation.** `1e-8 → "0.00000001"`,
   `-1e-8 → "-0.00000001"`, `1e21 → "1000000000000000000000"`. Ordinary in-range
   decimals (e.g. `0.10783801`, `-0.4675`) already stringify plainly and are
   emitted unchanged.
3. **Zero and negative zero.** Both `0` and `-0` serialise to `"0"`. The serialiser
   must never emit a `"-0"` token (Bitfinex sends `0`; `String(-0) === "0"`, and the
   normalisation must preserve that).
4. **JSON-number limitation (stated, bounded).** `JSON.parse` maps each wire token
   to a double and discards the original string, so the serialiser reproduces the
   plain-decimal form *from the parsed double*, not from the bytes Bitfinex sent. If
   the platform ever sent a token whose exact decimal value exceeded double
   precision, the round-trip could diverge. For the subscribed instruments and
   `P0`–`P4` precisions the price/amount magnitudes fit within a double without loss,
   so this is out of contract scope; and were it ever hit, it would surface **loudly**
   as a CRC mismatch on the flagship scenario, never as a silent false green.

The narrower alternative — keep rejecting exponent-form values — is **not** adopted:
it leaves valid live data unassertable and keeps the flagship nightly red.

## Consequences

- **CODEX-02** replaces the exponent rejection in `wireNumber()` with a
  deterministic exponent-to-plain-decimal serialiser meeting this contract, and
  the unit suite `test/unit/checksum-serialization.test.ts` (run by
  `npm run test:unit`; migrated from the former proof script under CODEX-05)
  asserts the *converted output* for `1e-8`, `-1e-8`, large magnitudes, zero and
  ordinary decimals — not that a throw occurred. CRC fixtures cover the boundary
  cases.
- `SPECIFICATION.md` Section 8 (SPEC-004) cross-references this ADR for the
  numeric-token rule; the algorithm-level description there is unchanged.
- Until CODEX-02 lands, `wireNumber()` still throws on exponent input — the
  contract is defined and reviewed here first, per the project's SDD route.
