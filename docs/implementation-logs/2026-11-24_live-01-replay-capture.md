# LIVE-01 replay capture repair and 23 November recurrence: 2026-11-24

## Session Summary

The scheduled extended run of 23 November ([45159119472](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45159119472)) was the first LIVE-01 recurrence since bounded replay evidence shipped in PR #46. Its envelope was complete but unusable: the capture stored every `cs` frame twice, so `replayChecksums()` rejected it. The approved plan `2026-11-23_live-01-replay-capture-repair.md` fixed the capture red-first, pinned the de-duplicated envelope as a regression fixture and recorded the offline investigation. It merged in [PR #50](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/50) as `d9d89d8`, and exact-main CI passed. The LIVE-01 root cause is still unresolved.

---

## Objectives

1. ✅ Prove the capture defect with a test that fails on unchanged `main`.
2. ✅ Build the replay capture from `dataFrames` only, with an exact-duplicate guard in `captureChecksumReplay()` that still fails closed on conflicting entries.
3. ✅ Pin the real 23 November recurrence as a deterministic fixture with recorded provenance.
4. ✅ Record the recurrence, the defect, the reproduction and the eliminated hypotheses.
5. ✅ Update the backlog (v21 in the PR, v22 after merge) and the plan index without changing the Risk Summary.
6. ⏸️ Explain the LIVE-01 divergence. Out of scope for this plan; the root cause is unresolved.
7. ⏸️ Show what buffer index 18 was in future captures (`version: 2` envelope). Approved as a separate later plan.
8. ⏸️ Bounded live `npm run diagnose:checksum` run. Approved as a separate owner-scheduled step.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / node:test | Unit (`npm run test:unit:coverage`) | 141/141 on `fa7b39e`; the strengthened real-question test failed on unchanged code (6 frames captured, 4 expected) | 144/144 in 39 suites, exact-main CI run [45294517487](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45294517487) (431 ms) | ✅ PASS |
| TypeScript / node:test | Branch coverage | 94.03% overall | 93.90% overall on CI (94.05% locally); `checksumReplay.ts` 96.61% | ✅ PASS (floor 80%) |
| Cypress / live Bitfinex | Smoke (`npm run test:smoke`) | n/a | 8/8 specs on exact-main CI (00:15) | ✅ PASS |
| Cypress / live Bitfinex | Extended | Run 45159119472 on `fa7b39e`: 22/23, SPEC-004 failed (the recurrence) | Not run: the job is skipped on push and runs on the nightly schedule | ⏸️ Scheduled |
| npm | `audit:ci` | 13 moderate, 0 HIGH | 13 moderate, 0 HIGH on CI | ✅ PASS |
| Tooling | typecheck, lint, `lint:kanban` | Pass | Pass locally on Node 24.18.0 before the PR (exit 0; board in sync, 23 tickets) | ✅ PASS |

---

## Changes Implemented

### Capture built from data frames only

**Files changed:**
- `cypress/support/screenplay/questions/ChecksumVerifications.ts`: the replay capture used `[...dataFrames, ...selected]`. The `{ frameType: 'data' }` query excludes only heartbeats (`node-driver/predicates.ts`), so `dataFrames` already held every `cs` frame and each was stored twice under the same index. The capture now uses `dataFrames` filtered to `index <= throughIndex`.

### Exact-duplicate guard that still fails closed

**Files changed:**
- `cypress/support/screenplay/questions/checksumReplay.ts`: `captureChecksumReplay()` drops an entry only when it repeats the previous entry's index and its serialised frame. A different frame under a repeated index is kept, so `replayChecksums()` still throws "session or index order is invalid". The validator was not changed.

### Tests that use the production predicate

**Files changed:**
- `test/unit/checksum-replay.test.ts`: the real-question test's `messagesWhere` mock now filters through `frameMatches()`. The old hand-written filter left out `cs` frames, which is why the duplication was never caught. The test also asserts that each buffer index is captured once. Three tests were added: an exact repeat is dropped, a conflicting repeat is kept and rejected, and the pinned live recurrence replays to [27 ✗, 77 ✗, 191 ✓, 291 ✓, 331 ✓].

### Pinned live recurrence

**Files changed:**
- `test/fixtures/live-01/2026-11-23_run-45159119472.json`: the de-duplicated envelope (328 frames, `truncated: false`, `throughIndex` 331) from the run's failure JSON.
- `test/fixtures/live-01/README.md`: source run, artefact, extraction method, and the limits of the evidence (parsed frames, index 18 not captured). It states that the fixture pins an unexplained divergence, not a correct-book oracle.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Fix the capture source and also guard against exact duplicates | Removes the cause, and protects the evidence if a future query overlap reappears | Relaxing `replayChecksums()` to accept repeated indexes, which would weaken the fail-closed contract |
| Keep conflicting same-index entries | Two different frames at one index is real corruption and must stay visible | Keeping the first or last entry silently |
| Pin the real envelope as a fixture | It is the only replayable live recurrence the project has, and it guards the repaired path end to end | Recording the numbers in documentation only |
| Defer the `version: 2` envelope and the live soak | Both change scope: one alters the envelope contract, the other uses the live API deliberately | Bundling either into this PR |

No ADR was needed: the feature files, driver protocol, book folding, envelope version and ADR-010 failure semantics are unchanged.

---

## Documentation Updates

- `docs/investigations/2026-11-23_live-01-recurrence-replay.md`: new; run, defect, reproduction, eliminated and remaining hypotheses, and the unrelated 18 November `audit:ci` red.
- `docs/backlog.md`: v21 in PR #50 (LIVE-01 recurrence update, DEP-03 note); v22 in this follow-up (merge update). The Risk Summary is unchanged.
- `docs/implementation-plans/2026-11-23_live-01-replay-capture-repair.md`: new in PR #50; status `delivered` and the Outcome section added in this follow-up.
- `docs/implementation-plans/_index.md`: row added in PR #50 and marked delivered here.
- `test/fixtures/live-01/README.md`: new fixture provenance.
- This log. Its date is the merge day (24 November), not the `2026-11-23` named in the plan's Delivery section.

---

## Lessons Learned

- A mock that reimplements a production filter by hand can hide the very defect a test exists to catch. Select through the production predicate.
- A diagnostic path is only proven when it has processed a real failure. The PR #46 tests passed on synthetic input, and the first live recurrence showed the evidence could not be replayed.
- Pinning a captured recurrence as a fixture turns an intermittent live event into a deterministic regression test, as long as the fixture says what it does not prove.
- Branch coverage differed slightly between local (94.05%) and CI (93.90%) for the same suite. Cite the CI figure as the record.

---

## Recommendations / Next Steps

- [ ] LIVE-01: draft the separate plan for a `version: 2` envelope with index-only placeholders for non-data frames, so a future capture shows what index 18 was. Owner approval needed; medium priority.
- [ ] LIVE-01: owner schedules a bounded `npm run diagnose:checksum` run (CHECKSUM + SEQ_ALL, raw tokens) to separate a dropped-frame cause from numeric-token loss or upstream disagreement. Medium priority.
- [ ] LIVE-01: on the next recurrence, replay the attached envelope offline before any correction plan. Keep the five-match assertion and ADR-010 classification intact.
- [ ] DEP-03: no action; the 18 November HIGH audit red was transient and is recorded.

---

*Session logged: 2026-11-24. Author: Claude Code.*
