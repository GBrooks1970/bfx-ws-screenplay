---
version: 1
created: 2026-11-07T05:29Z
project: bfx-ws-screenplay
type: implementation-plan
item: DEP-03
status: approved
approved: "2026-11-07, owner requested investigation and resolution; merge remains owner-controlled"
delivered: not yet
language: en-GB
---

# Implementation plan: reconcile publication and apply compatible residual fixes

**Goal.** Correct stale DEP-02 and LIVE-01 publication records, reduce DEP-03 within existing supported dependency ranges, and preserve the unresolved checksum investigation and Node support boundary.

## Evidence gathered before planning

The project is clean at `7ff0666`. PR #45 merged the HIGH audit repair as `ee856a1`; PR #46 merged diagnostics as `7ff0666`. Latest main CI passed. Pages filters its own workflow and the generated board, so the older Pages SHA is expected. The audit investigation found 20 MODERATE and one LOW affected packages; qs 6.17.1 and serialize-javascript 7.1.4 are compatible updates within existing ranges. Remaining glob/minimatch parent ranges require a separate migration decision.

## Steps

1. Update only qs and serialize-javascript lock resolutions using the existing manifest ranges. Inspect the lock diff before accepting it.
2. Record actual DEP-02 merge/CI delivery, retain LIVE-01 as unresolved, and update DEP-03 with the measured residual audit. Preserve Node >=20, direct trio pins, HIGH gate, and checksum assertions.
3. Regenerate the Kanban board and update affected README, plan-index and implementation evidence.
4. Run clean installation, typecheck, lint, unit coverage, HIGH audit, Kanban consistency and one smoke run. Check supported Node 20 deterministic execution if its runtime is available.
5. Commit and push a draft PR for owner review; the parent updates shared handover records.

## Verification

The existing deterministic unit suite includes deliberate corrupt/missing-frame checksum controls and rejects malformed/truncated replay inputs. Retain those controls. Inspect exact dependency versions and audit severity counts. Full nightly extended runs remain scheduled, rather than being repeatedly triggered during diagnosis. A successful smoke or nightly run does not establish a root cause for LIVE-01.

## Delivery and decisions

Branch `codex/bfx-status-resolution-20261107`. The owner authorised these bounded fixes; no broader upgrade, Node-floor change, assertion weakening or merge is authorised. DEP-03 remains open for incompatible residual chains. LIVE-01 remains open until causal evidence is captured.

## Outcome

Implemented on 7 November 2026: only qs and serialize-javascript lockfile entries changed; DEP-02 publication and LIVE-01 diagnostics delivery are reconciled; backlog v20 has 0 HIGH, 1 MEDIUM and 2 LOW open items. The generated board is in sync (23 cards: 2 Backlog, 1 In Progress, 20 Done).

Fresh full audit reports 19 MODERATE and zero LOW/HIGH/CRITICAL. Typecheck, lint, 130/130 unit tests and 94.03% branch coverage pass; Node 20 also passes 130/130 and typecheck. The HIGH gate exits 0. The local smoke runner produced no scenario output and was stopped after 222.154s; it is unverified locally, not a pass. Exact-head Linux PR CI is the remaining browser acceptance gate. See the implementation log for timings and this bounded deviation from the local-smoke plan.

Owner review and merge remain pending. DEP-03 residual chains and the Node-floor decision remain open; LIVE-01 still needs causal mismatch evidence. The earlier plan's 20 MODERATE/one LOW observation was a separate audit snapshot, not the final measurement.
