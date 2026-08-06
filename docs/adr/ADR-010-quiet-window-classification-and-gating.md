# ADR-010 — Quiet-window classification for every channel, and the gate that honours it

**Status:** Accepted (design note, 6 August 2026). Completes
[ADR-008](./ADR-008-trade-starvation-classification.md), which classified quiet
trades windows but left the classification with no effect on the build, and
extends it to the channels ADR-008 explicitly deferred.

## Problem

Two separate gaps, both showing up as a red default branch.

### 1. The marker nothing filtered on

`EnvironmentBlockedError` is documented as "a distinguishable environment
outcome, not a product failure … the name is the marker reports are filtered on"
(`cypress/support/screenplay/core/errors.ts`), and ADR-008 closes by claiming
quiet-market nightlies "now report an explained, distinguishable environment
outcome instead of a red product failure."

Nothing filtered on it. `npm run test:extended` was a bare `cypress run`, and
Cypress counts any thrown error as a failing test and exits non-zero. The
classification produced a better *message* and changed nothing about the build.

**Evidence.** Nightly **#31068372818** (6 August 2026) failed with 22 of 23 tests
passing and one scenario reporting, verbatim:

> `EnvironmentBlockedError: environment-blocked: no new trade executed within the
> observation window; connection, subscription and a schema-valid snapshot are
> all present, so this is a quiet market, not a product failure`

The suite diagnosed itself correctly and still turned the branch red. Commit
`c5975cc` passed on 5 August and failed on 4 and 6 August — the same tree, three
different verdicts, decided by market activity.

### 2. The channels ADR-008 deferred

ADR-008 scoped classification to the trades `te` waits and closed with: "Ticker
(SPEC-002) and candle (SPEC-005) 'at least one update' waits are **not**
reclassified here … but the same pattern could extend to them if a future
quiet-window failure warrants it."

It has. Over the nine scheduled runs to 6 August 2026 the default branch failed
three times — a 33% nightly failure rate:

| Run | Wait | Reported as |
| --- | --- | --- |
| #31068372818 | trades `te` | `EnvironmentBlockedError` (classified, still red) |
| #30953031343 | ticker update | `AssertionError: Timed out after 30000 ms waiting for 1 ticker update(s) after the snapshot` |
| #30686140556 | trades `te` **and** book `cs` | one classified, one `AssertionError: Timed out after 30000 ms waiting for 5 checksum frame(s)` |

The unclassified waits are the worse failure: a quiet market there is
indistinguishable from a genuine regression, so the signal is lost in both
directions.

## Decision

### Classify every bounded "at least N frames" window

`classifyChannelWindow` (`cypress/support/screenplay/streams/`) generalises
ADR-008's decision to any channel window, with the same precedence — the most
specific product failure outranks the benign environment outcome:

| Condition (first match wins) | Outcome | Severity |
| --- | --- | --- |
| Platform blocking status buffered | `blocked` | environment-blocked |
| No subscription acknowledgement | `unconfirmed` | **product failure** |
| Channel never delivered its snapshot | `no-snapshot` | **product failure** |
| The count was in fact reached | `delivered` | pass |
| Frames observed **below `quietFloor`** | `silent` | **product failure** |
| Subscribed + snapshot, count short | `quiet` | environment-blocked |

Applied to `ReceivedUpdates.fromTheTicker`, `ReceivedUpdates.candles` and
`ChecksumVerifications.firstConsecutive`. The trades path keeps its own
trades-specific classifier (`te`/`tu` evidence has no analogue on other
channels); the two share precedence, not code.

#### `quietFloor` — why zero is not always quiet

The new lever, and the one that keeps the gate honest. It is the number of
matching frames that must arrive before a shortfall counts as merely quiet:

- **Ticker and candles use `0`.** A genuinely quiet minute pushes no update at
  all, so zero is a plausible market state.
- **Book checksums use `1`.** `cs` frames only flow because
  `EnableChecksumFrames` set the conf flag. *Zero* `cs` frames while the book
  streams means the flag was never honoured — a product failure that
  `quietFloor: 0` would have excused as market quiet. A partial run (2 of 5) is
  a slow book and stays environment-blocked.

### Gate the build on the marker

`scripts/environmentBlockedGate.ts` reads the cucumber JSON report and decides
whether a non-zero Cypress exit is explained *entirely* by environment-blocked
outcomes. `npm run test:smoke` / `test:extended` now run through
`scripts/run-suite.ts`, which drives Cypress via its Node module API and applies
the gate.

The gate can only ever turn a red build green, so it is deliberately biased
toward staying red. It opens **only** when there is at least one failed scenario
and *every* failed scenario carries the marker. All of these stay red:

- a product failure alongside a quiet market (the masking risk — one real
  regression must never ride out on a quiet night);
- a non-zero exit with no failed scenario in the report (a crash, a config
  error, a missing report — an unrun suite is not a pass);
- an unparseable report;
- a product failure whose assertion text merely quotes the marker (matching is
  anchored to the start of the error message, so only an error actually thrown
  as `EnvironmentBlockedError` qualifies).

The original non-zero exit code is preserved rather than normalised, so
`cypress run`'s failure count still reaches CI.

## Scope and constraints

- **No fixed sleeps, no blind retries** (ADR-005 holds). Classification adds only
  zero-timeout buffer *peeks* after the existing bounded wait; it introduces no
  new waiting, and no retry was added — a quiet market is reported, not re-rolled.
- **The decisions are pure and unit-tested.** `classifyChannelWindow` and the
  gate both take plain data and return a decision with no Cypress, socket or
  filesystem dependency. `test/unit/channel-window-classification.test.ts` and
  `test/unit/environment-blocked-gate.test.ts` pin every branch, the precedence
  between them, and — for the gate — every path that must stay red. Both modules
  are in the `test:unit:coverage` branch-coverage floor.
- **Diagnostics stay actionable.** Every `quiet` outcome carries the channel,
  symbol, timeout, subscription/snapshot evidence and observed/required counts,
  so a real regression remains investigable from the message alone.

## Verification

The deterministic unit suites carry the correctness proof; market activity
cannot be forced, so the live dispatch confirms wiring only. A run is acceptable
if it either reaches its frame counts or reports a classified environment
outcome; `unconfirmed`, `no-snapshot`, `silent`, a schema failure or a socket
fault remains a failure.

## Consequences

- Quiet-market nightlies stop turning the default branch red, which is what
  ADR-008 intended and did not deliver. The 33% nightly failure rate should fall
  to the rate of genuine defects.
- Environment outcomes stay **visible**: the gate prints every excused scenario
  and its diagnostic before passing the build, so a channel that is quiet every
  single night is still obvious to a reader rather than silently green.
- A new failure mode is possible in principle: a defect that presents exactly as
  a quiet window would now be excused. The `quietFloor` lever and the
  product-failure precedence are the mitigations, and the book-checksum floor is
  the worked example of tuning it.
- The `npm audit --audit-level=high` gate is **not** covered by any of this and
  remains a live-advisory dependency: a newly published HIGH advisory turns CI
  red with no code change (as it did in #30880617831). That is a separate policy
  question for `docs/dependency-audit-policy.md`.
