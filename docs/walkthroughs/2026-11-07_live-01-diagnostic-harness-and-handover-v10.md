# Walkthrough — BFX LIVE-01 Out-of-Band Diagnostic Harness & Handover v10

## Executive Summary

Delivered the approved Issue 5 work for `bfx-ws-screenplay`:
1. Reconciled post-merge default-branch delivery for PR #48 (commit `20c0605`) in portfolio root Handover v10 (`session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.md` and companion `.html`), rebuilt via `build-handover-manifest.py`.
2. Authored the out-of-band diagnostic probe script `scripts/diagnose-orderbook-checksum.ts` (npm script `diagnose:checksum`) combining `CHECKSUM` (131072) and `SEQ_ALL` (65536) flags to isolate raw wire tokens and monitor sequence monotonicity without touching production Cucumber schemas.
3. Added deterministic unit tests `test/unit/diagnose-checksum.test.ts`. All 141 tests pass across 39 suites with 94.03% branch coverage.
4. Preserved the flagship SPEC-004 5-consecutive-match requirement and ADR-010 classification; Risk LIVE-01 remains open at Score 10 pending captured causal evidence.

## 1. Changes Implemented

- [`session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.md`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.md) — Portfolio Handover v10 recording PR #48 merge `20c0605`, audit status (0 HIGH/CRITICAL/LOW, 19 MODERATE), and LIVE-01 diagnostic state.
- [`session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.html`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.html) — P-09 companion HTML pairing for Handover v10.
- [`session-notes/manifest.json`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/session-notes/manifest.json) — Updated handover registry registering Handover v10.
- [`bfx-ws-screenplay/scripts/diagnose-orderbook-checksum.ts`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/scripts/diagnose-orderbook-checksum.ts) — Standalone diagnostic tool subscribing with combined flags 196608 (`CHECKSUM` 131072 | `SEQ_ALL` 65536) to check sequence monotonicity and raw wire tokens.
- [`bfx-ws-screenplay/package.json`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/package.json) — Registered npm script `"diagnose:checksum": "node --import tsx scripts/diagnose-orderbook-checksum.ts"`.
- [`bfx-ws-screenplay/test/unit/diagnose-checksum.test.ts`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/test/unit/diagnose-checksum.test.ts) — 11 deterministic unit tests covering sequence monotonicity checks, sequenced frame parsing, and book folding verification.
- [`bfx-ws-screenplay/docs/implementation-plans/2026-11-07_live-01-investigation-and-backlog-alignment.md`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/docs/implementation-plans/2026-11-07_live-01-investigation-and-backlog-alignment.md) — Approved implementation plan updated with delivery outcome.
- [`bfx-ws-screenplay/docs/implementation-plans/_index.md`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/docs/implementation-plans/_index.md) — Updated plan table with approval and delivery status.
- [`bfx-ws-screenplay/docs/backlog.md`](file:///d:/_CLAUDE_COWORK/PROJ001/claude-outputs/test-automation-portfolio/bfx-ws-screenplay/docs/backlog.md) — Added update note under Risk LIVE-01 for diagnostic harness delivery.

## 2. Verification & Test Evidence

| Command | Result | Metrics / Evidence |
|---|---|---|
| `python portfolio-prompts/tools/build-handover-manifest.py --check` | PASS | `build-handover-manifest: manifest.json is up to date; all handover pairs complete.` (140 handovers across 19 projects) |
| `npm run typecheck` | PASS | `tsc --noEmit` exited 0 with zero errors |
| `npm run lint` | PASS | `eslint .` exited 0 with zero warnings/errors |
| `npm run audit:ci` | PASS | `npm audit --audit-level=high` exited 0; 19 MODERATE vulnerabilities, 0 HIGH/CRITICAL |
| `npm run test:unit` | PASS | 141/141 passed, 39 suites, 0 failed, duration 711.8ms |
| `npm run test:unit:coverage` | PASS | 141/141 passed; all pure files: 97.03% lines, **94.03% branches** (floor ≥80%), 92.96% functions |
| `npm run lint:kanban` | PASS | `kanban: in sync — 23 ticket(s), 2 Backlog / 1 In Progress / 20 Done.` |

## 3. Operational State & Invariants

- **Flagship Contract:** The SPEC-004 requirement of 5 consecutive matching checksum frames is strictly unchanged and unloosened.
- **Classification:** ADR-010 failure vs environment-blocked classification remains unchanged.
- **Dependencies & Pins:** Node ≥20 floor and Cypress/preprocessor pinned trio (`cypress@15.17.0`, `@badeball/cypress-cucumber-preprocessor@25.0.0`, `@bahmutov/cypress-esbuild-preprocessor@2.2.8`) preserved.
- **Docker Storage:** Storage configuration intact on `E:\_DockerData`.

## 4. Next Actions

1. Monitor scheduled nightly CI runs (#42356953710+) with merged PR #46 replay diagnostics active.
2. In the event of a live checksum failure, extract `firstMismatch.replay` from the Cucumber report JSON and replay offline to identify the exact price-level mutation discrepancy.
3. If sequence-level anomalies or transport gaps are suspected under live market volatility, execute `npm run diagnose:checksum` out-of-band to capture real-time sequence monotonicity and raw wire tokens.
