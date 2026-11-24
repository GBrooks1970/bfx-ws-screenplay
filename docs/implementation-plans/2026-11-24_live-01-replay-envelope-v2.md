---
version: 1
created: 2026-11-24T00:19Z
project: bfx-ws-screenplay
type: implementation-plan
item: LIVE-01 / envelope v2
status: approved
approved: "2026-11-24, owner approved A/A/A/A: bounded placeholder detail, index range from 0, whole-buffer read only on a mismatch, no ADR; owner retains merge authority"
delivered: not yet
language: en-GB
---

# Implementation plan: replay envelope version 2 with placeholders for non-data frames

**Goal.** When SPEC-004 attaches replay evidence to a checksum mismatch, also record what every other buffer index was, so that a gap like index 18 in the 23 November recurrence can be identified rather than guessed. Version 2 keeps the version 1 data frames exactly as they are and adds a short placeholder for each non-data frame, so the envelope covers every buffer index from 0 to the failing checksum. The five-consecutive-match contract, the ADR-010 classification, the book fold and the driver stay unchanged. This plan improves evidence only. It does not attempt a LIVE-01 root-cause fix.

This is the follow-up the owner approved on 2026-11-23 (plan `2026-11-23_live-01-replay-capture-repair.md`, decision "Show what index 18 was in future captures", answer A).

## Evidence gathered before planning

Read-only, on `main` at `3735154` (after PR #51), in a separate worktree.

| Finding | Consequence for the plan |
|---|---|
| The driver (`node-driver/driver.ts`, `bufferFrame`) gives every inbound message the next buffer index. A message that is not valid JSON is kept as its raw string. | Buffer indexes have no holes, so an envelope can be required to cover every index. A raw string frame is a real possibility for an unexplained gap. |
| The capture keeps only `{ kind: 'channel', chanId, frameType: 'data' }` frames. In the pinned 23 November fixture the indexes run 3 to 331 with only 18 missing. | By construction, index 18 was **not** a data frame on the book channel. It was a book-channel heartbeat, an event object (such as `info` or `conf`), a frame on another channel, or an unparsed string. Version 1 cannot tell which. |
| `frameMatches()` lives in `node-driver/predicates.ts`. Cypress support code imports only types from `node-driver`, never runtime code. | Classifying placeholders needs a small pure function on the Cypress side. It must not import driver runtime code. |
| `CommunicateOverWebSocket.peek(spec)` is an existing non-blocking read of the buffer that never asserts on an empty result. The DSL already has `{ kind: 'any' }`. | Version 2 needs no predicate DSL change, so no contract note under `docs/predicate-dsl.md` is required. |
| `attachChecksumReplay()` calls its capture function synchronously, inside the `.then` that computes the results. | The extra buffer read must happen before attaching. Doing it only when a mismatch exists keeps the passing path unchanged (no extra `cy.task` call). |
| Consumers of `ChecksumReplay`: `checksumReplay.ts`, `checksumDiagnostics.ts` (the optional `replay` field), `ChecksumVerifications.ts`, `test/unit/checksum-replay.test.ts` and the pinned version 1 fixture. | `replayChecksums()` must keep accepting version 1, or the pinned fixture test breaks. |
| The pinned fixture is 33,992 bytes for 328 frames. The budget is 5,000 entries and 1 MiB. | A placeholder (index, kind and a short detail) adds well under 100 bytes, so a typical capture stays far inside the budget. A capture that still overflows is truncated and rejected, as today. |

## Envelope design (version 2)

```ts
type ReplayGap = {
  index: number;
  kind: 'heartbeat' | 'event' | 'other-channel' | 'unparsed' | 'other';
  detail?: string; // bounded, see the decision on placeholder detail
};
type ChecksumReplayV2 = Omit<ChecksumReplay, 'version'> & {
  version: 2;
  fromIndex: number;   // first buffer index covered (0 under the recommended option)
  gaps: ReplayGap[];
};
```

- `frames` keeps exactly the version 1 meaning: the book channel's data frames, used by the fold.
- `gaps` holds one placeholder for every other buffer index from `fromIndex` to `throughIndex`.
- `totalFrames` and `capturedFrames` count `frames` and `gaps` together, so truncation is judged across both.
- Data frames are budgeted first. If the budget runs out, the envelope is marked truncated and replay rejects it.

**Classification** (a pure function `classifyGap(frame, chanId)` in `checksumReplay.ts`):

| Frame | `kind` | `detail` (under the recommended option) |
|---|---|---|
| `[chanId, 'hb']` | `heartbeat` | none |
| Object with a string `event` | `event` | the event object as JSON, cut to 256 characters |
| Array whose first element is another number | `other-channel` | `chanId` and `frame[1]` if it is a string label |
| String (the driver could not parse it) | `unparsed` | the raw text, cut to 256 characters, with its full length |
| Anything else | `other` | the JSON type |

A book-channel data frame never becomes a gap. If one did, replay rejects the envelope.

**Replay validation for version 2**, on top of every version 1 rule:

- `frames` and `gaps` are each in strictly increasing index order.
- No index appears in both lists.
- Together they cover every index from `fromIndex` to `throughIndex` with no holes.
- Every gap has a known `kind`, and no `detail` exceeds its bound.
- The fold and the checksum comparison use `frames` only, exactly as in version 1.

## Steps

Specification first: no feature file, step definition, schema, fold rule, driver, predicate DSL, ADR-010 rule or five-match assertion changes.

1. **Tests first (red).** In `test/unit/checksum-replay.test.ts`:
   - Extend the real-question test so the mocked buffer contains a heartbeat, an `info` event, an other-channel frame and an unparsed string between data frames. Mock `peek` through the same production `frameMatches()` selection.
   - Assert that the envelope is version 2, starts at `fromIndex` 0, covers every index to `throughIndex`, and classifies each placeholder correctly.
   - Add `replayChecksums()` cases for version 2: a missing index, an index in both lists, an unknown `kind`, an over-long `detail`, a book data frame disguised as a gap, and truncation. Each must throw.
   - Confirm the new tests fail on unchanged `main`.
2. **Classification and capture.** In `cypress/support/screenplay/questions/checksumReplay.ts`, add `ReplayGap`, the version 2 type, `classifyGap()`, and a version 2 path in `captureChecksumReplay()` that takes all buffered frames up to `throughIndex`, splits them into data frames and placeholders, and applies the shared budget.
3. **Read the whole buffer only on a mismatch.** In `ChecksumVerifications.ts`, when any result mismatches, call `ws.peek({ kind: 'any' })` and pass its frames to the capture. A passing run makes no extra call.
4. **Replay both versions.** `replayChecksums()` accepts version 1 unchanged and version 2 with the extra checks above. The pinned 23 November fixture stays version 1 and its test stays unchanged.
5. **Type and docs.** Update the `replay` field type in `checksumDiagnostics.ts`. Add a short "Replay evidence version 2" section to `docs/investigations/2026-11-23_live-01-recurrence-replay.md` (or a new dated note) describing the placeholders and how to read them at the next recurrence. Update `test/fixtures/live-01/README.md` to say future fixtures will be version 2.
6. **Backlog and index.** Bump `docs/backlog.md` with a dated LIVE-01 update. Status (NEEDS INVESTIGATION), score (10) and the Risk Summary stay unchanged. Add this plan's row to `docs/implementation-plans/_index.md`. Run `npm run lint:kanban`.

## Verification

| Check | Required result |
|---|---|
| Red first | The new real-question and version 2 replay tests fail on unchanged `main` and pass after steps 2 to 4. |
| Backward compatibility | The pinned version 1 fixture still replays to exactly [27 ✗, 77 ✗, 191 ✓, 291 ✓, 331 ✓]. Every existing version 1 rejection test passes unchanged. |
| Coverage of indexes | A synthetic version 2 envelope with any one index removed, or duplicated across lists, is rejected. |
| Passing path unchanged | A unit test shows `peek` is not called when all checksums match. |
| Gates | `npm run typecheck`, `npm run lint`, `npm run test:unit:coverage` (above the 80% branch floor; currently 93.90% on CI), `npm run audit:ci` and `npm run lint:kanban` pass. |
| Contract | `git diff` touches no `.feature` file, step definition, schema, `orderBook.ts`, `bookFolding.ts`, `node-driver/` file or ADR-010 gate code. |
| Live | The PR's CI `smoke` job passes. The extended suite keeps its nightly schedule. No forced live run or retry; a real version 2 envelope is only proven at the next recurrence. |

## Delivery

- **Branch:** `claude/bfx-live-01-envelope-v2`, in a separate `git worktree` from `origin/main`, because portfolio checkouts are shared with other sessions.
- **PR:** one PR to `GBrooks1970/bfx-ws-screenplay`, including this plan. The owner merges, only after every check is green.
- **Follow-up:** after the merge, a second PR appends the Outcome here and adds an implementation log, citing the squash SHA and the exact-main CI run.
- **Non-goals:** no LIVE-01 fix or closure, no change to the five-match contract, no retry, sleep or tolerance, no driver or DSL change, no live soak (that is the separate owner-scheduled `diagnose:checksum` run), and no re-capture of the 23 November evidence (that run's buffer is gone).

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Placeholder detail | A: kind plus a bounded detail (event JSON or raw unparsed text cut to 256 characters; chanId and label for other channels)<br>B: kind only<br>C: the full frame for every non-data frame | **A:** an unparsed string or an `info` event is exactly the evidence a gap needs, and the bound keeps the envelope small. All of it is public market data. B could leave the next gap still unexplained; C makes envelope size depend on other channels' traffic | A, 2026-11-24 |
| Index range | A: every index from 0 (connection start) to the failing checksum<br>B: from the snapshot index only | **A:** it also records the `info`, `conf` and `subscribed` messages before the snapshot, at a cost of a few placeholders | A, 2026-11-24 |
| When to read the whole buffer | A: only when a checksum mismatches (extra `peek` before attaching)<br>B: on every run, replacing the data-frame query | **A:** the passing path, which runs nightly, stays exactly as it is | A, 2026-11-24 |
| ADR | A: no ADR; the envelope is diagnostic evidence, recorded in this plan, the code and the investigation note<br>B: add ADR-011 for the envelope format | **A:** the product contract, driver and DSL do not change. PR #46 added version 1 the same way | A, 2026-11-24 |

## Outcome

[Appended after delivery.]
