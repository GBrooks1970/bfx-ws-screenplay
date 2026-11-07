# DEP-03 compatible fixes and status reconciliation — 2026-11-07

## Session Summary

Applied two compatible transitive dependency repairs and reconciled the backlog with actual merged delivery. Baseline `7ff06660c0018b2258d343412657b9d3a014b511`; review branch `codex/bfx-status-resolution-20261107`. Three risks remain open; this does not claim resolution of LIVE-01 or all audit findings.

## Objectives

1. Complete: verify DEP-02 PR #45 merge `ee856a1` and exact-main CI #41821470848; verify diagnostics PR #46 merge `7ff0666` and CI #41821894699.
2. Complete: update qs and serialize-javascript within existing ranges, preserving the manifest and support contracts.
3. Complete: reconcile backlog, generated board and current audit policy.
4. Partial: deterministic/static gates pass; the stalled local smoke run requires exact-head PR CI acceptance.

## Test Results

| Command | Result | Wall time |
|---|---|---:|
| npm audit --json | exit 1: 19 MODERATE, 0 LOW/HIGH/CRITICAL | 7.200s |
| npm run audit:ci | exit 0; HIGH gate retained | 8.117s |
| npm run typecheck | exit 0 | 5.420s |
| npm run lint | exit 0 | 11.038s |
| npm run test:unit:coverage | 130/130 passed, 0 failed; 94.03% branches | 4.039s |
| Node 20.19.5 --import tsx --test test/unit/_all.test.ts | 130/130 passed, 0 failed | 2.330s |
| Node 20.19.5 node_modules/typescript/bin/tsc --noEmit | exit 0 | 4.560s |
| npm run lint:kanban | in sync: 23 cards, 2 Backlog / 1 In Progress / 20 Done | Not captured |
| npm run test:smoke | Stopped without scenario output; local browser acceptance unverified | 222.154s |

The Node 24 runner reports 1960.4198ms for 130 tests; Node 20 reports 2025.2443ms. Coverage is 96.91% lines, 94.03% branches and 92.68% functions. Existing corrupt/missing-frame and malformed/truncated-replay negative controls remain unchanged. No baseline unit rerun was needed for this lockfile-only change.

Clean installation added 607 packages in npm's reported 1m. The first install stalled in Cypress postinstall and was cancelled; the successful clean install used command-local CYPRESS_INSTALL_BINARY=0 with the existing verified Cypress 15.17.0 cache. A subsequent smoke run still produced only its command header and no scenario results, so it was stopped after the measured interval above. This is not an ADR-010 environment-blocked test result. Linux PR CI is required before claiming browser acceptance; no full extended suite was dispatched.

Raw logs: C:/Users/brook/.codex/tmp/status-evidence-20261107/bfx-*.log, bfx-results.json and bfx-extra-results.json.

## Changes Implemented

- `package-lock.json` — Resolves only qs 6.17.1 and serialize-javascript 7.1.4 inside existing ranges.
- `README.md` — States the current versions and measured residual audit.
- `docs/backlog.md` — Moves merged DEP-02 to resolved, records published diagnostics, retains three open risks.
- `docs/dependency-audit-policy.md` — Records all 19 affected package entries and the two residual advisory roots.
- `docs/implementation-plans/_index.md` — Corrects publication and current plan state.
- `docs/implementation-plans/2026-11-07_dep-03-compatible-fixes-and-status.md` — Records the pre-edit plan and measured outcome.
- `bfx-ws-screenplay_implementation-kanban_v1.html` — Regenerated from backlog v20; 23 cards, 20 Done.
- `docs/implementation-logs/2026-11-07_dep-03-compatible-fixes-and-status.md` — Records this implementation and its verification limits.
- `docs/walkthroughs/2026-11-07_dep-03-compatible-fixes-and-status.md` — Preserves the batch verification record.

## Technical Decisions

| Decision | Rationale | Alternative not taken |
|---|---|---|
| Keep only compatible leaf resolutions | Existing ranges admit both patched versions | Forced framework downgrade or broad major migration |
| Preserve Node >=20 and exact trio pins | Current support promise and peer ceiling still apply | Unapproved Node-floor change |
| Keep LIVE-01 open | Successful schedules do not establish a checksum cause | Claiming absence of recurrence proves a repair |

Residual root ranges are glob >=9.0.0 <=14.0.1 and minimatch >=7.0.0 <11.0.1. Installed parents still request glob ^13/^10 and minimatch ^9/^10. npm's suggested preprocessor 15.1.4 is a major downgrade, so a supported parent migration needs separate assessment. The HIGH threshold and zero exceptions remain unchanged.

## Documentation Updates

All documentation paths are listed above. Prior dated implementation logs, walkthroughs and plan bodies are preserved. A new shared handover will record the subsequent PR outcome separately.

## Lessons Learned

A merged repair can remain incorrectly open when handovers and backlog lag publication. Audit counts include dependent package entries and vary across advisory snapshots. A stalled browser launch has no scenario verdict and must never be reported as a green suite.

## Recommendations / Next Steps

- Owner review and merge after exact-head PR CI, followed by exact-main CI and board publication verification.
- DEP-03: reassess supported parent fixes; coordinate any runtime migration with Risk #1.
- LIVE-01: retain bounded diagnostics and act on causal evidence from a real recurrence.

Session logged: 2026-11-07. Author: Codex.
