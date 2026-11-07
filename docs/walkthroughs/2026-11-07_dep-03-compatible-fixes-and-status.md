# Walkthrough — BFX compatible dependency repairs and status reconciliation

## Executive Summary

Two compatible transitive fixes reduce the current audit to 19 moderate affected packages with zero low, high or critical findings. DEP-02 publication is reconciled as resolved; LIVE-01, residual DEP-03 chains and the Node-floor decision remain open. Static and deterministic checks pass; local smoke stalled before producing results, so exact-head PR CI remains the browser acceptance gate at authorship.

## 1. Changes Implemented

- [package-lock.json](C:/Users/brook/.codex/tmp/bfx-status-20261107/package-lock.json) — Resolves only qs 6.17.1 and serialize-javascript 7.1.4 inside existing ranges.
- [README.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/README.md) — States the current versions and measured residual audit.
- [docs/backlog.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/backlog.md) — Moves merged DEP-02 to resolved, records published diagnostics, retains three open risks.
- [docs/dependency-audit-policy.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/dependency-audit-policy.md) — Records all 19 affected package entries and the two residual advisory roots.
- [docs/implementation-plans/_index.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/implementation-plans/_index.md) — Corrects publication and current plan state.
- [docs/implementation-plans/2026-11-07_dep-03-compatible-fixes-and-status.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/implementation-plans/2026-11-07_dep-03-compatible-fixes-and-status.md) — Records the pre-edit plan and measured outcome.
- [bfx-ws-screenplay_implementation-kanban_v1.html](C:/Users/brook/.codex/tmp/bfx-status-20261107/bfx-ws-screenplay_implementation-kanban_v1.html) — Regenerated from backlog v20; 23 cards, 20 Done.
- [docs/implementation-logs/2026-11-07_dep-03-compatible-fixes-and-status.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/implementation-logs/2026-11-07_dep-03-compatible-fixes-and-status.md) — Records this implementation and its verification limits.
- [docs/walkthroughs/2026-11-07_dep-03-compatible-fixes-and-status.md](C:/Users/brook/.codex/tmp/bfx-status-20261107/docs/walkthroughs/2026-11-07_dep-03-compatible-fixes-and-status.md) — Preserves the batch verification record.

## 2. Verification & Test Evidence

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

Captured output:

```text
19 moderate severity vulnerabilities
ℹ tests 130
ℹ pass 130
ℹ fail 0
ℹ duration_ms 1960.4198
kanban: in sync — 23 ticket(s), 2 Backlog / 1 In Progress / 20 Done.
```

## 3. Operational State & Invariants

Branch `codex/bfx-status-resolution-20261107` starts at `7ff0666`. This record precedes its commit/PR; the shared handover records subsequent publication and clean/synchronised state. Primary main remains untouched. No Docker operation ran locally; configured storage remains E:/_DockerData. Node >=20, direct pins, HIGH audit threshold, five-match checksum assertion and ADR-010 classification remain unchanged.

## 4. Recommended Next Actions

1. Verify exact-head PR CI smoke before owner merge, then exact-main CI and the filtered Pages publication.
2. Keep all three unresolved risks visible. Capture causal LIVE-01 evidence on recurrence and assess supported parent dependency updates.
