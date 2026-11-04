# DEP-02 compatible HIGH audit remediation — 2026-11-04

## Session Summary

Implemented the approved Action 1 plan without moving the exact direct dependency pins or declared Node floor. All four HIGH findings are cleared; 21 MODERATE and one LOW affected package entries remain and are tracked separately as DEP-03. Local deterministic and live gates pass; owner-reviewed publication is pending.

## Objectives

1. ✅ Clear four HIGH packages using compatible transitive updates.
2. ✅ Verify Node 24 and Node 20 compatibility and one smoke/extended observation.
3. ✅ Reconcile policy, backlog and generated board; preserve LIVE-01 as unresolved.
4. ⏸️ Owner merge and exact-main CI after the separate project/support PRs.

## Test Results

| Gate | Result | Captured evidence |
|---|---|---|
| Original audit negative control | FAIL as expected | 4 HIGH / 21 MODERATE / 1 LOW; exit 1 |
| Clean npm ci | PASS | 607 packages installed, 608 audited; npm reported about 1 hour including Cypress postinstall |
| Updated audit:ci | PASS, exit 0 | 0 HIGH/CRITICAL; 21 MODERATE / 1 LOW remain |
| Node 24.18.0 typecheck/lint | PASS | Both exit 0 |
| Node 24 unit coverage | PASS | 124/124, 35 suites, 1.326 s; branch coverage 93.96% |
| Node 20.19.5 typecheck/lint | PASS | Both exit 0 |
| Node 20 unit | PASS | 124/124, 35 suites, 0.966 s |
| Live smoke | PASS | 8/8 in 12 s; one run |
| Live extended | PASS | 23/23 in 71 s; one run; SPEC-004 4/4 |
| Kanban sync/check | PASS | 23 cards: 2 Backlog, 1 Ready, 1 In Progress, 19 Done |

Raw local audit/log/report captures: `C:\Users\brook\AppData\Local\Temp\bfx-dep02-execution-20261103`. Commands and counts above are empirical; these local results do not assert merged CI success. Full audit still exits 1 because residual findings exist; the HIGH threshold gate exits 0.

## Changes Implemented

### Compatible dependency graph

`package.json` raises only the existing brace-expansion override floor to `^5.0.12`. npm updates four lock entries: brace-expansion 5.0.12, source-map-js 1.2.2, systeminformation 5.33.19 and undici 6.29.1. systeminformation resolved above the plan's minimum 5.33.16 within the existing parent range. No fresh override, direct-pin change or workflow edit.

### Durable state

Backlog v18 records DEP-02 locally validated/pending publication and DEP-03 residual triage. Policy/README no longer present September's zero-finding audit as current. The generated board reflects the backlog.

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Target four packages only | Existing supported ranges permit remediation | Forced blanket fix or Cypress major migration |
| Keep residual findings explicit | Passing HIGH gate does not mean zero findings | Lowering severity or silently accepting risk |
| Leave LIVE-01 open | One green extended run cannot explain an intermittent historical failure | Closing on non-reproduction |

No new architecture ADR was required.

## Documentation Updates

`docs/backlog.md`, `docs/dependency-audit-policy.md`, `README.md`, the DEP-02 plan outcome/index, this log and generated `bfx-ws-screenplay_implementation-kanban_v1.html`. A separate portfolio-root handover v7 records Action 1; Action 5 gets its own later handover.

## Lessons Learned

A supported transitive refresh can repair the audit gate without changing the framework. Keep audit threshold results, residual counts, live outcomes and publication evidence separate.

## Recommendations / Next Steps

- [ ] Owner review/merge DEP-02 project and support PRs, then verify exact-main CI and clean merged branches.
- [ ] Continue approved LIVE-01 evidence/replay work on its own branch; do not weaken assertions.
- [ ] DEP-03: assess residual supported parent upgrades separately; Risk #1 retains the Node-floor decision.

*Session logged: 2026-11-04. Author: Codex.*
