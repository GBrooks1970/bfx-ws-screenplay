# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Numbered high to low. No HIGH findings. v1 Risks #1-#7 were re-verified as resolved in the
current tree (commits `db3ed18`..`519a7a8`, merged as PR #9 / `3247130`); they are not
re-listed here. v1 Risk #8 (pinned-trio drift) remains correctly tracked as backlog Risk #1.

---

## Risk #1 (MEDIUM) - `unsubscribed` ack validated by an unguarded cast, bypassing the schema catalogue

**Risk Description:** The project's convention (and the fix pattern applied for the `conf`
ack in BFX-06) is that every event type crossing an assertion has a type guard in
`cypress/schemas/`. The `unsubscribed` ack does not: its shape is declared locally in the
question file and asserted with a bare `as` cast.

**Evidence:**
- [TheUnsubscriptionConfirmation.ts](../../cypress/support/screenplay/questions/TheUnsubscriptionConfirmation.ts)
  (line 4) declares `UnsubscribedAck` locally, outside the catalogue;
  (line 21) `const ack = frames[0]?.frame as UnsubscribedAck | undefined;` - only
  `typeof ack.status === 'string'` is subsequently checked (line 22).
- [Unsubscribe.ts](../../cypress/support/screenplay/tasks/Unsubscribe.ts) (lines 37-41)
  checks only frame presence before recording `unsubscribed:ackIndex`.
- `cypress/schemas/index.ts` exports guards for info, pong, conf, error, subscribed acks
  (generic, book, candles), ticker, trades, book levels, candles - but no `unsubscribedAck`.
- Nuance: [SPECIFICATION.md](../../SPECIFICATION.md) section 7.2 (line 223) enumerates the
  schema catalogue for SPEC-002..005 message types and does not name the `unsubscribed` ack -
  the list predates SPEC-006's implementation. This is therefore a convention gap rather than
  a literal spec violation, but the convention is what BFX-06 established as the standard.

**Impact:** A malformed or unexpected ack shape (e.g. a `status` present but `chanId` of the
wrong type, or a future platform change) would pass silently through the cast; a failure
would surface as a downstream index or comparison oddity rather than a named schema mismatch.
The catalogue also stops being the single source of structural truth for exactly one event
type, which is the kind of inconsistency the next contributor copies.

**Refactor Recommendation:** Add `cypress/schemas/unsubscribedAck.ts` with an
`isUnsubscribedAck` guard (event/status/chanId), verified against the live docs page and
dated per catalogue convention; use it in both `TheUnsubscriptionConfirmation.status()` and
`Unsubscribe.performAs()`; export it from `cypress/schemas/index.ts` and delete the local
type. Effort: under an hour, plus one targeted `@extended` SPEC-006 run.

---

## Risk #2 (LOW) - Backlog v7 states PR #9 is unmerged; it is merged and is HEAD

**Risk Description:** The backlog is the project's canonical status source of truth, and it
is factually stale about the current repository state.

**Evidence:**
- [docs/backlog.md](../../docs/backlog.md) (lines 15-17) "remediated by BFX-01..07 on
  PR #9 (open, not yet merged as of 2026-07-17)"; the same "(open, not yet merged)" phrasing
  repeats in each Resolved Risk entry (lines 74, 81, 88, 95, 102, 109, 118) and in the Risk
  Summary and Sprint Planning tables (lines 137, 208).
- `git log --oneline -1` shows `3247130 Merge pull request #9 ...` as the default-branch HEAD.
- Root cause is structural: the backlog update (BFX-08, `519a7a8`) was committed inside PR #9
  itself, so its self-referential "open" statements became stale the moment the PR merged.

**Impact:** Low practical risk, but this is the exact recurring portfolio theme (documentation
drift), located in the one file the conventions designate as canonical. A reviewer reconciling
backlog against git history gets contradictory answers.

**Refactor Recommendation:** A one-commit backlog v8 refresh replacing "open, not yet merged"
with "merged 2026-07-17 (`3247130`)". Process improvement: when a backlog reconciliation rides
inside the PR it describes, write the PR state as "merges with this PR" rather than a dated
open/closed claim.

---

## Risk #3 (LOW) - ADR-006 references the invariant's pre-BFX-04 location

**Risk Description:** ADR-006 (added by BFX-02) documents the depth-margin deviation but
points at the file the invariant lived in before BFX-04 relocated it - two commits later in
the same PR.

**Evidence:**
- [ADR-006](../../docs/adr/ADR-006-book-depth-transient-overshoot-margin.md) (lines 8-10):
  "The maintained-book purity check (`sidesPureAndOrdered` in
  `cypress/support/step_definitions/spec-004.steps.ts`) ...".
- The check actually lives in [cypress/support/books/invariants.ts](../../cypress/support/books/invariants.ts)
  (lines 12, 25-36; `MAX_SIDE_SIZE = 30`), moved there by BFX-04 (`f668a16`).

**Impact:** A reader following the ADR to the code lands in a file that no longer contains
the function. Small, but ADRs are the governance artefacts of this SDD project - their
references should survive the very PR that introduced them.

**Refactor Recommendation:** One-line edit pointing the ADR at
`cypress/support/books/invariants.ts`. Consider a closing "References current as of" line in
future ADR change notes, checked when a later commit in the same worklist moves cited code.

---

## Risk #4 (LOW) - The standalone proof scripts are not wired into npm scripts or CI

**Risk Description:** Two pure, network-free verification scripts prove the exponent-notation
guard and the diagnostics fix, but only one has an npm script and neither runs in CI - so the
regressions they guard against would not be caught automatically.

**Evidence:**
- [package.json](../../package.json) (line 23) defines `check:checksum-serialization`; there
  is no script for [scripts/check-book-diagnostics.ts](../../scripts/check-book-diagnostics.ts),
  which the backlog cites as the standing evidence for resolved Risk #8
  ([docs/backlog.md](../../docs/backlog.md) lines 116-118).
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml) runs typecheck, lint and the
  Cypress suites (lines 40-42, 61); neither `tsx` script appears in any job.

**Impact:** The scripts pass today (run for this review: 5/5 and 2/2), but a regression in
`wireNumber`, `checksumString` or the `sortedSides` projection would only surface if a
developer remembers to run them locally - or as a rare live checksum flake, which is exactly
what the guard exists to prevent.

**Refactor Recommendation:** Add `"check:book-diagnostics": "tsx scripts/check-book-diagnostics.ts"`
and a composite `"check:pure": "npm run check:checksum-serialization && npm run check:book-diagnostics"`;
insert `npm run check:pure` into the CI smoke job between lint and `test:smoke` (seconds of
runtime, no network).

---

## Risk #5 (LOW) - Residual inline predicate logic in step definitions; the "trivial" boundary is undocumented

**Risk Description:** BFX-04 relocated the substantial invariants out of the glue layer, but
several small predicate closures remain defined inside step-definition files. ADR-003 says
steps "contain no logic beyond delegating"; the de facto standard is now "single-expression
predicates are acceptable inline", which is reasonable but recorded nowhere.

**Evidence:**
- [spec-004.steps.ts](../../cypress/support/step_definitions/spec-004.steps.ts) (lines 75-84)
  best-bid-below-best-ask closure; (lines 92-96) positive prices/counts closure.
- [spec-002.steps.ts](../../cypress/support/step_definitions/spec-002.steps.ts) (lines 15-16)
  `bidDoesNotExceedAsk` module-level helper.
- [spec-003.steps.ts](../../cypress/support/step_definitions/spec-003.steps.ts) (lines 16-17)
  `priceAndAmountValid` module-level helper.
- [spec-005.steps.ts](../../cypress/support/step_definitions/spec-005.steps.ts) (lines 56-64)
  newest-first ordering closure.

**Impact:** Low today - each predicate is one expression and business-readable. The risk is
gradual re-accumulation: without a stated threshold, the next contributor has no principled
answer to "does this belong in the step file?", which is how v1's Risk #4 arose.

**Refactor Recommendation:** Either (a) move the named helpers beside their schemas as
`Expectation` exports (the `candlesRespectOhlcInvariants` pattern,
[candlesChannel.ts](../../cypress/schemas/candlesChannel.ts) lines 86-91), or (b) add one
sentence to ADR-003: "single-expression predicates over already-answered values may be
defined inline in step files; anything with branching, iteration state, or reuse moves to
the schema/invariant modules". Option (b) is cheaper and honest about current practice.

---

## Risk #6 (LOW) - Nightly/dispatched `extended` CI job skips typecheck and lint; fork PRs trigger live-API runs

**Risk Description:** Two minor CI-policy gaps. The `extended` job installs and tests but
does not run the static gates, so a nightly run can go green on a tree that fails lint (only
possible if something merged without the smoke job, but the jobs' gate sets should not
diverge silently). Separately, the workflow's bare `pull_request` trigger means a PR from any
fork runs the live-API smoke suite.

**Evidence:**
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml): smoke job runs
  typecheck/lint/test (lines 40-42); extended job runs only `npm run test:extended` (line 61).
- (line 9) `pull_request:` with no restriction; the suite needs no secrets, so fork runs
  succeed and consume live-API budget. Rate-limit exposure is bounded (one connection per
  scenario) and the repo has no secrets to leak, so this is etiquette, not security.

**Impact:** Marginal today; both are the kind of quiet divergence that surprises later
(a lint-red nightly artefact, or an unexpected live-API run from an external PR).

**Refactor Recommendation:** Add `npm run typecheck` and `npm run lint` before the extended
run (cheap relative to a 30-minute job); leave `pull_request` as-is if external PRs are not
expected, or note the live-API implication in the README's etiquette section.

---

## Risk #7 (INFO, tracked) - Node engines floor (`>=20`) vs `.nvmrc`/CI pin (24)

Already tracked as an open question in [docs/backlog.md](../../docs/backlog.md) (lines
198-199): `engines: >=20` ([package.json](../../package.json) line 9) while `.nvmrc` and CI
pin 24. This review ran the full gate set green on Node 20.19.5, which supports keeping the
floor at 20 until local tooling moves. No action beyond the backlog's existing note.

---

## Risk #8 (INFO) - `AttemptSubscription` re-declares a narrowed `FieldMatch` type locally

[AttemptSubscription.ts](../../cypress/support/screenplay/tasks/AttemptSubscription.ts)
(line 6) defines `type FieldMatch = { path: string; op: 'eq'; value: string | number }`,
shadowing the DSL's `FieldMatch` from [node-driver/protocol.ts](../../node-driver/protocol.ts)
(lines 12-18). It is assignment-compatible, so nothing breaks; but two types with the same
name for the same wire concept is mild DRY erosion at the DSL contract boundary. Import the
protocol type (or a `Pick`/narrowed alias of it) instead.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
