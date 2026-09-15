<!--
  AUDIENCE: Engineers, AI agents, and project leads maintaining work-in-progress tracking.
  PURPOSE:  Single source of truth for outstanding work, risks, and the SPEC roadmap
            for this project.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted for a fresh SDD project)
-->

# bfx-ws-screenplay — Backlog

**Version:** 17 — pinned-trio compatibility reviewed and held at the Node 20 support boundary; DEP-01 resolved and LIVE-01 remains open (2026-09-15)
**Last Updated:** 2026-09-15
**Based on:** `SPECIFICATION.md` (normative design spec), the SPEC-001..006 review packs (approved
4–5 July 2026), code review v1 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`,
2026-07-06 — no HIGH findings), remediated by BFX-01..07 on
[PR #9](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/9), merged 2026-07-17 (`3247130`),
code review v2 (`.review/CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z/`, 2026-07-18 — no HIGH
findings), remediated by TRIAGE-01..06 on PRs
[#11](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/11)–[#16](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/16),
merged 2026-07-20, and code review v3 (`.review/CODE_REVIEW_CODEX_v1_20260724T0002Z/`, Codex
GPT-5, 2026-07-24 — one HIGH, since resolved), remediated by CODEX-01..10 on PRs
[#19](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/19)–[#28](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/28),
merged 2026-07-28/29; subsequent dependency-maintenance PRs #34, #38, #39 and #41; Kanban
publication PR #40; and default-branch CI evidence through scheduled run #34921756136 (2026-09-15)

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

One current live-regression finding is open. Risks #2–#4 (code review v1) resolved 2026-07-17;
review v2 Risk #1 resolved 2026-07-20 — see Resolved Risks below.

#### Risk LIVE-01: Intermittent order-book checksum divergence in the nightly extended suite — Score: 10

**Priority Score:** Security Impact (0) + Breakage Probability (6) + Maintenance Burden (4) = **10 points**
**Impact:** Scheduled default-branch CI run
[#34667985630](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34667985630)
failed SPEC-004 on 12 September 2026: two of the first five platform checksum frames diverged from
the locally maintained order book, followed by three matches. The remaining 22 of 23 extended
scenarios passed. ADR-010 correctly classified the outcome as one product failure and zero
environment-blocked outcomes, so this is not eligible for the quiet-window pass-through.
**Effort:** Unknown until the frame-ordering and book-fold root cause is reproduced
**Status:** NEEDS INVESTIGATION (latest two default-branch nightlies green; intermittent failure unresolved)
**Affected Stacks:** TypeScript/Cypress live Bitfinex WebSocket lane (SPEC-004)

**Update (2026-09-12):** The same `main` SHA (`e2406b0`) passed the preceding scheduled extended run
[#34555150107](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34555150107)
on 11 September 2026. The isolated red run therefore proves an intermittent live-path failure, but
does not yet establish whether the cause is product logic, frame sequencing, or an upstream feed
condition.

**Update (2026-09-15):** Scheduled run
[#34733362800](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34733362800)
failed one checksum at buffer index 28 before four matches; runs
[#34799874514](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34799874514) and
[#34921756136](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34921756136) then passed.
The five-night sequence is therefore pass/fail/fail/pass/pass. Both retained failure artefacts were
inspected: they contain Cucumber JSON/HTML/messages only, with no raw-frame attachments, so they
confirm the checksum indices and recovery but cannot establish root cause. Mismatch-only diagnostics
now capture the snapshot index/size, update count, last five preceding mutations and exact local
top-25 checksum input at each failed checksum index; deterministic tests cover the bounded output.

**Problem:**
The flagship checksum assertion promises five consecutive matches after folding every buffered book
frame up to the corresponding checksum index. A run that mismatches early frames and then recovers
can indicate a race or ordering gap; treating it as environment-blocked, weakening the consecutive
requirement, or blindly retrying would hide the evidence.

**Refactor Strategy:**
Use the new bounded mismatch evidence from a future recurrence to compare the snapshot, preceding
mutations and exact local checksum input at each mismatch. Fix only after the root cause is
established. If the documented protocol contract changes, follow the SDD route and record an ADR
change note before framework code.

**Success Criteria:**
- [ ] Root cause is evidenced from the retained report/frame diagnostics; any code or contract change
      preserves exact checksum comparison and keeps product failures distinct from environment blocks.
- [ ] Deterministic coverage protects the identified failure mode, and targeted SPEC-004 plus the
      project gates pass without fixed sleeps or blind retries.
- [x] Retained failure artefacts inspected; because they contain no raw frames, bounded mismatch
      diagnostics and deterministic coverage added without weakening the five-match contract.

---

### LOW Priority (Score: 0–9)

Risks #5–#8 (code review v1) resolved 2026-07-17; review v2 Risks #2–#6 resolved 2026-07-20 — see
Resolved Risks below. One LOW maintenance item remains open; it is not a review finding:

#### Risk #1: Pinned-trio drift (Cypress / cucumber-preprocessor / esbuild-preprocessor) — Score: 5

**Priority Score:** Security Impact (1) + Breakage Probability (2) + Maintenance Burden (2) = **5 points**
**Impact:** The installed trio remains mutually compatible at Cypress 15.17.0 /
`@badeball/cypress-cucumber-preprocessor@25.0.0` / esbuild-preprocessor 2.2.8, but it is now a
deliberately old major set. Verified 12 September 2026: Cypress **16.0.0** and cucumber-preprocessor
**28.0.0** are current, and preprocessor 28 supports Cypress 16; the installed preprocessor 25
still caps Cypress at `>=15.0.0 <=15.17.0`. Esbuild-preprocessor 2.2.8 remains current, with an
`esbuild >=0.17.0` peer (installed 0.28.1; current 0.28.2). An isolated Cypress bump past 15.17.0
breaks the installed peer contract. A coordinated move also crosses the project's supported-runtime
boundary: Cypress 16 requires Node `^22 || ^24 || >=26`, while ADR-009 and `package.json#engines`
make Node 20 a checked support promise.
**Effort:** 1 hr per deliberate upgrade
**Status:** NEEDS DECISION (raising the Node floor is outside routine dependency maintenance)
**Affected Stacks:** TypeScript/Cypress (single stack)

**Update (2026-09-15):** Registry metadata confirms cucumber-preprocessor 28 accepts Cypress 16
and esbuild-preprocessor 2.2.8 accepts esbuild `>=0.17.0`, so candidate peer compatibility is not
the blocker. The upgrade was deliberately not installed because doing so would make the declared
Node 20 floor false. Proceed only after an explicit Node support-floor decision and corresponding
ADR-009/declaration reconciliation.

**Problem:**
Dependencies are exact-pinned by design (README pin table). The preprocessor's Cypress peer
range (currently `^12 || ^13 || ^14 || >=15.0.0 <=15.17.0`) moves later than Cypress releases, so
upgrades must check the peer range first. The CODEX-04 audit overrides (`brace-expansion`,
`postcss`) touch only leaf packages and do not affect this trio.

**Refactor Strategy:**
First decide whether to retire Node 20 support. If approved, reconcile ADR-009, `package.json#engines`
and user-facing runtime declarations; then bump Cypress/cucumber-preprocessor together, update the
compatible esbuild pin, and re-run all gates plus one live `@extended` run.

**Success Criteria:**
- [ ] Node support-floor decision is explicit and ADR-009/declarations remain truthful.
- [ ] Trio versions mutually compatible after any bump; gates green; README pin table updated.

---

---

### Resolved Risks

#### Risk DEP-01: `qs` moderate advisories below the HIGH audit threshold ✅ Resolved 2026-09-15

**Resolution:** The existing supported path `cypress@15.17.0 → @cypress/request@4.0.1 →
qs@^6.15.2` now resolves `qs@6.16.0` through `package-lock.json`; no override, direct dependency or
toolchain change was required. This clears GHSA-x5fp-wj9c-mxmx and GHSA-4mjr-xmp4-gh2g. A fresh
`npm ci` plus `npm ls qs` proved the path; `npm audit` and `npm run audit:ci` both reported zero
vulnerabilities. Typecheck, lint, deterministic unit coverage (124/124) and live smoke (8/8) passed.
**See:** `package-lock.json`; `docs/dependency-audit-policy.md`.

#### `js-yaml` High-severity advisories (GHSA-5p4m-2wfm-xmqj / GHSA-2883-xcg3-v3hh) ✅ Resolved 2026-09-10

**Resolution:** PR #34 (`22c56d7`) introduced root npm override `"js-yaml": "^4.3.1"` for
CVE-2026-59870 / GHSA-5p4m-2wfm-xmqj. When GHSA-2883-xcg3-v3hh later made 4.3.1 vulnerable,
PR #41 (`0080091`) raised the override to `^4.3.2`, the first release outside the affected range.
The pinned Cypress/preprocessor/esbuild trio did not change. Post-merge `main` CI run #34532572264
passed `audit:ci`, typecheck, lint, unit coverage and live smoke.
**See:** commits `22c56d7` and `0080091`; PRs #34 and #41; `docs/dependency-audit-policy.md`.

#### Risk DEP-NA-01: `nanoid` transitive HIGH advisory (GHSA-2v37-7h3g-55p8) ✅ Resolved 2026-08-08

**Resolution:** Root override `"nanoid": "^3.3.18"` and the corresponding lockfile update cleared
the HIGH advisory without changing the pinned toolchain trio. Merged via PR #38 (`941e732`).
**See:** commit `941e732`, PR #38.

#### Risk DEP-BL-01: `browserslist` HIGH advisories (GHSA-c83g-rgw3-j3cx / GHSA-73wf-gq98-2v4g) ✅ Resolved 2026-09-03

**Resolution:** Root override `"browserslist": "^4.28.8"` cleared the unbounded-memory-growth and
prototype-write advisories in the preprocessor dependency path. Merged via PR #39 (`56c27a4`);
post-merge `main` CI run #33747218851 passed.
**See:** commit `56c27a4`, PR #39; `docs/dependency-audit-policy.md`.

**Resolution:** All ten findings from `.review/CODE_REVIEW_CODEX_v1_20260724T0002Z/` remediated on
PRs #19–#28 (details per item in `WORKLIST_bfx-ws-screenplay.md`): **CODEX-01/02** — checksum
numeric-token contract (ADR-007) + deterministic exponent→plain-decimal serialiser; **CODEX-03** —
trade-starvation classified as environment-blocked (ADR-008), malformed/pairing/socket faults stay
loud; **CODEX-04** — two transitive HIGH advisories cleared (`brace-expansion` 5.0.8, `postcss`
8.5.24) + executable `audit:ci` gate (`docs/dependency-audit-policy.md`); **CODEX-05/06/07** —
conventional `node:test` unit suite (97 tests / 29 suites) with an ≥80 % branch-coverage floor over
the pure surface, language-neutral JSON fixtures, and an injected socket/clock seam for
deterministic driver-lifecycle tests; **CODEX-08** — exact `isBookChecksumFrame`/`isHeartbeatFrame`
guards (live SPEC-004/006 confirmed); **CODEX-09** — Node floor (20) vs CI baseline (24)
reconciled (ADR-009). `npm audit` = 0; the one HIGH (audit) and all MEDIUM/LOW findings are closed.
**See:** review v3 pack; PRs [#19](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/19)–[#28](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/28).

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

## Operational Delivery Updates

**Update (2026-09-10):** PR #40 (`e2406b0`) published
`bfx-ws-screenplay_implementation-kanban_v1.html`, generated from this backlog with the pinned
`portfolio-kanban-generator@1.2.0`. `npm run lint:kanban` now drift-gates the committed board in CI;
`npm run kanban:sync` regenerates it deliberately. The gate was proved in both directions before
merge. GitHub Pages run #34532908859 succeeded, and the board is live at
<https://gbrooks1970.github.io/bfx-ws-screenplay/>.

**Update (2026-09-12):** This v14 reconciliation adds two open findings and records three subsequent
dependency remediations; the generated board was refreshed in the same change and passed
`npm run lint:kanban` before review.

**Update (2026-09-15):** The retained LIVE-01 artefacts lacked raw-frame diagnostics, so the open
risk now records the bounded evidence added for the next recurrence. The exact five-consecutive-match
contract and product-failure classification are unchanged.

**Update (2026-09-15):** DEP-01 was resolved without an override: the existing
`@cypress/request@4.0.1` range admits patched `qs@6.16.0`, so only the lockfile changed. The audit
is clean and the exact-pinned Cypress toolchain remained untouched in this maintenance phase.

**Update (2026-09-15):** The Cypress 16/preprocessor 28 peer pair is compatible, but Cypress 16 no
longer supports the project's promised Node 20 floor. Risk #1 therefore remains open pending an
explicit runtime-support decision; no incompatible peer install or undeclared floor change was made.

---

## Risk Summary

| Priority | Count | Total Effort | Status Distribution |
|---|---|---|---|
| HIGH (20–30) | 0 | — | — |
| MEDIUM (10–19) | 1 | investigation unestimated | NEEDS INVESTIGATION (LIVE-01 — intermittent SPEC-004 failure; latest two nightlies green) |
| LOW (0–9) | 1 | ~1 hr per maintenance action | NEEDS DECISION (Risk #1 — Cypress 16 requires retiring Node 20 support) |
| **Total Outstanding** | **2** | one investigation + recurring maintenance | |
| Resolved | 29 | | 7 via PR #9 + 6 via PRs #11–#16 + 10 via PRs #19–#28 + 1 prior + 5 post-review dependency remediations |

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
| Done | HIGH+MEDIUM+LOW | Review v3 (Codex GPT-5): CODEX-01..10 (PRs #19–#28, merged) | ~10 hrs | 2026-07-28 | 2026-07-29 |
| Next | MEDIUM | LIVE-01 intermittent SPEC-004 checksum divergence | unestimated | TBD | TBD |
| Later | LOW | Risk #1 pinned-trio maintenance (recurring); SPEC-007 stretch remains deferred | recurring | TBD | TBD |

---

## Maintenance Notes

- Include links/paths to affected files when adding new items
- Update version number at top when items change status
- Cross-reference code review findings in `.review/` — code review v1
  (`CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/`) triaged into Risks #2–#8; code review v2
  (`CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z/`) triaged into review v2 Risks #1–#6
- Mark completion dates when items move to ✅ Resolved
- Regenerate `bfx-ws-screenplay_implementation-kanban_v1.html` with `npm run kanban:sync` whenever
  risk state changes, then prove parity with `npm run lint:kanban`
- The design spec (`SPECIFICATION.md`) is normative — backlog items never override it; deviations
  need an ADR change note in `docs/adr/` first
