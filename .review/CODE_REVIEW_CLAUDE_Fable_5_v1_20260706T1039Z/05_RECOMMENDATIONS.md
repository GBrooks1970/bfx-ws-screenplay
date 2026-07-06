# Recommendations

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

## Recommended Refactors (priority order)

- **Guard the checksum serialisation** (Risk #1): add a `wireNumber()` helper (or an assertion that no part contains `'e'`) in [orderBook.ts](cypress/support/books/orderBook.ts) `checksumString`, plus a pure unit check with an exponent-range level - protects the flagship assertion against its one known false-failure mode.
- **Record the depth-invariant deviation** (Risk #2): one dated ADR change note (or spec addendum) explaining the 25-subscribed / 30-allowed transient margin in [spec-004.steps.ts](cypress/support/step_definitions/spec-004.steps.ts) line 29 - restores the "deviations are documented" guarantee the SDD story depends on.
- **Make `ws:send` state-aware** (Risk #3): check `readyState` in [driver.ts](node-driver/driver.ts) `send` and surface `{ ok: false, reason }` through the ability as a typed error, so mid-scenario disconnects fail at the send, not as a misleading poll timeout.
- **Relocate invariant predicates out of the glue layer** (Risk #4): book-side purity/ordering into `cypress/support/books/`, OHLC invariants beside the candle schema, exported as named `Expectation`s - steps return to pure delegation per ADR-003.
- **Harden CI** (Risk #5): `timeout-minutes`, `concurrency` with `cancel-in-progress`, and `permissions: contents: read` in [ci.yml](.github/workflows/ci.yml).

## Next Steps (immediate action items)

- Update [backlog.md](docs/backlog.md): add this review's findings under Outstanding Risks (Risks #1-#3 as candidate items), and refresh the stale "Cross-reference code review findings in `.review/` (none yet)" maintenance note (line 150).
- Proceed with SPEC-006 (PR #6 already open, out of scope here) - it is the final in-scope unit and unblocks the SPEC-007 decision plus the quiet-pair selection recorded in config.
- Add the `conf` ack schema ([EnableChecksumFrames.ts](cypress/support/screenplay/tasks/EnableChecksumFrames.ts), Risk #6) before SPEC-007 makes a second consumer of the `conf` flow.
- When touching dependencies next, run the backlog's pinned-trio upgrade procedure (Cypress 15.18.0 is already outside the preprocessor's peer range).

## Future Project Ideas (long-term enhancements)

- **Unit-test lane for the pure modules**: a `vitest`/`tsx` script gate over `books/` and `schemas/` (no Cypress, no network) would give the checksum algorithm offline regression protection and complete the test pyramid's base - roughly an afternoon's work.
- **Recorded-frame replay fixture**: capture one live book session (snapshot + updates + `cs` frames) as a JSON fixture and replay it through `foldBook`/`bookChecksum` offline - deterministic flagship verification even during platform maintenance windows.
- **SPEC-007 (sequencing)** as specified - the `conf` plumbing from SPEC-004 makes its marginal cost small, and strictly-monotonic sequence assertion is a strong closing talking point.
- **Driver diagnostics**: a debug-gated event trace (open/close/error per connection) in the Node driver to speed up triage of nightly `@extended` failures that cannot be reproduced interactively.

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
