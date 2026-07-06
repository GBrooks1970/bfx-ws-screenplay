<!--
  AUDIENCE: Engineers, AI agents, and project leads maintaining work-in-progress tracking.
  PURPOSE:  Single source of truth for outstanding work, risks, and the SPEC roadmap
            for this project.
  LOCATION: docs/backlog.md
  TEMPLATE: portfolio templates/backlog.template.md (adapted for a fresh SDD project)
-->

# bfx-ws-screenplay — Backlog

**Version:** 5 — SPEC-006 complete: the full in-scope roadmap (SPEC-001..006) is done
**Last Updated:** 2026-07-05
**Based on:** `SPECIFICATION.md` (normative design spec) and the SPEC-001..006 review packs (approved 4–5 July 2026)

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

None.

### LOW Priority (Score: 0–9)

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
| MEDIUM (10–19) | 0 | — | — |
| LOW (0–9) | 1 | 1 hr per upgrade | recurring |
| **Total Outstanding** | **1** | | |
| Resolved | 1 | | |

---

## SPEC Roadmap (the project's migration plan)

**Status:** IN PROGRESS — mandatory order SPEC-001 → 006; SPEC-007 stretch (out of initial scope,
confirmed 4 July 2026, `SPECIFICATION.md` Section 11).

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
- [ ] SPEC-002 → 006 complete, each with three consecutive green runs local + CI
- [ ] Quiet-pair symbol selected against the documented criterion when heartbeat scenarios first
      arrive, recorded in `cypress/support/config/index.ts`
- [ ] SPEC-007 decision revisited after SPEC-006

---

## Potential Next Steps

### LOW Priority

1. **Node engines floor** — 0.5 hr, OPEN QUESTION: `engines` is `>=20` (local dev machine runs
   Node 20.19.5) while `.nvmrc`/CI pin 24; tighten to `>=24` only if local tooling moves.

---

## Sprint Planning Summary

| Sprint | Priority | Items | Total Effort | Start | End |
|---|---|---|---|---|---|
| Done | HIGH | SPEC-002..006 (full in-scope roadmap) | ~13 hrs actual | 2026-07-04 | 2026-07-05 |
| Next | LOW | SPEC-007 stretch decision; first session-notes handover | 1–4 hrs | TBD | TBD |

---

## Maintenance Notes

- Include links/paths to affected files when adding new items
- Update version number at top when items change status
- Cross-reference code review findings in `.review/` (none yet)
- Mark completion dates when items move to ✅ Resolved
- The design spec (`SPECIFICATION.md`) is normative — backlog items never override it; deviations
  need an ADR change note in `docs/adr/` first
