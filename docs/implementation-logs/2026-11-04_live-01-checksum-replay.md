# LIVE-01 bounded checksum replay and diagnostics — 2026-11-04

## Session Summary

Implemented the approved Action 5 evidence/replay stage on a separate worktree stacked on DEP-02. A mismatch now carries bounded replay data, and deterministic replay validates ordering, session/channel and snapshot completeness. The one controlled live observation did not reproduce the historical failure; LIVE-01 remains unresolved and no cause-specific correction was attempted.

## Objectives

1. ✅ Preserve the first-five checksum contract and ADR-010 product/environment classification.
2. ✅ Add replay-complete parsed prefixes when within limits, with explicit truncation otherwise.
3. ✅ Verify independent CRC fixtures, deliberate failures and real question/assertion serialisation.
4. ⏸️ Root-cause proof and amended fix plan: no new live mismatch to replay.
5. ⏸️ Owner merge and exact-main CI; project and support PRs are separate.

## Test Results

| Check | Result | Evidence |
|---|---|---|
| Typecheck / lint | PASS | Final commands exit 0 |
| Unit coverage | PASS | 130/130, 36 suites, 0.900 s; total branch coverage 93.87%, replay 96.43% |
| New replay tests | PASS | Six tests, including real question and Expectation failure JSON; synthetic independent Python-zlib oracle |
| Negative cases | PASS | Corrupt checksum/missing mutation remain mismatches; invalid metadata/order/session/channel, missing/repeated snapshot, truncation rejected |
| Capture budgets | PASS | 5,001-frame input captures 5,000 and marks truncated; oversized UTF-8 frame omitted; remaining scenario byte budget passed into capture |
| Audit gate | PASS | DEP-02 baseline zero HIGH/CRITICAL; 21 MODERATE/1 LOW remain |
| Live smoke | PASS | One run 8/8 in 7 s |
| Targeted @spec-004 | PASS | One run 4/4 in 27 s; mismatch did not recur |
| Kanban | PASS | 23 cards; 2 Backlog/1 Ready/1 In Progress/19 Done |

Final unit rerun followed a mismatch-only budget refinement; live success-path observations preceded that refinement. No repeated live run was used to obtain green. Raw local evidence is in `C:/Users/brook/AppData/Local/Temp/bfx-live01-unit.log`, `bfx-live01-audit.log`, `bfx-live01-smoke.log`, `bfx-live01-targeted.log`; live reports remain in the isolated worktree's ignored reports folder.

## Changes Implemented

### Pure replay and bounded capture

New `checksumReplay.ts` validates retained parsed frames, reuses production extraction/folding and compares expected checksums. It carries session/channel/index/count provenance and rejects incomplete captures. Only the first mismatch holds the prefix, capped at 5,000 frames and the remaining 1 MiB scenario-result budget. Successful results stay compact. Raw wire numeric tokens are not recovered by this parsed-frame evidence.

### Question integration and tests

`ChecksumVerifications.ts` combines selected checksum/data frames from the same ability; `CommunicateOverWebSocket.ts` exposes read-only session identity for provenance. `checksumDiagnostics.ts` permits the optional replay field. Six new tests exercise independent CRC values, the real question/assertion serializer, early mismatch followed by match, malformed evidence and capture limits. The explicit coverage include list now covers replay.

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Evidence before a corrective fold change | Historical artifact lacks a replay-complete prefix | Speculative race fix or retries |
| Explicit bounded parsed capture | Limits report growth and distinguishes truncated evidence | Unlimited raw traffic or fabricated completeness |
| Separate stacked branch | DEP-02 restores executable audit baseline without mixing review scope | Combine dependency and protocol work |

No structural ADR change: feature, driver protocol, book folding and failure semantics remain unchanged. Owner approval covers the diagnostic stage; any causal correction requires an amended plan.

## Documentation Updates

Backlog v19; LIVE-01 approved plan outcome/index; `docs/investigations/2026-11-04_live-01-checksum-evidence.md`; this log. Board drift check passes without a generated change. A separate portfolio-root v8 handover supersedes Action 1's v7 while preserving both records.

## Lessons Learned

Five recent mutations and a checksum string cannot reproduce an arbitrarily long snapshot-to-checksum history. Attach one bounded prefix only on failure, retain its provenance and reject truncation. A passing current observation cannot explain an intermittent historical mismatch.

## Recommendations / Next Steps

- [ ] Owner: merge DEP-02 PR first, then retarget/rebase this stacked diagnostic PR onto main and review its separate changes; merge support handovers separately.
- [ ] LIVE-01: use a future complete captured mismatch to prove the cause offline and submit an amended correction plan. Keep assertions and classification intact.
- [ ] DEP-03 remains separate residual dependency triage.

*Session logged: 2026-11-04. Author: Codex.*
