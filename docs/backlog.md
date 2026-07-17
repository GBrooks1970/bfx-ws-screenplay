<!--
  AUDIENCE: Engineers, AI agents, and project leads maintaining work-in-progress tracking.
  PURPOSE:  Single source of truth for outstanding work, risks, and the SPEC roadmap
            for this project.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted for a fresh SDD project)
-->

# bfx-ws-screenplay — Backlog

**Version:** 7 — code review v1 findings (Risks #2–#8) resolved via WORKLIST_bfx-ws-screenplay.md
**Last Updated:** 2026-07-17
**Based on:** `SPECIFICATION.md` (normative design spec), the SPEC-001..006 review packs (approved
4–5 July 2026), and code review v1 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`,
2026-07-06 — no HIGH findings), remediated by BFX-01..07 on
[PR #9](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/9) (open, not yet merged as of
2026-07-17)

This backlog tracks the SPEC-unit roadmap and any risks against it; ordering follows the
specification's mandatory implementation order (SPEC-001 → 006, 007 stretch).

**Priority Scoring System:**
- **Score = Security Impact (0–10) + Breakage Probability (0–10) + Maintenance Burden (0–10)**
- **HIGH (20–30):** Critical — immediate action required
- **MEDIUM (10–19):** Important — schedule within current sprint cycle
- **LOW (0–9):** Desirable — schedule when capacity allows

---

## Outstanding Risks

### HIGH Priority (Score: 20–30)

None.

### MEDIUM Priority (Score: 10–19)

None. Risks #2–#4 (code review v1) resolved 2026-07-17 — see Resolved Risks below.

### LOW Priority (Score: 0–9)

Risks #5–#8 (code review v1) resolved 2026-07-17 — see Resolved Risks below. One LOW item remains
open (unrelated recurring-maintenance item, not a review finding):

#### Risk #1: Pinned-trio drift (Cypress / cucumber-preprocessor / esbuild-preprocessor) — Score: 5

**Priority Score:** Security Impact (1) + Breakage Probability (2) + Maintenance Burden (2) = **5 points**
**Impact:** Cypress 15.18.0 already exists outside the preprocessor's peer range (caps at 15.17.0); an unconsidered upgrade breaks the build.
**Effort:** 1 hr per deliberate upgrade
**Status:** READY TO START (recurring maintenance, not a defect)
**Affected Stacks:** TypeScript/Cypress (single stack)

**Problem:**
Dependencies are exact-pinned by design (README pin table). The preprocessor's Cypress peer
range moves later than Cypress releases, so upgrades must check the peer range first.

**Refactor Strategy:**
On each deliberate upgrade: check `@badeball/cypress-cucumber-preprocessor` peer range, bump the
trio together, re-run all gates plus one live `@extended` run.

**Success Criteria:**
- [ ] Trio versions mutually compatible after any bump; gates green; README pin table updated.

---

### Resolved Risks

#### Risk #2 (review #1): Checksum string can diverge from the wire for exponent-notation magnitudes ✅ Resolved 2026-07-17

**Resolution:** `wireNumber()` guard added in `orderBook.ts`; `checksumString` routed through it;
throws a named `ChecksumSerializationError` on exponent-range magnitudes instead of silently
diverging from the wire. Pure unit check (`scripts/check-checksum-serialization.ts`, 5/5) covers
the exponent-range case (`1e-7`, `1e21`). Gates (typecheck/lint/test:smoke) green.
**See:** commit `db3ed18`, BFX-01, PR #9 (open, not yet merged).

#### Risk #3 (review #2): Book-depth invariant relaxed (25 → 30) without an ADR change note ✅ Resolved 2026-07-17

**Resolution:** `docs/adr/ADR-006-book-depth-transient-overshoot-margin.md` added, documenting the
transient-overshoot rationale and the `<= 30` margin; cross-referenced from `SPECIFICATION.md`
SPEC-004.
**See:** commit `07e356f`, BFX-02, PR #9 (open, not yet merged).

#### Risk #4 (review #3): `ws:send` reports success unconditionally; no socket-state guard ✅ Resolved 2026-07-17

**Resolution:** `driver.ts` `send()` now checks `readyState`; returns a new `SendResult` on a closed
socket; the ability rescans for blocking codes and throws `EnvironmentBlockedError`/
`ConfigurationError` as appropriate.
**See:** commit `fbdd451`, BFX-03, PR #9 (open, not yet merged).

#### Risk #5 (review #4): Non-trivial invariant logic accumulating in the step-definition layer ✅ Resolved 2026-07-17

**Resolution:** Book-side invariants moved into `cypress/support/books/invariants.ts`; OHLC
invariants (`candlesRespectOhlcInvariants`) moved beside the candle schema; steps return to pure
delegation (ADR-003). Verified live via a targeted `@extended` run (SPEC-004/005, 7/7).
**See:** commit `f668a16`, BFX-04, PR #9 (open, not yet merged).

#### Risk #6 (review #5): CI workflow lacks `timeout-minutes`, `concurrency`, and `permissions` ✅ Resolved 2026-07-17

**Resolution:** `ci.yml` gained workflow-level `permissions: contents: read`, `timeout-minutes`
(15 smoke / 30 extended), and a `concurrency` group with `cancel-in-progress: true` on the
push-triggered `smoke` job. CI run green.
**See:** commit `ce52585`, BFX-05, PR #9 (open, not yet merged).

#### Risk #7 (review #6): `conf` acknowledgement validated inline, bypassing the schema catalogue ✅ Resolved 2026-07-17

**Resolution:** `cypress/schemas/confEvent.ts` added (`isConfEvent` guard, verified against live
Bitfinex docs); `EnableChecksumFrames` now validates the ack via the guard. Verified live via a
targeted `@extended` SPEC-004 run (4/4).
**See:** commit `4777b54`, BFX-06, PR #9 (open, not yet merged).

#### Risk #8 (review #7): Assertion failure messages stringify `Map`-based books to `{}` ✅ Resolved 2026-07-17

**Resolution:** Book Questions (`TheChannelSnapshot.ofTheBook`, `TheMaintainedBook.now`) now answer
the serialisable `sortedSides()` projection (plain arrays) instead of the raw `Map`-based
`MaintainedBook`, so a failed invariant's diagnostic prints the actual price levels. Demonstrated by
`scripts/check-book-diagnostics.ts` (2/2 checks: reproduces the historical `{}` defect, then proves
the fix).
**See:** commit `6099f91`, BFX-07, PR #9 (open, not yet merged).

#### npm audit: mocha transitive vulnerabilities (1 high, 1 moderate, 1 low) ✅ Resolved 2026-07-04

**Resolution:** `overrides` in `package.json` force patched `diff` (^8.0.3) and
`serialize-javascript` (^7.0.5) inside mocha's tree; `npm audit` = 0 vulnerabilities; three
consecutive green runs prove no breakage.
**See:** initial commit (SPEC-001 skeleton).

---

## Risk Summary

| Priority | Count | Total Effort | Status Distribution |
|---|---|---|---|
| HIGH (20–30) | 0 | — | — |
| MEDIUM (10–19) | 0 | — | — |
| LOW (0–9) | 1 | ~1 hr per deliberate upgrade | READY TO START (recurring maintenance, unrelated to review v1) |
| **Total Outstanding** | **1** | recurring | |
| Resolved | 8 | | 7 via WORKLIST_bfx-ws-screenplay.md (PR #9, open) + 1 prior |

---

## SPEC Roadmap (the project's migration plan)

**Status:** ✅ COMPLETE — SPEC-001 → 006 all done and merged 2026-07-04/06; SPEC-007 stretch
remains an open decision (out of initial scope, confirmed 4 July 2026, `SPECIFICATION.md`
Section 11).

Every unit follows the SDD gate (`SPECIFICATION.md` Section 10): verify live Bitfinex docs →
feature file → **Gary's review** → implement → three consecutive green runs locally and in CI.

1. **SPEC-001 — Connection lifecycle & framework skeleton** ✅ COMPLETE 2026-07-04
   - 5/5 scenarios; three consecutive green runs local + CI; review pack approved on all four
     questions; catalogue additions (AttemptConnection, TheConnectionOutcome,
     TheSessionRegistration, `ws:sessions`) recorded in the spec.
2. **SPEC-002 — Ticker channel** ✅ COMPLETE 2026-07-05
   - 3 scenarios (`@smoke`); three consecutive green runs local + CI. Field discoveries recorded
     in-code: live payloads carry an undocumented 11th element (guard validates the 10 documented
     fields, tolerates extras); new named `updateWaitMs = 30 s` for at-least-one-update waits
     (ticker pushes are event-driven, 5–8 s apart on tBTCUSD).
3. **SPEC-003 — Trades channel** ✅ COMPLETE 2026-07-05
   - 4 scenarios (`@extended`); live probe matched docs exactly (4-element trades; `tu` follows
     `te` by ~50 ms). Predicate DSL contract extended (`label` + `where` on channel frames, per
     `docs/predicate-dsl.md`); `ObserveAnExecutedTrade` task added to the spec catalogue; CI
     `workflow_dispatch` gained a `suite` input so `@extended` units get their DoD CI runs.
4. **SPEC-004 — Order book & checksum verification (flagship)** ✅ COMPLETE 2026-07-05
   - 4 scenarios (`@extended`), including 5 consecutive CRC-32 checksum matches against the
     locally maintained book. Algorithm proven by live probe before drafting (8/8 checksums,
     623 updates applied). Buffer-index determinism: each `cs` frame is verified against the
     book folded from exactly the frames that preceded it. Pure fold/CRC-32 functions in
     `cypress/support/books/`; zero driver changes. Catalogue additions: `EnableChecksumFrames`,
     `ObserveBookUpdates`.
5. **SPEC-005 — Candles channel** ✅ COMPLETE 2026-07-05
   - 3 scenarios (`@extended`). Field-order trap documented ([MTS, OPEN, CLOSE, HIGH, LOW,
     VOLUME] — close before high/low); candles ack is key-only (no symbol/pair) so it has its
     own ack schema; newest-first snapshot ordering asserted deliberately (observed 240/240,
     undocumented — review Q1); new named `candleUpdateWaitMs = 45 s` (updates tick ~15 s —
     review Q2).
6. **SPEC-006 — Negative paths & unsubscription** ✅ COMPLETE 2026-07-05
   - 4 scenarios (`@extended`). Live-vs-docs delta recorded: both unknown-symbol and
     unknown-channel rejections return generic code 10300 + distinguishing msg (docs imply
     10001/10302) — asserted code + msg substring per review Q1. Quiet pair selected =
     `tZECBTC` (REST survey + 15.0 s heartbeats observed). Post-unsubscribe silence proven
     deterministically via ping/pong sync barrier + buffer-index scan (no fixed waits).
     `heartbeatWaitMs` 30→45 s (review Q3).
7. **SPEC-007 — Sequencing** — STRETCH (revisit after SPEC-006)

**Success Criteria:**
- [x] SPEC-002 → 006 complete, each with three consecutive green runs local + CI
- [x] Quiet-pair symbol selected against the documented criterion (`tZECBTC`, SPEC-006), recorded
      in `cypress/support/config/index.ts`
- [ ] SPEC-007 decision revisited after SPEC-006 (still open)

---

## Potential Next Steps

### LOW Priority

1. **Node engines floor** — 0.5 hr, OPEN QUESTION: `engines` is `>=20` (local dev machine runs
   Node 20.19.5) while `.nvmrc`/CI pin 24; tighten to `>=24` only if local tooling moves.

---

## Sprint Planning Summary

| Sprint | Priority | Items | Total Effort | Start | End |
|---|---|---|---|---|---|
| Done | HIGH | SPEC-002..006 (full in-scope roadmap) | ~13 hrs actual | 2026-07-04 | 2026-07-06 |
| Done | MEDIUM+LOW | Review v1 findings: Risks #2–#8 (BFX-01..07, PR #9, open) | ~5.5 hrs | 2026-07-17 | 2026-07-17 |
| Later | — | SPEC-007 stretch decision (still open); Risk #1 pinned-trio maintenance (recurring) | — | TBD | TBD |

---

## Maintenance Notes

- Include links/paths to affected files when adding new items
- Update version number at top when items change status
- Cross-reference code review findings in `.review/` — code review v1
  (`CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`) triaged into Risks #2–#8
- Mark completion dates when items move to ✅ Resolved
- The design spec (`SPECIFICATION.md`) is normative — backlog items never override it; deviations
  need an ADR change note in `docs/adr/` first
