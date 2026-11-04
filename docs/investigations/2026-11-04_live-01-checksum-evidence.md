# LIVE-01 evidence and replay — 2026-11-04

## Specification and boundary

The approved Action 5 plan and unchanged SPEC-004 feature require every one of the first five received checksum frames to match. Approval covers replay/diagnostics only. No book-folding, wire-token, schema, driver, feature or ADR-010 classification semantics are changed. A cause-specific fix still requires a captured failing fixture and amended plan.

## Evidence

- Historical run [34733362800](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34733362800), head `624d2ac`, records mismatch index 28 (expected 1151605136, actual 1811877589), followed by matches 52/74/168/227. The planning investigation downloaded artifact 10310451742, digest `sha256:c1c38224415ac167b2e4324cfdefa76c83a6b4ea9d0bd673f796fe61bb22348c`, with zero attachments. It cannot reconstruct the entire book prefix.
- On 4 November the most recent default-branch run [41805606761](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/41805606761) still failed at audit:ci and skipped live tests. It is not a new checksum recurrence.
- Action 1's dependency branch passes its audit and one extended run 23/23. This enables this separate diagnostic stage, but remains unmerged.
- Rechecked official [checksum documentation](https://docs.bitfinex.com/docs/ws-websocket-checksum) and [general protocol](https://docs.bitfinex.com/docs/ws-general) on 4 November: signed CRC32, interleaved top 25 bid/ask price/amount values, snapshot then updates. These facts do not establish the historical cause.

## Hypotheses and missing evidence

Ordering/extraction, side/deletion folding, numeric-token loss and upstream disagreement remain hypotheses. Monotonic buffer indexes and the existing strictly-before-checksum filter already exclude later updates. Parsed JSON replay cannot recover original numeric tokens or prove network-level completeness. No causal correction is justified by current evidence.

## Delivered replay contract

`checksumReplay.ts` captures one selected-session/channel prefix through the last asserted checksum, attached only to the first mismatch result. It stores parsed frames, original indexes, session/channel identity, total/captured counts and truncation. Capture is limited to 5,000 frames and a 1 MiB scenario-result budget; oversized captures are explicitly incomplete. Matching results stay compact.

Replay rejects truncation, invalid counts/index order, mixed sessions/channels, missing snapshot, repeated snapshot and a missing final checksum. It reuses production extraction/folding and compares against stored expected checksums. A valid-looking capture cannot detect a deliberately removed frame from an external editor: the negative fixture demonstrates the checksum mismatch instead. Buffer indexes are not required to be contiguous because other channels/events occupy gaps.

## Reproduction and verification

The synthetic oracle uses Python `zlib.crc32`, independently of production CRC: `100:2:101:-2` ->599066899 and `100:3:101:-2` ->-283178611 as signed int32. This is a deterministic regression fixture, never presented as a live failing capture. Negative tests corrupt the expected checksum, omit a material mutation, mix channel/session, alter index order, exceed limits and preserve early failure despite later match.

A test invokes the real ChecksumVerifications question with a controlled ability response and the real Expectation serializer. Its failure JSON retains the replay envelope and replays to the same mismatch. This proves the reporting payload path in isolation; no live mismatch artifact was produced in this execution.

One live smoke observation passed 8/8 in 7 s and one targeted `@spec-004` run passed 4/4 in 27 s on 4 November. The mismatch did not recur; no retry was performed. LIVE-01 stays open. Final deterministic checks after tightening the shared byte budget passed 130/130 with 93.87% branch coverage; the later budget refinement affects mismatch capture only, not the observed success path.

## Next decision

Use ordinary scheduled evidence after owner merge. If a mismatch recurs, extract the one replay envelope from the failure JSON, reject truncated evidence, reproduce offline, and present the exact cause-specific amended plan before changing folding or protocol behaviour. No automated upstream message or repeated live polling is authorised.
