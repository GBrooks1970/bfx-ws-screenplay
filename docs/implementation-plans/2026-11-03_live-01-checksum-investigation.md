---
version: 1
created: 2026-11-03T16:00Z
project: bfx-ws-screenplay
type: implementation-plan
item: LIVE-01
status: proposed
approved: not yet
delivered: not yet
language: en-GB
---

# Implementation plan: Action 5 — prove and resolve intermittent checksum divergence

**Goal.** Establish an evidence-backed cause for LIVE-01 before changing book folding or protocol behaviour. Preserve the first-five checksum contract and ADR-010 failure classification. Approve a bounded investigation and replay capability first; a cause-specific remedy is conditional on evidence and may need a revised plan.

## Evidence gathered before planning

Read-only investigation on 3 November 2026 inspected local main `b90dba4b71eea34bd18ecad9821721e3c168ad1c`, backlog v17, handover v6, project contract, SPEC-004 questions/folding/driver, existing diagnostic tests, ADR-007 and ADR-010. The retained September failure artefact was downloaded outside the repository and its Cucumber JSON/messages parsed. No live API call, dependency install, test execution or source edit was performed; only this plan and its index entry are new writes. Action 1's proposed plan and existing template are preserved.

| Finding | Consequence for the plan |
|---|---|
| [Run 34733362800](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/34733362800), head `624d2ac`, records expected `1151605136`, actual `1811877589` at checksum buffer index 28, then four matches at indexes 52, 74, 168 and 227 | A real received checksum disagreed; later recovery does not establish the cause or discharge the failure |
| Its report separately contains a ticker environment-blocked outcome; Cucumber messages contain zero attachments | Keep checksum product failure distinct from a quiet ticker; historical report alone cannot replay book construction |
| Artifact `10310451742` remains available, digest `sha256:c1c38224415ac167b2e4324cfdefa76c83a6b4ea9d0bd673f796fe61bb22348c` | Preserve run/head/artifact provenance; downloaded files are temporary evidence, not a new repository fixture |
| [Run 41611910228](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/41611910228) fails `audit:ci`; typecheck, unit and extended steps are skipped | Latest red CI is not a recurrence of LIVE-01. Action 1/DEP-02 must restore the audit gate before a useful controlled CI observation |
| `node-driver/driver.ts` appends frames with monotonic indexes; `ChecksumVerifications.ts` collects checksums then data; `verifyChecksumAtIndex` uses only updates with index strictly less than the checksum | Later-arriving updates are excluded by index. A generic asynchronous race is not established by code inspection |
| `bookFolding.ts` treats the first array payload as the snapshot and later payloads as individual updates | Validate channel/session/snapshot boundaries and malformed or repeated snapshots in replay before changing their semantics |
| Current mismatch output includes snapshot index/count, updates applied, last five mutations and local checksum input | Useful diagnosis, but not a replay-complete snapshot plus all preceding mutations; a long prefix cannot be reconstructed from five updates |
| Raw ingress JSON-parses wire messages and discards the original numeric tokens; ADR-007 already records the double-precision limitation | Numeric-token loss is a hypothesis, not the demonstrated cause. Do not rewrite numeric handling or claim upstream error without evidence |
| Current source compares every one of the first five results for exact equality; no retry is present | Preserve that assertion, timeout taxonomy and five-match count |

The current [Bitfinex checksum documentation](https://docs.bitfinex.com/docs/ws-websocket-checksum) confirms signed CRC-32 over the top 25 levels on each side. [General protocol documentation](https://docs.bitfinex.com/docs/ws-general) describes snapshot-then-update delivery and separately configurable sequence numbers. These sources support protocol checks, not a conclusion that this feed violated its contract. Enabling sequence flags changes frame shapes and is outside the initial diagnostic scope.

Temporary downloaded report location: `C:\Users\brook\AppData\Local\Temp\bfx-live01-plan-20261103\cucumber-report-extended-34733362800-1`. Re-download by run ID if absent. Historical backlog evidence also names run 34667985630; this investigation re-examined 34733362800 only.

### Suggested solutions and hypotheses

| Option / hypothesis | Assessment |
|---|---|
| **Recommended: deterministic replay, then a narrow cause-specific fix** | Build evidence sufficient to distinguish extraction/order, book folding and serialization. Keep LIVE-01 open until the failure is reproduced and explained |
| Extend bounded diagnostics with replay-complete parsed frames | Justified if no existing post-diagnostics artifact supplies a full prefix. Full snapshot plus ordered mutations/checksums is needed; a truncated capture must state it is not replay-complete |
| Fix snapshot/update or side/deletion logic | Conditional: requires a retained failing fixture and independent expected state, not an invented correction based on early recovery |
| Correct numeric token handling | Conditional: parsed-frame replay and checksum string comparison must isolate the difference; original-wire preservation or changed precision contract needs a revised design/ADR |
| Attribute upstream behaviour or enable sequence flags | Not yet supported. Escalate with retained evidence only; do not classify disagreement as an environment block |
| Skip early checksums, wait for five later matches, add sleeps/retries or loosen equality | Reject: conceals the observed failure rather than resolving it |

## Steps

1. After approval, recheck main, latest retained extended artifacts and LIVE-01. Coordinate with DEP-02: plan/evidence work can proceed independently, but use its accepted dependency baseline for executable/live verification. Create `codex/bfx-live-01-checksum-investigation` from the agreed main and preserve all unrelated planning files.
2. Specification first: write `docs/investigations/2026-11-03_live-01-checksum-evidence.md` (use actual execution date if later) with provenance, hypotheses and evidence gaps. Review SPEC-004 feature wording with Gary before framework changes, as required by the project contract. No semantic change to the feature is currently proposed; an ambiguity or deviation requires an ADR change note and a revised proposal first.
3. Inspect post-diagnostics failed artifacts, if available, before adding more telemetry. Do not assume every red run reached tests. If a complete bounded snapshot-to-checksum prefix already exists, preserve a minimal fixture under `test/fixtures/live-01/` with run/head/expected-checksum provenance; do not synthesise a live failure or include unrelated report data.
4. Add a pure replay utility `cypress/support/screenplay/questions/checksumReplay.ts` and deterministic `test/unit/checksum-replay.test.ts`, reusing `extractBookFrames`, `verifyChecksumAtIndex` and the production fold. The utility accepts ordered indexed channel frames and returns exact results plus completeness/validation evidence. Verify monotonic indexes, correct session/channel, snapshot preceding checksums, and exclusion of later updates. The independent fixture oracle must not derive expected checksums solely from the same implementation under test.
5. If the retained artifacts are insufficient, extend `checksumDiagnostics.ts` and the question integration in `ChecksumVerifications.ts` to retain a mismatch-only replay envelope containing the snapshot and ordered selected-channel frames through the last checksum being asserted, with snapshot/checksum indexes, expected values and explicit limits. Proposed limits: at most 5,000 frames and 1 MiB serialised diagnostic data per scenario; record captured counts, total counts and `truncated` status. No unbounded report growth, extra live subscription, raw-token capture or driver protocol change. A truncated envelope must never be labelled replay-complete. Extend `test/unit/checksum-diagnostics.test.ts` for bounds and compact success output. Existing `Ensure` JSON failure output and report artifacts can carry the envelope; verify end-to-end retention before claiming observability delivered.
6. After deterministic gates and DEP-02 pass, run one targeted SPEC-004 observation with `node --import tsx scripts/run-suite.ts "@spec-004"`. The feature carries that tag and the existing runner accepts a tag expression; confirm those facts again before execution. Do not introduce a new orchestration interface. Preserve every outcome and teardown. Do not repeat until green. If no mismatch occurs, record non-reproduction, retain diagnostics and use normal nightly evidence; LIVE-01 remains open.
7. **Root-cause decision gate:** reproduce any captured mismatch offline and compare extraction, ordered mutations, side membership/deletion, top-25 ordering, tokens and CRC against an independently derived oracle. Demonstrate which component/contract is wrong. If no complete fixture or causal proof exists, stop at the investigation outcome and propose the next evidence step. If proof identifies a simple implementation defect, present an amended plan naming the exact correction and failing regression before changing `bookFolding.ts`, `orderBook.ts` or driver behaviour. Initial approval does not authorise speculative fixes.
8. Once a cause-specific correction is separately approved, implement only that correction with its red-before/green-after fixture. Re-run the agreed gates and one controlled targeted/extended observation. Update LIVE-01's actual state in `docs/backlog.md`; regenerate `bfx-ws-screenplay_implementation-kanban_v1.html` via the existing generator, and check drift. Do not close the item merely because fresh live traffic passes.
9. Append an immutable implementation/investigation log from the project template, append the actual Outcome to this approved plan and update `_index.md`. Create the next numerical bfx-ws-screenplay handover pair at portfolio-root `session-notes/`, with separate root branch/PR. Recheck the version after Action 1 delivery; do not preallocate v7. Preserve earlier logs, feature evidence and Action 1 plan.

## Verification

| Check | Required result |
|---|---|
| Replay indexing | Frames after a checksum do not influence its result; a snapshot after the checksum, duplicate/non-monotonic indexes or missing required evidence are explicitly rejected |
| Independent checksum fixture | Known snapshot/update sequence has expected CRC independently established; production replay matches it |
| **Must-fail checks** | Deliberately corrupt the expected checksum or omit a material pre-checksum mutation: mismatch must remain a product failure. A later matching frame must not make the first-five assertion pass |
| Diagnostic limits | Complete small replay envelope is recoverable from report failure JSON; over-limit capture says truncated and stays within byte/frame limits; matching results remain compact |
| Classification | Existing ADR-010 mixed product/environment fixture stays red; no mismatch text is converted to environment-blocked |
| Existing gates | `npm run typecheck`, `npm run lint`, `npm run test:unit:coverage`, `npm run audit:ci`, `npm run lint:kanban`, then normal smoke per project contract; record actual test counts, coverage and runtime |
| Cause-specific correction | Captured failing fixture fails before and passes after the approved change; adjacent side/order/token regressions retained |
| Live evidence | One bounded targeted or extended observation after static gates, with exact SHA, retained artifact and outcome. A pass is corroboration, not causal proof; no recurrence means unresolved |

Existing `_all.test.ts` discovers new unit test files automatically. If replay becomes a load-bearing module, add it to the explicit branch-coverage include list in `package.json`; no dependency versions change here. No tests or live runs were executed during this planning session.

## Delivery

**Publication authorisation (2026-11-03).** The owner authorised committing, pushing and merging these planning documents through PRs. This authorises documentation publication only; the implementation plan remains proposed and its execution still awaits approval. Earlier statements about no commits or PRs describe the investigation stage.

**Proposed plan only; no implementation is authorised yet.** Only this document and its index entry are written now. The existing Action 1 plan, template, source, dependencies, backlog and CI remain unchanged. No branch, commit, push or PR is created by this investigation.

After approval, deliver diagnostics/replay in a scoped draft project PR and separate support handover PR; Gary reviews and merges. Cause-specific fixes require the evidence gate and amended plan described above. Exact-head CI and exact-main CI after owner merge, safe fast-forward and task-only branch cleanup are separate publication checks. Action 1 dependency remediation must not be folded into this PR.

**Non-goals:** weaker checksum assertions; retries or sleeps; upstream outage reclassification; sequence/bulk flags; a raw-wire parser migration; dependency upgrades; new live products or SPEC-007; indefinite repeated capture; automated upstream issue submission.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Initial scope | Evidence/replay first / speculative folding fix / defer | Evidence/replay first, conditional bounded telemetry | Pending |
| Capture budget | 5,000 frames and 1 MiB per scenario / revise | Proposed explicit caps; truncated evidence cannot prove completeness | Pending |
| Live execution | One targeted/extended observation after DEP-02 / repeated polling | One bounded observation, then ordinary nightly evidence | Pending |
| Cause-specific correction | Amend plan after proof / blanket permission now | Amend plan after proof; retain Gary's feature/ADR review boundary | Pending |
| Publication | Separate project/support draft PRs / direct main | Separate PRs, owner merge | Pending |

## Outcome

Investigation completed; root cause remains unknown. The historical failure and current replay-evidence gap are verified. No implementation, tests, dependency changes or live traffic were performed. LIVE-01 remains open.
