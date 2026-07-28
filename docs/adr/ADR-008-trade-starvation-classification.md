# ADR-008 — Classifying live trade starvation as an environment outcome

**Status:** Accepted (design note, 28 July 2026). This is the SDD design record
for the CODEX-03 implementation; it extends the environment-blocked policy of
[ADR-005](./ADR-005-time-and-flake-policy.md) to the trades channel. It closes
code review v1 (Codex), the HIGH finding on the SPEC-003 `te`-frame timeouts.

## Problem

`SPECIFICATION.md` Section 8 (SPEC-003) streams executed trades as `te` frames.
Two scenarios wait, bounded, for at least one new `te` on the primary symbol
(`ReceivedUpdates.executedTrades` and the `ObserveAnExecutedTrade` task, both on
`TIMEOUTS.updateWaitMs` = 30 s). On a quiet market the exchange may simply not
execute a trade for the symbol inside that window.

Before this ADR the bounded wait, on timeout, rescanned only for platform
blocking codes (20051/20060); finding none it threw a bare `AssertionError`
("Timed out after 30000 ms …"). That reports an **unexplained product failure**
when the true cause is an absence of market activity — an environment condition
the test cannot force.

**Evidence.** Default-branch nightly run **#30189796150** failed with exactly two
SPEC-003 `te`-frame timeouts on `tBTCUSD`, while adjacent nightlies over the same
period were green. The connection, subscription acknowledgement and a
schema-valid snapshot were all present in each failing run — only a *new* trade
was missing. That is the quiet-market signature, not a regression.

## Decision

A timed-out trades `te` wait is **classified**, not blindly failed. When the
window elapses with no matching `te`, the framework gathers evidence from the
driver buffer and decides an outcome (`cypress/support/screenplay/trades/`):

| Condition (first match wins) | Outcome | Severity |
| --- | --- | --- |
| Platform blocking status (20051/20060/status 0) buffered | `blocked` | environment-blocked |
| A `te`/`tu` arrived but failed its schema or pairing | `malformed` | **product failure** |
| No subscription acknowledgement (no channel ID) | `unconfirmed` | **product failure** |
| Channel never delivered its snapshot | `no-snapshot` | **product failure** |
| A `te` did arrive after all | `streamed` | pass |
| Connected + subscribed + snapshot present, **no `te`** | `starved` | environment-blocked |

The precedence is deliberate: **the most specific product failure outranks the
benign quiet-market outcome**, so a real regression can never be masked by market
quiet. `starved` and `blocked` surface as `EnvironmentBlockedError` — the marker
reports filter on — so they are distinguishable from failures and do not count
against the product. Everything else stays a loud `AssertionError`.

### Why malformed and pairing stay loud

A `te`/`tu` that is *received* but malformed, or a `tu` that does not pair to its
`te`, never reaches the starvation path: the predicate matches the frame, so the
wait resolves (not a timeout) and the downstream schema/pairing check fails it
distinctly. The `tu`-pairing wait
(`ReceivedUpdates.theUpdateForTheObservedTrade`) is intentionally **out of scope**
for starvation reclassification: once a `te` has been observed, its `tu` is
expected to follow, so a missing pairing update remains a genuine protocol
failure. Only the "no trade executed at all" (`te`) waits are reclassified.

## Scope and constraints

- **No fixed sleeps or blind retries.** The classification adds only zero-timeout
  buffer *peeks* after the existing bounded wait; it introduces no new waiting.
- **Diagnostics must stay actionable.** Every `starved` outcome carries the
  symbol, the timeout, the subscription/snapshot evidence, and the observed
  `te`/`tu`/data-frame counts, so a real regression remains investigable from the
  message alone (Risk/dependency note on the worklist item).
- **The decision is pure and unit-tested.** `classifyTradeStream` takes plain
  evidence and returns an outcome with no Cypress or socket dependency;
  `scripts/check-trade-starvation-classification.ts` (in `npm run check:pure`)
  pins every branch and the precedence between them.

## Verification

SPEC-003 is `@extended` and dispatched against the live API. A run is acceptable
if it either genuinely streams a trade (`pass`) or reports the newly documented
`starved` environment-blocked outcome; only `malformed`, `unconfirmed`,
`no-snapshot` or a socket fault is a failure. Market activity cannot be forced,
so the deterministic classification tests carry the correctness proof and the
live dispatch confirms wiring.

## Consequences

- Quiet-market nightlies like #30189796150 now report an explained,
  distinguishable environment outcome instead of a red product failure.
- One new diagnostic primitive (`CommunicateOverWebSocket.peek`, a non-blocking
  buffer read) and one new pure module are added; no existing wait semantics
  change for non-trades channels.
- Ticker (SPEC-002) and candle (SPEC-005) "at least one update" waits are **not**
  reclassified here — they are lower-risk and out of the review's scope — but the
  same pattern could extend to them if a future quiet-window failure warrants it.
