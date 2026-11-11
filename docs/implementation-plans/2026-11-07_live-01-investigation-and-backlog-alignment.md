---
version: 1
created: 2026-11-07T17:30Z
project: bfx-ws-screenplay
type: implementation-plan
item: LIVE-01 / backlog-alignment
status: approved
approved: "2026-11-07, owner approved out-of-band diagnostic harness and handover reconciliation"
delivered: "2026-11-07, Handover v10 registered, diagnostic script and unit tests added"
language: en-GB
---

# Implementation plan: advance LIVE-01 investigation and reconcile post-merge status

**Goal.** Advance the root-cause investigation of Risk `LIVE-01` (intermittent order-book checksum divergence in the extended suite, Score 10) through bounded isolation harnesses and sequence verification without weakening the flagship 5-consecutive-match contract; and reconcile the portfolio backlog and handover records with the post-merge `main` state following PR #48 (commit `20c0605`).

## Evidence gathered before planning

Read-only investigation on 7 November 2026 inspected `bfx-ws-screenplay` repository state at `20c0605`, backlog v20, handover v9 (`session-notes/bfx-ws-screenplay_session-notes_v9_20261107T1457Z.md`), `session-notes/manifest.json`, the merged replay diagnostics in PR #46 (`7ff0666`), and the live Bitfinex WebSocket protocol documentation.

| Finding | Consequence for the plan |
|---|---|
| Historical failure [Run 34733362800](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34733362800) failed at buffer index 28 (expected `1151605136`, actual `1811877589`), followed by 4 consecutive matches at indexes 52, 74, 168, and 227. | The mismatch is transient and occurs early in the stream; the book subsequently synchronises. Root cause is not yet proven (hypotheses include snapshot/update concurrency race, dropped socket frame, or raw wire token formatting). |
| PR #46 merged bounded replay diagnostics (`checksumReplay.ts` and `attachChecksumReplay` in `ChecksumVerifications.ts`) at commit `7ff0666`. | When a live failure recurs, a compact `ChecksumReplay` envelope (≤5,000 frames, ≤1 MiB) is automatically captured in the Cucumber failure report. |
| Scheduled nightly runs #42002810757 (5 Nov), #42194820030 (6 Nov), and #42356953710 (7 Nov) all passed. | Passing workflow runs do not establish absence of the intermittent race condition (and may include ADR-010 environment blocks). LIVE-01 must remain OPEN. |
| PR #48 was merged by owner into `main` at `20c0605` on 7 Nov 16:51 UTC, applying compatible DEP-03 fixes (`qs` 6.17.1, `serialize-javascript` 7.1.4), updating `dependency-audit-policy.md` to 19 MODERATE (zero LOW/HIGH/CRITICAL), and setting backlog to v20. | Handover v9 (drafted at 14:57 UTC) describes PR #48 as "draft PR #48 pending owner merge". A post-merge reconciliation in handover v10 is required to reflect merged reality. |
| Bitfinex WS protocol supports sequence numbers via `conf` flag `SEQ_ALL` (65536 / 0x10000). | Enabling sequencing in production SPEC-004 would alter frame shapes across existing schemas and questions. However, a dedicated out-of-band diagnostic probe can utilise `SEQ_ALL` to detect dropped or reordered packets during book initialization. |
| Raw-frame ingress in `node-driver/driver.ts` parses via `JSON.parse(String(raw))`, converting wire numeric tokens into standard IEEE-754 numbers. | While `wireNumber()` handles scientific notation (ADR-007), subtle formatting or precision differences between server-side serialization and JavaScript IEEE-754 doubles remain an unverified hypothesis. |
| SPEC-004 flagship assertion mandates 5 consecutive matching checksum frames. | Any temptation to loosen the assertion (e.g. skipping early frames, accepting 3 of 5, or retrying) is rejected as it masks real product/protocol discrepancies. |

## Multi-Phase Investigation & Alignment Strategy

```
+-------------------------------------------------------------------------------+
| PHASE 1: Post-Merge Status & Handover Reconciliation                          |
| - Verify exact-main CI on commit 20c0605                                      |
| - Draft Handover v10 reconciling PR #48 merge, 19 MODERATE audit, & backlog   |
| - Update implementation plan index                                            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 2: Standalone Protocol & Sequence Diagnostic Harness                    |
| - Develop scripts/diagnose-orderbook-checksum.ts (out-of-band diagnostic tool)|
| - Subscribe to tBTCUSD book with CHECKSUM (131072) + SEQ_ALL (65536) flags    |
| - Log raw wire tokens, sequence continuity, and snapshot-update deltas        |
| - Detect if packet loss or message ordering occurs during book setup          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 3: Passive Nightly Replay Capture & Artifact Harvest                    |
| - Monitor scheduled nightly runs #42356953710+                                |
| - On checksum failure: extract firstMismatch.replay envelope from Cucumber JSON|
| - Execute replayChecksums() offline to isolate the exact diverging level      |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| PHASE 4: Cause-Specific Resolution & Regression Verification                  |
| - If defect is isolated: draft amended cause-specific plan                    |
| - Implement failing red-first unit fixture, then minimal fix                  |
| - Verify 130+ unit tests, >=93% branch coverage, and live smoke               |
| - Maintain strict 5-consecutive-match assertion without compromise            |
+-------------------------------------------------------------------------------+
```

## Steps

### Phase 1: Status & Documentation Reconciliation
1. Verify post-merge exact-main CI status for commit `20c0605` (PR #48).
2. Update `docs/implementation-plans/_index.md` to reflect PR #48 as merged and register this plan.
3. Author portfolio-root handover v10 (`session-notes/bfx-ws-screenplay_session-notes_v10_YYYYMMDDTHHMMZ.md`) and register it in `session-notes/manifest.json`. Handover v10 will record:
   - PR #48 merged at `20c0605` on `main`.
   - Current audit baseline: 19 MODERATE affected package entries, 0 LOW/HIGH/CRITICAL; HIGH gate passes.
   - LIVE-01 remains OPEN at Score 10; diagnostics active; no premature closure.
   - Node 20 floor preserved; Cypress/preprocessor pinned trio preserved.

### Phase 2: Standalone Protocol & Sequence Isolation Harness
4. Author a standalone Node diagnostic script `scripts/diagnose-orderbook-checksum.ts` (outside Cucumber/Cypress runtime):
   - Establishes a direct WebSocket connection to `wss://api-pub.bitfinex.com/ws/2`.
   - Sends `conf` with combined flags: `CHECKSUM_CONF_FLAG` (131072) | `SEQ_ALL` (65536) = `196608`.
   - Subscribes to `book` channel (`tBTCUSD`, `P0`, `F0`, `25`).
   - Captures:
     a. Sequence number monotonicity across all messages (snapshot, updates, checksums) to prove or disprove dropped WebSocket frames.
     b. Exact raw string payloads prior to `JSON.parse` to compare wire price/amount strings against reconstructed `wireNumber` tokens.
     c. Timing deltas between initial snapshot receipt and subsequent update batches.
   - Computes local CRC32 using `crc32Signed` and logs detailed diffs whenever a mismatch occurs.
   - Runs on demand or in prolonged soak mode (e.g. 50-100 checksum frames) without polluting test artifacts or violating public API etiquette.

### Phase 3: Passive Nightly Replay Capture & Offline Analysis
5. Continue nightly scheduled extended runs under standard GitHub Actions scheduling (`.github/workflows/ci.yml`).
6. Document the operational procedure for harvesting failures:
   - When a nightly run fails SPEC-004 on checksum mismatch, download the Cucumber JSON artifact.
   - Extract `firstMismatch.replay` from the failed scenario step.
   - Run the offline replay parser `test/unit/checksum-replay.test.ts` against the captured envelope.
   - Identify: (a) exact price level where local book disagreed with platform; (b) whether the discrepancy existed in the initial snapshot or was introduced by an intermediate update; (c) why subsequent frames (e.g. index 52) recovered.

### Phase 4: Cause-Specific Resolution Gate
7. If empirical evidence establishes a specific root cause:
   - Present an amended implementation plan to the repository owner detailing the exact failure mechanism.
   - Create a deterministic regression fixture under `test/unit/` that reproduces the failure red-first.
   - Implement the targeted fix in `orderBook.ts`, `bookFolding.ts`, or `node-driver/driver.ts`.
   - Re-run all verification gates:
     - `npm run typecheck`
     - `npm run lint`
     - `npm run test:unit:coverage` (130+ tests, ≥93% branch coverage)
     - `npm run audit:ci` (HIGH gate)
     - `npm run lint:kanban`
     - Controlled live smoke run.

## Verification

| Check | Required Result |
|---|---|
| Handover alignment | Handover v10 truthfully reflects PR #48 merge `20c0605`, 19 MODERATE audit state, and OPEN LIVE-01 risk. |
| Diagnostic isolation | Standalone harness runs independently without touching production Cucumber step definitions, schemas, or config. |
| Sequence verification | Standalone harness confirms whether Bitfinex sequence numbers are strictly monotonic during book initialisation. |
| Deterministic replay | Negative and positive controls in `checksumReplay.test.ts` pass; corrupted checksums fail closed; valid replays reproduce exact results. |
| Invariant preservation | Flagship SPEC-004 requirement remains strictly 5 consecutive matches; no retries, sleeps, or assertion relaxation. |
| Zero regression | All 130 unit tests pass with branch coverage maintained above the 93% threshold. |

## Delivery

- **Branch:** `codex/bfx-live-01-diagnostic-harness` for the standalone diagnostic script; separate support PR for handover v10 in portfolio root.
- **Merge Authority:** Repository owner retains sole merge authority.
- **Non-Goals:**
  - No alteration of production SPEC-004 cucumber feature files or step assertions.
  - No premature implementation of stretch SPEC-007 (Sequencing).
  - No blind retries or sleep delays in test execution.
  - No closing of Risk LIVE-01 without causal proof.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Investigation method | A: Standalone harness with `SEQ_ALL` + passive nightly replay monitoring<br>B: Passive nightly monitoring only<br>C: Speculative code changes to book folding | **A (Recommended):** Build standalone harness to test sequence monotonicity and raw tokens while monitoring nightly CI | Approved A, 2026-11-07 |
| Handover v10 timing | A: Reconcile PR #48 merge into Handover v10 now<br>B: Defer handover update until diagnostic harness is completed | **A (Recommended):** Reconcile post-merge records promptly to maintain repository truthfulness | Approved A, 2026-11-07 |
| Assertion contract | A: Maintain strict 5 consecutive matches<br>B: Allow transient early mismatch if later frames match | **A (Recommended):** Strictly maintain 5 consecutive matches; preserving the contract is non-negotiable | Approved A, 2026-11-07 |

## Outcome

Delivered on 7 November 2026:
1. **Handover v10 Registered:** Authored `session-notes/bfx-ws-screenplay_session-notes_v10_20261107T1745Z.md` and companion `.html` at portfolio root, documenting merged PR #48 (commit `20c0605`), clean HIGH audit gate (19 MODERATE, zero LOW/HIGH/CRITICAL), and the active LIVE-01 investigation state. Rebuilt and validated via `python portfolio-prompts/tools/build-handover-manifest.py --check`.
2. **Out-of-Band Diagnostic Harness Delivered:** Authored `scripts/diagnose-orderbook-checksum.ts` and added npm script `"diagnose:checksum": "node --import tsx scripts/diagnose-orderbook-checksum.ts"` in `package.json`. The harness opens an isolated WebSocket with combined flags `196608` (`CHECKSUM` 131072 | `SEQ_ALL` 65536) to monitor sequence monotonicity, raw wire tokens, and early vs steady-state checksum agreement without modifying production Cucumber schemas.
3. **Deterministic Unit Coverage:** Added unit test suite `test/unit/diagnose-checksum.test.ts`. Unit suite expanded from 130 to 141 tests across 39 suites (all passing in ~710ms). Branch coverage on pure modules maintained at 94.03% (above the 80% project floor).
4. **Gates Verified:** `npm run typecheck`, `npm run lint`, `npm run audit:ci`, `npm run test:unit:coverage`, and `npm run lint:kanban` all pass with zero errors.
5. **Contract Preserved:** The flagship SPEC-004 5-consecutive-match contract remains strictly untouched and unloosened. Risk LIVE-01 remains open at Score 10 pending captured root-cause evidence.
