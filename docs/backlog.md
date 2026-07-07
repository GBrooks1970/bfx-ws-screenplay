<!--
  AUDIENCE: Engineers, AI agents, and project leads maintaining work-in-progress tracking.
  PURPOSE:  Single source of truth for outstanding work, risks, and the SPEC roadmap
            for this project.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted for a fresh SDD project)
-->

# bfx-ws-screenplay — Backlog

**Version:** 6 — code review v1 findings triaged in
**Last Updated:** 2026-07-06
**Based on:** `SPECIFICATION.md` (normative design spec), the SPEC-001..006 review packs (approved
4–5 July 2026), and code review v1 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`,
2026-07-06 — no HIGH findings)

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

All three are code-review-v1 findings; none is HIGH and all three gates passed live during the
review. See `.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/02_RISKS_AND_ISSUES.md`.

#### Risk #2 (review #1): Checksum string can diverge from the wire for exponent-notation magnitudes — Score: 11

**Priority Score:** Security Impact (0) + Breakage Probability (7) + Maintenance Burden (4) = **11 points**
**Impact:** `checksumString` uses bare `String(price)`/`String(amount)`; JS emits exponential
notation (`'1e-7'`) below `1e-6`, so the flagship checksum would false-fail on a low-priced pair.
Not triggered on tBTCUSD/P0 (never enters the exponent range), which is why it has not bitten.
**Effort:** 1–2 hrs
**Status:** READY TO START
**Affected Stacks:** TypeScript/Cypress

**Refactor Strategy:**
Add a `wireNumber(n)` guard in `checksumString` that fails with a *named* error on exponent forms
(diagnosable, not mysterious), OR record a dated ADR note scoping exponent-range magnitudes out of
the P0/tBTCUSD configuration. Add a pure unit check over an exponent-range level (the book modules
are already pure and test-ready).

**Success Criteria:**
- [ ] Exponent-range magnitude either handled or explicitly scoped out with a dated note; pure
      unit check exists.

#### Risk #3 (review #2): Book-depth invariant relaxed (25 → 30) without an ADR change note — Score: 10

**Priority Score:** Security Impact (0) + Breakage Probability (2) + Maintenance Burden (8) = **10 points**
**Impact:** `spec-004.steps.ts` bounds each side at `<= 30` while the subscription is `len: '25'`.
The relaxation is defensible (transient overshoot between an over-depth insert and the platform's
compensating removal), but the SDD agreement requires a written ADR change note *before* deviating
code — none exists. Process-integrity gap in the flagship unit; the decision was made in the
(out-of-repo) SPEC-004 review pack.
**Effort:** 15 min
**Status:** READY TO START
**Affected Stacks:** TypeScript/Cypress

**Refactor Strategy:**
Add a dated change note (ADR-006 or a SPEC-004 addendum) recording the transient-overshoot
rationale and the chosen margin, OR tighten to `len` and assert post-quiescence depth.

**Success Criteria:**
- [ ] Spec-vs-implementation delta on book depth is documented, or the check is tightened to `len`.

#### Risk #4 (review #3): `ws:send` reports success unconditionally; no socket-state guard — Score: 11

**Priority Score:** Security Impact (0) + Breakage Probability (5) + Maintenance Burden (6) = **11 points**
**Impact:** `driver.ts` `send` returns `{ ok: true }` without checking `readyState`; a mid-scenario
socket close (restart/maintenance — the situation the suite is careful about) is swallowed, so the
scenario dies later in a poll timeout that points at the wrong cause. Misleading diagnostics in the
exact failure mode the project treats as first-class.
**Effort:** 1 hr
**Status:** READY TO START
**Affected Stacks:** TypeScript/Cypress (driver + bridge contract)

**Refactor Strategy:**
Check `session.socket.readyState === WebSocket.OPEN`; return `{ ok: false, reason: 'socket-not-open' }`
(extend the bridge contract type in `protocol.ts`, note it in the `predicate-dsl.md` change log if
treated as a contract change) and have the ability raise the appropriate error. Optionally buffer a
synthetic `connection-closed` marker on `'close'`.

**Success Criteria:**
- [ ] `send` guards socket state and surfaces a distinct, diagnosable failure.

### LOW Priority (Score: 0–9)

#### Risk #5 (review #4): Non-trivial invariant logic accumulating in the step-definition layer — Score: 6

**Priority Score:** Security Impact (0) + Breakage Probability (2) + Maintenance Burden (4) = **6 points**
**Impact:** ADR-003 says steps are "glue only". SPEC-004's steps hold ~24 lines of book semantics
(`strictlyDescending`/`strictlyAscending`/`sidesPureAndOrdered`); milder cases in SPEC-002/003/005
steps. Correct and readable, but unreachable for reuse and normalises logic in the glue layer.
**Effort:** 1–2 hrs
**Status:** READY TO START

**Refactor Strategy:**
Move book-side invariants into a pure `cypress/support/books/invariants.ts` (and OHLC invariants
next to the candle schema); export as named `Expectation`s via `satisfies` so steps become pure
delegation again — and become unit-testable.

**Success Criteria:**
- [ ] Domain invariants live in pure modules; steps delegate only.

#### Risk #6 (review #5): CI workflow lacks `timeout-minutes`, `concurrency`, and `permissions` — Score: 5

**Priority Score:** Security Impact (2) + Breakage Probability (1) + Maintenance Burden (2) = **5 points**
**Impact:** Both `ci.yml` jobs run against a live external service with no job timeout (a wedged run
holds a runner for GitHub's 6-hour default), no concurrency grouping (rapid pushes run parallel
live-API suites, against the repo's own etiquette), and default token scope.
**Effort:** 15 min
**Status:** READY TO START

**Refactor Strategy:**
Add `timeout-minutes` (15 smoke / 30 extended), `concurrency: { group: ci-${{ github.ref }},
cancel-in-progress: true }` on the push-triggered job, and `permissions: { contents: read }` at
workflow level.

**Success Criteria:**
- [ ] CI has job timeouts, concurrency grouping, and least-privilege token permissions.

#### Risk #7 (review #6): `conf` acknowledgement validated inline, bypassing the schema catalogue — Score: 4

**Priority Score:** Security Impact (0) + Breakage Probability (1) + Maintenance Burden (3) = **4 points**
**Impact:** Spec §7.2 mandates assertions reference schemas. `EnableChecksumFrames` validates the
`conf` ack with an inline cast + field check instead of a type guard. Minor consistency gap;
compounds if SPEC-007 (which reuses `conf`) lands.
**Effort:** 15 min
**Status:** READY TO START

**Refactor Strategy:**
Add `cypress/schemas/confEvent.ts` (`{ event: 'conf', status: string, flags?: number }` with the
usual docs-verification header) and use it in the task.

**Success Criteria:**
- [ ] `conf` ack validated via a schema guard like every other event type.

#### Risk #8 (review #7): Assertion failure messages stringify `Map`-based books to `{}` — Score: 4

**Priority Score:** Security Impact (0) + Breakage Probability (0) + Maintenance Burden (4) = **4 points**
**Impact:** `Expectation.verify` reports `... but got ${JSON.stringify(actual)}`; a `MaintainedBook`
holds `Map`s, which stringify to `{}` — a failed book invariant prints `{"bids":{},"asks":{}}`,
hiding the state the engineer needs. Diagnostics only, but it lands on the flagship unit's failures.
**Effort:** 30 min
**Status:** READY TO START

**Refactor Strategy:**
Either give `Expectation.verify` a pluggable renderer, or have the book questions answer a
serialisable projection (`sortedSides` output — plain arrays) instead of the raw `Map`.

**Success Criteria:**
- [ ] Book invariant failures print the actual book state.

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
| MEDIUM (10–19) | 3 | ~2.5 hrs | all READY TO START (review v1) |
| LOW (0–9) | 5 | ~3 hrs + recurring trio bump | all READY TO START |
| **Total Outstanding** | **8** | ~5.5 hrs + recurring | |
| Resolved | 1 | | |

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
| Next | MEDIUM | Review v1 findings: Risks #2, #3, #4 | ~2.5 hrs | TBD | TBD |
| Later | LOW | Review v1 LOW findings (#5–#8); SPEC-007 stretch decision | ~3 hrs | TBD | TBD |

---

## Maintenance Notes

- Include links/paths to affected files when adding new items
- Update version number at top when items change status
- Cross-reference code review findings in `.review/` — code review v1
  (`CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`) triaged into Risks #2–#8
- Mark completion dates when items move to ✅ Resolved
- The design spec (`SPECIFICATION.md`) is normative — backlog items never override it; deviations
  need an ADR change note in `docs/adr/` first
