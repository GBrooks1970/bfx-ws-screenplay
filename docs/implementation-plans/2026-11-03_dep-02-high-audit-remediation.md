---
version: 1
created: 2026-11-03T14:58Z
project: bfx-ws-screenplay
type: implementation-plan
item: DEP-02 (proposed identifier)
status: proposed
approved: "not yet"
delivered: "not yet"
language: en-GB
---

# Implementation plan: Action 1 — restore the HIGH dependency audit gate

**Goal.** Remove the four currently HIGH vulnerable dependency packages with compatible transitive updates, preserving the exact Cypress/preprocessor trio, declared Node 20 floor and existing audit threshold. DEP-02 is a proposed identifier; confirm it is unused before adding the approved work to the backlog.

## Evidence gathered before planning

Investigation on 3 November 2026 inspected the clean local `main` at `b90dba4b71eea34bd18ecad9821721e3c168ad1c`, GitHub job/log evidence, package manifests, backlog v17, handover v6, ADR-009, project contract and dependency-audit policy. There were no open project PRs at inspection. `npm audit --package-lock-only --ignore-scripts --json` ran against temporary copies outside the repository; both copied manifests remain byte-identical to source. No install, dependency resolution, application test or live Bitfinex request was performed. Planning documents are the only repository writes.

| Finding | Consequence for the plan |
|---|---|
| [Run 41611910228](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/41611910228), 3 November, failed `npm run audit:ci` after successful `npm ci`; typecheck, lint, unit and extended tests were skipped | This failure is an audit blocker, not new checksum-failure evidence |
| CI and the isolated current audit both report 26 affected packages: 4 HIGH, 21 MODERATE, 1 LOW, zero CRITICAL | Clear HIGH/CRITICAL first; record remaining findings without claiming a clean full audit |
| `brace-expansion@5.0.9` is already overridden to `^5.0.9` | Raise that existing floor to `^5.0.12`; retain its existing major rather than introduce a new cross-major override |
| `source-map-js@1.2.1` is requested by PostCSS and Vue compiler packages as `^1.2.1` | Resolve at least 1.2.2 within the current parent ranges |
| Cypress 15.17.0 requests `systeminformation ^5.31.1`; lock has 5.31.12 | Resolve at least 5.33.16 within range without moving Cypress |
| `@actions/http-client` requests `undici ^6.23.0`; lock has 6.28.0 | Resolve at least 6.29.1; do not move to Undici 7/8 |
| Registry engine metadata: brace-expansion 5.0.12 `20 || >=22`, source-map-js 1.2.2 `>=0.10.0`, systeminformation 5.33.16 `>=10.0.0`, Undici 6.29.1 `>=18.17` | These candidate floors do not themselves require raising Node 20; actual installation/gates still need proof |
| Backlog/policy still describe September's zero-vulnerability state, and LIVE-01 remains open | Reconcile dated audit evidence without closing LIVE-01 |

### Candidate fixed floors and primary evidence

| Package | Candidate minimum | Evidence checked 3 November |
|---|---|---|
| brace-expansion | 5.0.12 | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr); this is newer than the 5.0.11 recursion fix |
| source-map-js | 1.2.2 | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) |
| systeminformation | 5.33.16 | [Windows advisory](https://github.com/advisories/GHSA-3f7j-7jwc-fxfj); also exceeds the Linux fixes at [5.33.14](https://github.com/advisories/GHSA-4vjg-vx72-qq4g) and [5.33.13](https://github.com/advisories/GHSA-7648-jmwf-vw7j) |
| undici | 6.29.1 | [Maintainer TLS advisory](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx), [TLS renegotiation advisory](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) |

These floors are verified advisory/registry candidates, not an installed or tested solution. All selected versions must be re-audited at implementation time. npm counts affected package entries, not unique CVEs. The saved raw planning audit is external temporary evidence at `C:\Users\brook\AppData\Local\Temp\bfx-audit-plan-i_4g220r\audit.json`; recreate it if unavailable.

### Options and recommendation

1. **Recommended: targeted compatible transitive refresh.** Raise only the existing brace-expansion override floor, refresh these four packages in the lockfile, review every changed dependency and run the unchanged gates. This addresses the current HIGH blockers with the smallest compatibility surface.
2. **Lockfile-only refresh:** also feasible because all existing ranges already permit the patches, but leaves the documented brace-expansion override's vulnerable minimum in place. Prefer option 1 for an explicit maintained floor.
3. **Coordinated Cypress/preprocessor major upgrade:** may address some MODERATE findings, but crosses the existing pinned-trio and Node-support decision boundary. Defer to the separate Risk #1 decision rather than combine it with this repair.
4. **Audit exception or forced blanket fix:** not recommended while compatible patched candidates exist. Do not lower the threshold, omit dev dependencies or use `npm audit fix --force` to obtain green CI.

## Steps

1. After owner approval, recheck clean Git state, current main/PRs, backlog IDs, all candidate advisories and npm metadata. Create `codex/bfx-dep-02-audit-remediation` from current main. Capture the original audit JSON and failing HIGH-gate result before editing.
2. Update `package.json` only at `overrides.brace-expansion`, from `^5.0.9` to `^5.0.12`. Keep exact pins Cypress 15.17.0, cucumber-preprocessor 25.0.0 and esbuild-preprocessor 2.2.8, esbuild 0.28.1, Node `>=20`, `.nvmrc` and workflow configuration unchanged. If these cease to be feasible, stop and revise the plan before broadening scope.
3. Generate `package-lock.json` through npm, not manual integrity edits. Start with a targeted package-lock-only, ignore-scripts refresh of `brace-expansion source-map-js systeminformation undici` using the project's Node 24 baseline; inspect the resulting graph. Require the four candidate minimums above within existing majors and reject unrelated direct-pin drift. Record the exact resolved patch versions. Do not introduce fresh overrides unless normal parent ranges demonstrably fail and a revised plan is approved.
4. Perform clean `npm ci`; inspect `npm ls`/`npm explain` for the four packages and the pinned trio. Run the validation matrix below. Limit live verification to the normal smoke gate and one extended run after deterministic gates pass; do not repeat until an intermittent failure disappears.
5. Update `docs/dependency-audit-policy.md` with the dated outcome and remaining LOW/MODERATE findings. Add DEP-02 to `docs/backlog.md` with measured evidence and truthful acceptance state; keep LIVE-01 open and Risk #1 as a separate support-floor decision. Update README only if its override/audit statements require reconciliation; do not alter the unchanged trio pin table. Regenerate the existing board via `npm run kanban:sync` and verify `npm run lint:kanban`.
6. Append `docs/implementation-logs/YYYY-MM-DD_dep-02-audit-remediation.md` from the project template and update this plan's outcome/index only after execution. Prepare the next numerical project handover as Markdown/generated HTML in portfolio-root `session-notes/` with its own support PR. Record any residual live failure or blocked verification without converting it into an audit success claim.

## Verification

| Check | Required evidence |
|---|---|
| Negative control | Original unmodified lockfile fails `npm audit --audit-level=high`; preserve the captured audit/job failure. If advisories change before implementation, explain that instead of fabricating a failure |
| Candidate dependency graph | Four vulnerable versions replaced at/above verified floors; original exact trio/direct pins and Node floor retained; no invalid peer relationships |
| Clean install and security | `npm ci` succeeds; `npm run audit:ci` exits 0 with zero HIGH/CRITICAL; plain `npm audit --json` records all residual LOW/MODERATE packages |
| Node 24 baseline | `npm run typecheck`, `npm run lint`, `npm run test:unit:coverage`, `npm run lint:kanban` pass; record actual counts and durations |
| Node 20 support promise | Typecheck, lint and `npm run test:unit` on an available declared Node 20 runtime; do not run Node-24 coverage flags there. If the existing baseline already fails, report the independent support-floor issue rather than silently raising the floor |
| Live compatibility | One smoke run and one extended run with actual outcomes; retain LIVE-01/ADR-010 classification, exact checksum assertions and raw diagnostics for any failure |
| Publication | PR CI on exact head; after owner merge, exact-main CI and safe fast-forward/branch cleanup; separate support handover publication |

A failing live checksum run after the audit repair is not proof that the dependency change caused it. Compare diagnostics against LIVE-01; do not close that investigation or claim whole-project green while it remains failing. No new behavioural unit tests are proposed for a dependency-only change; existing deterministic and integration coverage provide the regression evidence.

## Delivery

**Publication authorisation (2026-11-03).** The owner authorised committing, pushing and merging these planning documents through PRs. This authorises documentation publication only; the implementation plan remains proposed and its execution still awaits approval. Earlier statements about no commits or PRs describe the investigation stage.

This is a **proposed plan only**. No dependencies have been changed, tests rerun, branches created, commits pushed or PRs opened by this investigation. Owner approval is required before actioning the plan. The implementation uses the project topic branch and draft PR; Gary retains merge authority. Logs belong to this repository, handovers to the separate portfolio support repository. Do not combine OrangeHRM work with this PR.

Non-goals: LIVE-01 code changes; SPEC-007; Cypress major migration; retirement of Node 20; workflow/action upgrades; full eradication of MODERATE/LOW findings requiring incompatible upgrades; audit-policy weakening. A residual-finding follow-up should be recorded separately, based on the new audit rather than the September backlog.

## Decisions put to the owner

| Decision | Options | Recommended | Owner's answer |
|---|---|---|---|
| Scope | Four HIGH-compatible fixes / coordinated toolchain migration | Four HIGH-compatible fixes | Pending |
| Runtime promise | Preserve Node 20 / approve separate floor migration | Preserve Node 20; report pre-existing incompatibility separately if found | Pending |
| Residual moderate/low findings | Record and triage / force major upgrades now | Record and triage separately | Pending |
| Execution/publication | Approve scoped implementation with separate log/handover PRs / revise plan | Approve implementation; owner merges each PR | Pending |

## Outcome

Not implemented. Investigation supports a compatible minimal-remediation route, but candidate lockfile resolution, installation and regression results remain to be established after approval.
