# LIVE-01 captured recurrences

These are replay envelopes from live SPEC-004 checksum mismatches, kept as deterministic regression
fixtures. Each one pins an **unexplained** divergence between the locally folded book and the
platform checksum. None of them is a correct-book oracle, and none of them proves a root cause.

| Fixture | Source | Captured result |
|---|---|---|
| `2026-11-23_run-45159119472.json` | Scheduled extended run [45159119472](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/45159119472) on `main` at `fa7b39e` (Bitfinex public WebSocket v2, `tBTCUSD` book, `P0`, length 25); artefact `cucumber-report-extended-45159119472-1` | Mismatch at buffer indexes 27 and 77; match at 191, 291 and 331 |

## How the fixture was extracted

1. The JSON array after `but got ` in the failing step's `AssertionError` was parsed. The same JSON is
   kept in the run's Cucumber artefact.
2. The `replay` envelope attached to the first mismatch was taken unchanged, except that exact
   duplicate entries were removed. The capture defect fixed alongside this fixture had stored every
   `cs` frame twice under the same index (333 entries, 328 distinct). `totalFrames` and
   `capturedFrames` were set to the de-duplicated count (328). Nothing else was edited.
3. Frames are parsed JSON, not raw wire text, so they cannot show numeric-token differences.
   Buffer index 18 is missing because the capture keeps only channel data frames; what index 18 was
   is unknown.

The 23 November fixture is a version 1 envelope. Envelopes captured from 24 November onwards are
version 2: they also carry a placeholder for every non-data buffer index, so a gap such as index 18
is named rather than unknown. Keep any future fixture in the version it was captured in.

Investigation: `docs/investigations/2026-11-23_live-01-recurrence-replay.md`.
