# LIVE-01 replay envelope version 2: 2026-11-24

## Session Summary

The 23 November LIVE-01 recurrence left one buffer index (18) that version 1 replay evidence could not name, because the capture kept only the book channel's data frames. The approved plan `2026-11-24_live-01-replay-envelope-v2.md` (owner decisions A/A/A/A) added a version 2 envelope. On a checksum mismatch it records a bounded placeholder for every other buffer index from 0 to the failing checksum, and replay rejects it unless every index is covered exactly once. It merged in [PR #52](https://github.com/GBrooks1970/bfx-ws-screenplay/pull/52) as `641fc6d`, and exact-main CI passed. LIVE-01 itself is unresolved.

---

## Objectives

1. ✅ Prove the missing behaviour with tests that fail on unchanged `main`.
2. ✅ Classify every non-data buffer entry with a bounded detail, without importing driver runtime code into Cypress.
3. ✅ Read the whole buffer only on a mismatch, leaving the passing path unchanged.
4. ✅ Replay version 2 with full index coverage checks, and keep version 1 (the pinned 23 November fixture) replaying unchanged.
5. ✅ Update the investigation note, fixture README, backlog (v23 in the PR, v24 after merge) and plan index.
6. ⏸️ See a real version 2 envelope. Only possible at the next scheduled-run recurrence.
7. ⏸️ Explain the LIVE-01 divergence. Out of scope; the root cause is unresolved.

---

## Test Results

| Stack | Suite | Before | After | Status |
|---|---|---|---|---|
| TypeScript / node:test | Unit (`npm run test:unit:coverage`) | 144/144 on `3735154`; with the new tests on unchanged code, 145/148 (3 version 2 tests failed) | 151/151 in 40 suites, exact-main CI run [45395581637](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45395581637) (490 ms) | ✅ PASS |
| TypeScript / node:test | Branch coverage | 93.90% overall; `checksumReplay.ts` 96.61% | 94.46% overall on CI (94.60% locally); `checksumReplay.ts` 98.40% | ✅ PASS (floor 80%) |
| Cypress / live Bitfinex | Smoke (`npm run test:smoke`) | 8/8 | 8/8 specs on exact-main CI (00:08); 8/8 on the PR | ✅ PASS |
| Cypress / live Bitfinex | Extended | Scheduled run 45393920159 on `3735154` succeeded (workflow success; not causal evidence) | Not run on push; it runs on the nightly schedule | ⏸️ Scheduled |
| npm | `audit:ci` | 13 moderate, 0 HIGH | 13 moderate, 0 HIGH on CI | ✅ PASS |
| Tooling | typecheck, lint, `lint:kanban`, `git diff --check` | Pass | Pass locally on Node 24.18.0 (exit 0; board in sync, 23 tickets) | ✅ PASS |

---

## Changes Implemented

### Version 2 envelope, classification and capture

**Files changed:**
- `cypress/support/screenplay/questions/checksumReplay.ts`:
  - New types `ChecksumReplayV1`, `ChecksumReplayV2` and `ReplayGap`; `ChecksumReplay` is now their union.
  - `classifyGap()` returns `null` for a book data frame, using the same rule as the driver's `frameType: 'data'` selection (only heartbeats are excluded). Otherwise it returns `heartbeat`, `event`, `other-channel`, `unparsed` or `other`, with detail cut to 256 characters.
  - `captureChecksumReplayV2()` sorts the buffer, drops exact repeats, and budgets data frames before placeholders. Counts span both lists.
  - The version 1 capture is kept, sharing the repeat and budget helpers, for the pinned fixture and its tests.

### Replay validation for both versions

**Files changed:**
- `cypress/support/screenplay/questions/checksumReplay.ts`: `replayChecksums()` keeps every version 1 rule. For version 2 it also checks:
  - `fromIndex` is valid and data frames start no earlier than it;
  - placeholders are ordered, well formed, of a known kind, within the detail bound and carry no extra keys (so a placeholder cannot smuggle a frame past the fold);
  - the two lists cover every index from `fromIndex` to `throughIndex` exactly once.

### Whole-buffer read on a mismatch only

**Files changed:**
- `cypress/support/screenplay/questions/ChecksumVerifications.ts`: when every checksum matches, the results are returned with no extra call. On a mismatch, `ws.peek({ kind: 'any' })` reads the buffer once and the version 2 envelope is attached to the first mismatch.

```ts
if (results.every((result) => result.actual === result.expected)) {
  return results;
}
return ws.peek({ kind: 'any' }).then((buffered) =>
  attachChecksumReplay(results, (byteBudget) =>
    captureChecksumReplayV2(ws.diagnosticSessionId(), chanId, throughIndex, buffered, byteBudget),
  ),
);
```

### Tests

**Files changed:**
- `test/unit/checksum-replay.test.ts`:
  - A synthetic whole-session buffer: `info`, `conf` and `subscribed` events, a heartbeat, another channel, unparsed text and a bare number, around book data frames.
  - Mocks select through the production `frameMatches()`.
  - New tests:
    - the real question returns the exact version 2 envelope;
    - a passing run makes no `peek` call;
    - positive version 2 replay, and 13 rejection cases;
    - classification and detail bounds;
    - sorting, repeat and conflict handling;
    - budget and truncation.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Bounded detail per placeholder (A) | An unparsed string or an event is the evidence a gap needs; 256 characters keeps the envelope small | Kind only (could leave the next gap unexplained); full frames (size depends on other channels' traffic) |
| Cover from index 0 (A) | Also records `info`, `conf` and `subscribed` before the snapshot, at a cost of a few placeholders | Starting at the snapshot index |
| Read the whole buffer only on a mismatch (A) | The nightly passing path stays exactly as it was | Replacing the data query with a whole-buffer read on every run |
| No ADR (A) | Diagnostic evidence format only; product contract, driver and DSL unchanged, as with version 1 | ADR-011 |
| Classify on the Cypress side with a mirrored rule | Cypress support imports only types from `node-driver`; a runtime import would cross the bridge boundary | Importing `frameMatches()` into Cypress code |
| One documented cast in `ChecksumVerifications.ts` | Cypress unwraps a returned chain at runtime, but its typings cannot express a `.then` returning either a value or a chain, and `cy.wrap` is unavailable to the node:test unit tests | Wrapping the passing branch in `cy.wrap`, or always calling `peek` |

---

## Documentation Updates

- `docs/implementation-plans/2026-11-24_live-01-replay-envelope-v2.md`: new in PR #52 (approved A/A/A/A); status `delivered` and Outcome added in this follow-up.
- `docs/implementation-plans/_index.md`: row added in PR #52 and marked delivered here.
- `docs/investigations/2026-11-23_live-01-recurrence-replay.md`: new "Replay evidence version 2" section on reading `gaps` at the next recurrence.
- `test/fixtures/live-01/README.md`: the 23 November fixture is version 1; later captures are version 2.
- `docs/backlog.md`: v23 in PR #52 (LIVE-01 envelope update); v24 here (merge update). The Risk Summary is unchanged.
- This log.

---

## Lessons Learned

- Evidence that cannot name a gap turns a precise question into a hypothesis search. The 360 index-18 candidates tested offline on 23 November could have been one lookup.
- Requiring full index coverage turns completeness from a claim into something replay can check, and it rejects a placeholder that hides a data frame.
- A diagnostic read placed only on the failure path keeps evidence gathering from changing the behaviour being measured.
- Helper functions that call `t.mock.method` need the test context itself, not a detached `method` reference. The first red run failed on a lost `this` binding, not on the behaviour under test, and was rerun before being treated as red.

---

## Recommendations / Next Steps

- [ ] LIVE-01: at the next recurrence, read the version 2 `gaps` between the snapshot and the first mismatching checksum before testing any fold hypothesis. Pin the envelope as a version 2 fixture. High priority when it occurs.
- [ ] LIVE-01: owner schedules a bounded `npm run diagnose:checksum` run (CHECKSUM + SEQ_ALL, raw tokens). Medium priority.
- [ ] Keep the five-match assertion and ADR-010 classification intact in any later correction plan.

---

*Session logged: 2026-11-24. Author: Claude Code.*
