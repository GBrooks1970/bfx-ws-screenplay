<!--
  AUDIENCE: Engineers, AI agents, and project leads maintaining work-in-progress tracking.
  PURPOSE:  Single source of truth for outstanding work, risks, and the SPEC roadmap
            for this project.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted for a fresh SDD project)
-->

# bfx-ws-screenplay — Backlog

**Version:** 10 — code reviews v1 (Risks #2–#8), v2 (Risks #1–#6) and v3 (Codex GPT-5 →
CODEX-01..10) findings resolved via WORKLIST_bfx-ws-screenplay.md
**Last Updated:** 2026-07-29
**Based on:** `SPECIFICATION.md` (normative design spec), the SPEC-001..006 review packs (approved
4–5 July 2026), code review v1 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`,
2026-07-06 — no HIGH findings), remediated by BFX-01..07 on
[PR #9](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/9), merged 2026-07-17 (`3247130`),
code review v2 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z/`, 2026-07-18 — no HIGH
findings), remediated by TRIAGE-01..06 on PRs
[#11](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/11)–[#16](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/16),
merged 2026-07-20, and code review v3 (`.review/CODE_REVIEW_CODEX_v1_20260724T0002Z/`, Codex
GPT-5, 2026-07-24 — one HIGH, since resolved), remediated by CODEX-01..10 on PRs
[#19](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/19)–[#27](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/27),
merged 2026-07-28/29

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

None. Risks #2–#4 (code review v1) resolved 2026-07-17; review v2 Risk #1 resolved 2026-07-20 —
see Resolved Risks below.

### LOW Priority (Score: 0–9)

Risks #5–#8 (code review v1) resolved 2026-07-17; review v2 Risks #2–#6 resolved 2026-07-20 — see
Resolved Risks below. One LOW item remains open (unrelated recurring-maintenance item, not a
review finding):

#### Risk #1: Pinned-trio drift (Cypress / cucumber-preprocessor / esbuild-preprocessor) — Score: 5

**Priority Score:** Security Impact (1) + Breakage Probability (2) + Maintenance Burden (2) = **5 points**
**Impact:** Cypress releases have moved ahead of the preprocessor's peer cap — as of 28 July 2026 the latest is Cypress **15.19.0**, while `@badeball/cypress-cucumber-preprocessor@25.0.0` still caps its peer range at `>=15.0.0 <=15.17.0` (verified 28 July 2026). The trio is pinned at cypress 15.17.0 / preprocessor 25.0.0 / esbuild-preprocessor 2.2.8 (esbuild peer `>=0.17.0`, installed 0.28.1) — all mutually compatible, `npm ls` reports no peer conflicts. An unconsidered Cypress bump past 15.17.0 breaks the build.
**Effort:** 1 hr per deliberate upgrade
**Status:** READY TO START (recurring maintenance, not a defect)
**Affected Stacks:** TypeScript/Cypress (single stack)

**Problem:**
Dependencies are exact-pinned by design (README pin table). The preprocessor's Cypress peer
range (currently `^12 || ^13 || ^14 || >=15.0.0 <=15.17.0`) moves later than Cypress releases, so
upgrades must check the peer range first. The CODEX-04 audit overrides (`brace-expansion`,
`postcss`) touch only leaf packages and do not affect this trio.

**Refactor Strategy:**
On each deliberate upgrade: check `@badeball/cypress-cucumber-preprocessor` peer range, bump the
trio together, re-run all gates plus one live `@extended` run.

**Success Criteria:**
- [ ] Trio versions mutually compatible after any bump; gates green; README pin table updated.

---

### Resolved Risks

#### Code review v3 (Codex GPT-5) — CODEX-01..10 ✅ Resolved 2026-07-28/29

**Resolution:** All ten findings from `.review/CODE_REVIEW_CODEX_v1_20260724T0002Z/` remediated on
PRs #19–#27 (details per item in `WORKLIST_bfx-ws-screenplay.md`): **CODEX-01/02** — checksum
numeric-token contract (ADR-007) + deterministic exponent→plain-decimal serialiser; **CODEX-03** —
trade-starvation classified as environment-blocked (ADR-008), malformed/pairing/socket faults stay
loud; **CODEX-04** — two transitive HIGH advisories cleared (`brace-expansion` 5.0.8, `postcss`
8.5.24) + executable `audit:ci` gate (`docs/dependency-audit-policy.md`); **CODEX-05/06/07** —
conventional `node:test` unit suite (97 tests / 29 suites) with an ≥80 % branch-coverage floor over
the pure surface, language-neutral JSON fixtures, and an injected socket/clock seam for
deterministic driver-lifecycle tests; **CODEX-08** — exact `isBookChecksumFrame`/`isHeartbeatFrame`
guards (live SPEC-004/006 confirmed); **CODEX-09** — Node floor (20) vs CI baseline (24)
reconciled (ADR-009). `npm audit` = 0; the one HIGH (audit) and all MEDIUM/LOW findings are closed.
**See:** review v3 pack; PRs [#19](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/19)–[#27](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/27).

#### Risk #2 (review #1): Checksum string can diverge from the wire for exponent-notation magnitudes ✅ Resolved 2026-07-17

**Resolution:** `wireNumber()` guard added in `orderBook.ts`; `checksumString` routed through it;
throws a named `ChecksumSerializationError` on exponent-range magnitudes instead of silently
diverging from the wire. Pure unit check (`scripts/check-checksum-serialization.ts`, 5/5) covers
the exponent-range case (`1e-7`, `1e21`). Gates (typecheck/lint/test:smoke) green.
**See:** commit `db3ed18`, BFX-01, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #3 (review #2): Book-depth invariant relaxed (25 → 30) without an ADR change note ✅ Resolved 2026-07-17

**Resolution:** `docs/adr/ADR-006-book-depth-transient-overshoot-margin.md` added, documenting the
transient-overshoot rationale and the `<= 30` margin; cross-referenced from `SPECIFICATION.md`
SPEC-004.
**See:** commit `07e356f`, BFX-02, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #4 (review #3): `ws:send` reports success unconditionally; no socket-state guard ✅ Resolved 2026-07-17

**Resolution:** `driver.ts` `send()` now checks `readyState`; returns a new `SendResult` on a closed
socket; the ability rescans for blocking codes and throws `EnvironmentBlockedError`/
`ConfigurationError` as appropriate.
**See:** commit `fbdd451`, BFX-03, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #5 (review #4): Non-trivial invariant logic accumulating in the step-definition layer ✅ Resolved 2026-07-17

**Resolution:** Book-side invariants moved into `cypress/support/books/invariants.ts`; OHLC
invariants (`candlesRespectOhlcInvariants`) moved beside the candle schema; steps return to pure
delegation (ADR-003). Verified live via a targeted `@extended` run (SPEC-004/005, 7/7).
**See:** commit `f668a16`, BFX-04, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #6 (review #5): CI workflow lacks `timeout-minutes`, `concurrency`, and `permissions` ✅ Resolved 2026-07-17

**Resolution:** `ci.yml` gained workflow-level `permissions: contents: read`, `timeout-minutes`
(15 smoke / 30 extended), and a `concurrency` group with `cancel-in-progress: true` on the
push-triggered `smoke` job. CI run green.
**See:** commit `ce52585`, BFX-05, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #7 (review #6): `conf` acknowledgement validated inline, bypassing the schema catalogue ✅ Resolved 2026-07-17

**Resolution:** `cypress/schemas/confEvent.ts` added (`isConfEvent` guard, verified against live
Bitfinex docs); `EnableChecksumFrames` now validates the ack via the guard. Verified live via a
targeted `@extended` SPEC-004 run (4/4).
**See:** commit `4777b54`, BFX-06, PR #9, merged 2026-07-17 (`3247130`).

#### Risk #8 (review #7): Assertion failure messages stringify `Map`-based books to `{}` ✅ Resolved 2026-07-17

**Resolution:** Book Questions (`TheChannelSnapshot.ofTheBook`, `TheMaintainedBook.now`) now answer
the serialisable `sortedSides()` projection (plain arrays) instead of the raw `Map`-based
`MaintainedBook`, so a failed invariant's diagnostic prints the actual price levels. Demonstrated by
`scripts/check-book-diagnostics.ts` (2/2 checks: reproduces the historical `{}` defect, then proves
the fix).
**See:** commit `6099f91`, BFX-07, PR #9, merged 2026-07-17 (`3247130`).

#### Review v2 Risk #1: `unsubscribed`-ack shape unvalidated at both call sites ✅ Resolved 2026-07-20

**Resolution:** `cypress/schemas/unsubscribedAck.ts` added (`isUnsubscribedAck` guard, verified
against docs.bitfinex.com/docs/ws-general); wired into `TheUnsubscriptionConfirmation.status()`
(replacing an ad hoc cast) and `Unsubscribe.performAs()` (now fails fast with the raw frame if the
ack doesn't validate). Local `UnsubscribedAck` type and its dead re-export removed. Targeted
`@extended` SPEC-006 run 4/4 (live API).
**See:** commit `486339e`, TRIAGE-01, PR #11, merged 2026-07-20.

#### Review v2 Risk #2: `docs/backlog.md` described PR #9 as open, not yet merged ✅ Resolved 2026-07-20

**Resolution:** All 8 "open, not yet merged" occurrences plus 2 related "(PR #9, open)" mentions
replaced with the merged-commit reference (`3247130`, 2026-07-17).
**See:** commit `cfa4cf0`, TRIAGE-02, PR #12, merged 2026-07-20.

#### Review v2 Risk #3: ADR-006 cited a stale file location for `sidesPureAndOrdered` ✅ Resolved 2026-07-20

**Resolution:** Citation corrected from `cypress/support/step_definitions/spec-004.steps.ts` to
`cypress/support/books/invariants.ts` (the location BFX-04 moved it to).
**See:** commit `c7439f9`, TRIAGE-03, PR #13, merged 2026-07-20.

#### Review v2 Risk #4: `check-book-diagnostics.ts` had no npm script and neither pure-proof script ran in CI ✅ Resolved 2026-07-20

**Resolution:** Added `check:book-diagnostics` and a composite `check:pure` (runs both proof
scripts); wired into CI's `smoke` job between `lint` and `test:smoke`.
**See:** commit `540bdb2`, TRIAGE-04, PR #14, merged 2026-07-20.

#### Review v2 Risk #5: ADR-003 never drew the inline-predicate boundary ✅ Resolved 2026-07-20

**Resolution:** Added a sentence to ADR-003 stating single-expression predicates over
already-answered values may be inline in step files; anything with branching, iteration state, or
reuse moves to the schema/invariant modules.
**See:** commit `fc38de5`, TRIAGE-05, PR #15, merged 2026-07-20.

#### Review v2 Risk #6: `extended` CI job skipped static gates; fork-PR live-API implication undocumented ✅ Resolved 2026-07-20

**Resolution:** `extended` job now runs `typecheck`/`lint` before `test:extended`, matching
`smoke`'s ordering. README's Live-API etiquette section documents that a fork PR's `smoke` run
does exercise the live public Bitfinex API using this repo's Actions minutes pre-review, with no
credential exposure. Decision (user, 2026-07-19): document, don't restrict the `pull_request`
trigger.
**See:** commit `639f53e`, TRIAGE-06, PR #16, merged 2026-07-20.

#### CODEX-04: transitive HIGH audit findings + no executable audit policy ✅ Resolved 2026-07-28

**Resolution:** Two HIGH transitive dev-only DoS advisories remediated with the smallest
narrowly-reviewed override change — `brace-expansion` → `5.0.8` (the only version outside npm's
`<=5.0.7` vulnerable range; dual-package `require` export keeps mocha's CJS `minimatch@9` working)
and `postcss` → `8.5.24`, both leaf packages; the pinned trio is untouched. Added an **executable
audit gate**: `npm run audit:ci` (`npm audit --audit-level=high`) runs after `npm ci` in **both**
the `smoke` and `extended` CI jobs, failing the build on any unexcepted HIGH+. Policy, threshold,
and the owner/expiry exception protocol are documented in `docs/dependency-audit-policy.md`; the
README pin table and audit claim were reconciled and Risk #1's stale peer-range wording refreshed
(latest Cypress 15.19.0 vs the `<=15.17.0` cap). `npm audit` = **0 vulnerabilities**; gates
(typecheck/lint/check:pure/test:smoke) green. The trio did not change, so no live `@extended`
re-validation was required.
**See:** Codex review v1 Risk #2 / Recommendation P1; branch `worklist/codex-04-audit-dependency-policy`.

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
| LOW (0–9) | 1 | ~1 hr per deliberate upgrade | READY TO START (Risk #1 pinned-trio drift — recurring maintenance, unrelated to any review) |
| **Total Outstanding** | **1** | recurring | |
| Resolved | 24 | | 7 via PR #9 (review v1) + 6 via PRs #11–#16 (review v2) + 10 via PRs #19–#27 (review v3, CODEX-01..10) + 1 prior |

---

## SPEC Roadmap (the project's migration plan)

**Status:** ✅ COMPLETE — SPEC-001 → 006 all done and merged 2026-07-04/06, and hardened through
three code-review cycles (v1, v2, v3 = Codex GPT-5 / CODEX-01..10, all merged by 2026-07-29).
SPEC-007 stretch **remains deferred** — disposition recorded 2026-07-29 (`SPECIFICATION.md`
Section 11): not separately approved, not scheduled.

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
7. **SPEC-007 — Sequencing** — STRETCH, **deferred** (disposition recorded 2026-07-29; not approved, not scheduled)

**Success Criteria:**
- [x] SPEC-002 → 006 complete, each with three consecutive green runs local + CI
- [x] Quiet-pair symbol selected against the documented criterion (`tZECBTC`, SPEC-006), recorded
      in `cypress/support/config/index.ts`
- [x] SPEC-007 decision recorded (2026-07-29): remains a deferred stretch item, not separately approved

---

## Potential Next Steps

### LOW Priority

1. **Node engines floor** — ✅ RESOLVED 2026-07-29 (CODEX-09 / `docs/adr/ADR-009-node-support-baseline.md`):
   minimum Node 20 (`engines >=20`, a checked support promise) with the dev/CI baseline on Node 24.
   Revisit (tighten the floor to ≥22.8+) only when Node 20 leaves maintenance, which would let the
   branch-coverage gate run everywhere.

---

## Sprint Planning Summary

| Sprint | Priority | Items | Total Effort | Start | End |
|---|---|---|---|---|---|
| Done | HIGH | SPEC-002..006 (full in-scope roadmap) | ~13 hrs actual | 2026-07-04 | 2026-07-06 |
| Done | MEDIUM+LOW | Review v1 findings: Risks #2–#8 (BFX-01..07, PR #9, merged) | ~5.5 hrs | 2026-07-17 | 2026-07-17 |
| Done | MEDIUM+LOW | Review v2 findings: Risks #1–#6 (TRIAGE-01..06, PRs #11–#16, merged) | ~2 hrs | 2026-07-20 | 2026-07-20 |
| Done | HIGH+MEDIUM+LOW | Review v3 (Codex GPT-5): CODEX-01..10 (PRs #19–#27, merged) | ~10 hrs | 2026-07-28 | 2026-07-29 |
| Later | — | SPEC-007 stretch (deferred, disposition recorded 2026-07-29); Risk #1 pinned-trio maintenance (recurring) | — | TBD | TBD |

---

## Maintenance Notes

- Include links/paths to affected files when adding new items
- Update version number at top when items change status
- Cross-reference code review findings in `.review/` — code review v1
  (`CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`) triaged into Risks #2–#8; code review v2
  (`CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z/`) triaged into review v2 Risks #1–#6
- Mark completion dates when items move to ✅ Resolved
- The design spec (`SPECIFICATION.md`) is normative — backlog items never override it; deviations
  need an ADR change note in `docs/adr/` first
