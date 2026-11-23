# LIVE-01 recurrence and replay: 2026-11-23

## Run

Scheduled extended run [45159119472](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45159119472)
on `main` at `fa7b39e` failed only SPEC-004 "The maintained book matches the platform checksum".
22 of 23 extended scenarios passed. The ADR-010 gate reported one product failure and zero
environment-blocked outcomes, so the run was correctly kept red. The same SHA passed the scheduled
runs on 19, 20, 21 and 22 November.

| Checksum buffer index | Platform | Local | Result |
|---|---:|---:|---|
| 27 | -1205064848 | 1123628453 | mismatch |
| 77 | -532647171 | -1421808610 | mismatch |
| 191 | -1098009172 | -1098009172 | match |
| 291 | 566497688 | 566497688 | match |
| 331 | 541247141 | 541247141 | match |

This is the same pattern as the September recurrences (runs 34667985630 and 34733362800): early
divergence, then recovery.

## Capture defect

This was the first recurrence since bounded replay evidence shipped (PR #46). The envelope was
complete (333 of 333 entries, `truncated: false`), but `replayChecksums()` rejected it with
"Checksum replay session or index order is invalid". Every `cs` frame was stored twice under the
same index.

`ChecksumVerifications` built the capture from `[...dataFrames, ...selected]`. The `frameType:
'data'` selection excludes only heartbeats, so `dataFrames` already held every `cs` frame. The
real-question unit test mocked the data query with a hand-written filter that left out `cs` frames,
which hid the duplication. The fix builds the capture from `dataFrames` alone. The test mock now
selects through the production `frameMatches()`, and `captureChecksumReplay()` drops exact
duplicates while keeping conflicting same-index entries so that replay still fails closed.

## Reproduction

With exact duplicates removed (328 entries), offline replay through the production
`extractBookFrames` and `foldBook` reproduces every result in the table above. The de-duplicated
envelope is pinned as `test/fixtures/live-01/2026-11-23_run-45159119472.json`, with a unit test
asserting that exact result.

## Hypotheses tested offline (all negative)

Each candidate was folded with the production modules and compared with the platform checksums.

| Hypothesis | Method | Result |
|---|---|---|
| The checksum belongs to a different update boundary | Folded every prefix from index 4 to 332 and compared each with cs 27 and cs 77 | No prefix matches either; cs 191, 291 and 331 match only their own boundary (and the next index) |
| One received update should not have been applied | Omitted each of the 22 updates before cs 27 in turn | No match |
| A level switched side without a delete | Checked every update for a positive-count level arriving on the opposite side of an existing price | None found |
| The snapshot held stale levels | Removed each single snapshot level, then each pair, and checked all five checksums | No match |
| A book update was lost at the only missing buffer index (18) | Inserted at 18: a deletion of each of the 50 levels present, each later update applied early, and each snapshot level absent from the book (360 candidates) | No candidate matches cs 27 or cs 77 |

## Remaining hypotheses

- **Index 18 was a frame the capture never sees.** The capture keeps only channel data frames.
  Heartbeats and non-channel messages are excluded, so what index 18 was is unknown. A lost or
  unrecognised book frame there remains possible. Recording index-only placeholders for non-data
  frames is a separate, approved follow-up plan (versioned envelope change).
- **Numeric-token loss.** Frames are parsed JSON, so a wire token that does not round-trip through
  an IEEE-754 double is invisible here.
- **Upstream disagreement.** The platform's own early checksums may not describe the book it sent.

The out-of-band probe `npm run diagnose:checksum` (CHECKSUM + SEQ_ALL, raw tokens) can separate
these. A bounded, owner-scheduled run is approved as a separate step.

## Unrelated red run on 18 November

Scheduled run 44282791003 (same SHA) failed at `audit:ci`, before any live test ran: npm audit then
reported 10 HIGH advisories (picomatch ReDoS, GHSA-fc5q-39xc-vjpf). On 23 November the same lockfile
reported 13 moderate and 0 HIGH. It is recorded under DEP-03 and is not LIVE-01 evidence.
