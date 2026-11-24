---
version: 1
created: 2026-11-23T19:52Z
project: bfx-ws-screenplay
type: implementation-plan
item: LIVE-01 / replay-capture
status: delivered
approved: "2026-11-23, owner approved scope A, index-18 visibility A (separate later plan), live soak A (separate owner-scheduled run); owner retains merge authority"
delivered: "2026-11-24, PR #50 squash-merged as d9d89d8; exact-main CI run 45294517487 passed"
language: en-GB
---

# Implementation plan: repair the LIVE-01 replay capture and record the 23 November recurrence

**Goal.** Make the bounded replay evidence that SPEC-004 attaches to a checksum mismatch usable by the project's own fail-closed replay validator, and record the first live recurrence captured since that evidence path shipped (PR #46, `7ff0666`). The flagship five-consecutive-match contract, the ADR-010 classification and the book-folding logic stay unchanged. This plan repairs the evidence path only. It does not claim or attempt a LIVE-01 root-cause fix.

## Evidence gathered before planning

A read-only investigation on 23 November 2026 used `gh run view --log-failed` and offline replay scripts kept in the session scratchpad. It imported the production modules from the local checkout at `fa7b39e`, which matches `origin/main`. Nothing in the repository was changed.

| Finding | Consequence for the plan |
|---|---|
| Scheduled run [45159119472](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45159119472) (2026-11-23, head `fa7b39e`) failed only SPEC-004 "The maintained book matches the platform checksum"; 22 of 23 extended scenarios passed. The ADR-010 gate reported "1 product failure(s) alongside 0 environment-blocked outcome(s)". | A LIVE-01 recurrence, correctly classified. The same SHA passed the scheduled runs on 19 to 22 November, so no code change caused it. |
| The failure JSON contains a complete envelope: session `cc035f39-4215-4a52-ae37-46719cfdbb08`, channel 662613, `throughIndex` 331, 333 of 333 frames, `truncated: false`. | The capture worked as far as completeness goes. The run's Cucumber artefact (`cucumber-report-extended-45159119472-1`, artefact ID 14809753366) retains the same JSON, so the evidence does not depend on log retention. |
| `replayChecksums()` rejects that envelope with "Checksum replay session or index order is invalid". Every `cs` frame (indexes 27, 77, 191, 291 and 331) appears twice with the same index. | The documented recurrence procedure (`docs/investigations/2026-11-04_live-01-checksum-evidence.md`, "Next decision") cannot run on real evidence. This is a defect in the diagnostic path. |
| Cause: `ChecksumVerifications.ts` builds the capture from `[...dataFrames, ...selected]`. `dataFrames` comes from `{ kind: 'channel', chanId, frameType: 'data' }`, and `frameMatches()` (`node-driver/predicates.ts`) excludes only heartbeats, so `dataFrames` already contains every `cs` frame. | Build the capture from `dataFrames` alone, and keep a duplicate-index guard in the capture as defence in depth. |
| The real-question unit test (`test/unit/checksum-replay.test.ts`, "the real question retains a replay envelope in assertion failure JSON") mocks `messagesWhere` so that the second call returns only non-`cs` frames. That differs from the production predicate. | The test passed only because its mock disagrees with production. The mock must select frames through the real `frameMatches()` so that the regression test fails before the fix (red first). |
| After removing the duplicate frames, offline replay through production `extractBookFrames` / `foldBook` reproduces the CI outcome: mismatches at 27 (expected −1205064848, actual 1123628453) and 77 (expected −532647171, actual −1421808610), then matches at 191, 291 and 331. | The repaired evidence reproduces deterministically. It is worth keeping as a pinned regression fixture of an unexplained divergence. |
| Hypotheses tested offline against the platform checksums, all negative: checksum against a shifted update boundary (no prefix matches cs 27 or cs 77), omitting any single update before cs 27, a level changing side, dropping one or two snapshot levels, and a lost update at the only missing buffer index (18): 360 candidate deletions, early-applied later updates and reinserted snapshot levels. | These are recorded as eliminated in the investigation note. The remaining hypotheses are a lost non-captured frame at index 18 (the capture omits heartbeats and non-channel frames, so its type is unknown), numeric-token loss at `JSON.parse`, and upstream disagreement. |
| Index 18 is the only gap between snapshot index 3 and `throughIndex` 331. | Adding the buffer's non-data frames to the envelope (or recording index-only placeholders for them) would show what index 18 was in a future recurrence. This changes the envelope contract, so it is a decision below, not a default step. |
| Scheduled run 44282791003 (2026-11-18, same SHA) failed earlier, at `audit:ci`, because npm audit then reported 10 HIGH advisories (picomatch ReDoS, GHSA-fc5q-39xc-vjpf). Today's run on the same lockfile reports 13 moderate and 0 HIGH. | Unrelated to LIVE-01. It is recorded once in the backlog update as a transient advisory-severity red, with no dependency change. |

## Steps

Specification first: no feature file, step definition, schema, folding rule, ADR-010 rule or five-match assertion changes.

1. **Regression test first (red).** In `test/unit/checksum-replay.test.ts`, change the real-question test's `messagesWhere` mock so that each call filters the input with the production `frameMatches()` from `node-driver/predicates.ts`, using the spec the question passes in. Then assert that `replayChecksums(result[0].replay)` succeeds, and that the envelope has no repeated index and exactly one entry per `cs` frame. Run `npm run test:unit` and confirm this test fails on the unchanged code with "Checksum replay session or index order is invalid".
2. **Fix the capture.** In `cypress/support/screenplay/questions/ChecksumVerifications.ts`, build the replay frame list from `dataFrames` only (filtered to `index <= throughIndex` and sorted), not from `[...dataFrames, ...selected]`.
3. **Defence in depth.** In `cypress/support/screenplay/questions/checksumReplay.ts`, make `captureChecksumReplay()` drop an entry whose `index` equals the previous entry's index when its frame is identical. If two entries share an index but have different frames, the capture is still produced but stays invalid, so `replayChecksums()` keeps failing closed. Add unit tests for both cases. `replayChecksums()` validation is not relaxed.
4. **Pin the real recurrence as a fixture.** Add `test/fixtures/live-01/2026-11-23_run-45159119472.json`, holding the de-duplicated envelope extracted from the run's failure JSON (about 37 KB of public market data), plus a provenance header file or README entry naming the run, artefact and extraction method. Add a unit test asserting that `replayChecksums()` on the fixture yields mismatches at 27 and 77 and matches at 191, 291 and 331. The test name must say it pins an unexplained live divergence, not a correct-book oracle.
5. **Record the evidence.** Add `docs/investigations/2026-11-23_live-01-recurrence-replay.md` covering the run, the capture defect, the reproduction, the eliminated hypotheses with their method, and the remaining hypotheses. Link it from the LIVE-01 entry.
6. **Backlog.** Bump `docs/backlog.md` to v21. Add a dated LIVE-01 update: recurrence on 23 November, evidence repaired, cause unresolved, status still NEEDS INVESTIGATION, score 10. Add the 18 November `audit:ci` observation as a note under DEP-03. The Risk Summary counts stay unchanged (0 HIGH, 1 MEDIUM, 2 LOW). Run `npm run lint:kanban` and regenerate the board only if the check reports drift.
7. **Plan index.** Add this plan's row to `docs/implementation-plans/_index.md`.

## Verification

| Check | Required result |
|---|---|
| Red first | The step-1 test fails on unchanged `main` with the replay validation error, and passes after step 2. |
| Fixture | `replayChecksums()` on the pinned fixture returns exactly [27 ✗, 77 ✗, 191 ✓, 291 ✓, 331 ✓]. |
| Fail closed | Existing tests that reject malformed metadata, mixed sessions, mixed channels, out-of-order indexes and truncation still pass unchanged. A conflicting same-index entry is still rejected. |
| Gates | `npm run typecheck`, `npm run lint`, `npm run test:unit:coverage` (above the 80% branch floor, current 94.03%), `npm run audit:ci` and `npm run lint:kanban` all pass. |
| Contract | `git diff` touches no `.feature` file, step definition, schema, `orderBook.ts`, `bookFolding.ts` or ADR-010 gate code. |
| Live | The PR's CI `smoke` job passes. The extended suite keeps its nightly schedule; no forced live run or retry. |

## Delivery

- **Branch:** `claude/bfx-live-01-replay-capture`, created in a separate `git worktree` from `origin/main` (`fa7b39e`), because portfolio checkouts are shared with other sessions.
- **PR:** one PR to `GBrooks1970/bfx-ws-screenplay`. The owner merges, only after every check is green.
- **Follow-up:** after the merge, a second PR appends the Outcome section here and adds `docs/implementation-logs/2026-11-23_live-01-replay-capture.md`, citing the squash SHA and CI run. A handover (v11) is optional and only if the owner wants one this session.
- **Non-goals:** no change to the five-consecutive-match contract, no retry, sleep or tolerance, no folding change, no LIVE-01 closure, and no dependency change.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Scope | A: repair the capture, pin the fixture and record the evidence (steps 1 to 7)<br>B: as A, without the pinned fixture (step 4)<br>C: record the evidence only, no code change | **A:** the fixture is the only replayable real recurrence the project has, and it guards the repaired path end to end | A, 2026-11-23 |
| Show what index 18 was in future captures | A: separate later plan: add index-only placeholders (index plus frame kind) for non-data frames in the envelope, as a versioned envelope change (`version: 2`)<br>B: include it in this PR<br>C: not now | **A:** it changes the envelope contract and the validator, so it deserves its own plan once this repair is merged | A, 2026-11-23 |
| Live soak with `npm run diagnose:checksum` (CHECKSUM + SEQ_ALL) to test the dropped-frame hypothesis | A: separate, owner-scheduled, bounded run after this merge<br>B: run during this PR<br>C: not now | **A:** keeps this PR deterministic and the live API use deliberate | A, 2026-11-23 |

## Outcome

Delivered on 24 November 2026. [PR #50](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/50) was squash-merged by the owner as `d9d89d8` at 00:07Z. Exact-main [CI run 45294517487](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45294517487) passed: `smoke` succeeded and `extended` was skipped, as it is on every push (it runs on the nightly schedule).

1. **Red first (step 1):** with the mock selecting through the production `frameMatches()`, the real-question test failed on unchanged `main` (6 frames captured, 4 expected). It passed after step 2.
2. **Capture fixed (steps 2 and 3):** `ChecksumVerifications.ts` builds the replay frames from `dataFrames` only. `captureChecksumReplay()` drops an exact repeat of the previous index and frame and keeps a conflicting same-index entry, which `replayChecksums()` still rejects. Validation was not relaxed.
3. **Fixture pinned (step 4):** `test/fixtures/live-01/2026-11-23_run-45159119472.json` (328 frames, `truncated: false`, `throughIndex` 331) replays to exactly [27 ✗, 77 ✗, 191 ✓, 291 ✓, 331 ✓]. Provenance is in `test/fixtures/live-01/README.md`.
4. **Evidence and records (steps 5 to 7):** investigation note `docs/investigations/2026-11-23_live-01-recurrence-replay.md`, backlog v21 (LIVE-01 and DEP-03 updates, Risk Summary unchanged) and the plan index row.
5. **Gates:** on exact-main CI, 144 of 144 unit tests passed in 39 suites, with 93.90% branch coverage overall and 96.61% for `checksumReplay.ts`; `audit:ci` reported 13 moderate and 0 HIGH; live smoke passed 8 of 8 specs. Locally on Node 24.18.0 before the PR, typecheck, lint, `lint:kanban` and the same unit suite passed (local branch figure 94.05%; the CI figure is the one of record).
6. **Contract preserved:** the merge touched no `.feature` file, step definition, schema, `orderBook.ts`, `bookFolding.ts` or ADR-010 gate code. The five-consecutive-match assertion is unchanged.

**Not delivered by design:** the LIVE-01 root cause is still unresolved (status NEEDS INVESTIGATION, score 10). The two approved follow-ups remain open: a separate plan for a `version: 2` envelope with index-only placeholders for non-data frames, and a bounded owner-scheduled `npm run diagnose:checksum` run. The implementation log is `docs/implementation-logs/2026-11-24_live-01-replay-capture.md`; it carries the merge date rather than the `2026-11-23` named in Delivery, following the log convention of the day it is written.
