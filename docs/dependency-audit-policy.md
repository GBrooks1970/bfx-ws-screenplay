# Dependency audit policy

**Status:** Executable policy (CODEX-04, Codex review v1 Risk #2 / Recommendation
P1). This is the single source of truth for how dependency vulnerabilities gate
the build. It complements the exact-pin strategy in the README pin table.

## The gate

```
npm run audit:ci   # → npm audit --audit-level=high
```

- **Severity threshold: `high`.** The command exits non-zero — failing the
  build — on any advisory of **high** or **critical** severity, across runtime
  *and* dev dependencies (a compromised dev/test toolchain is still a supply-
  chain risk). Moderate and low findings are reported by a plain `npm audit` but
  do not fail the gate; they are triaged into the backlog instead.
- **Where it runs:** every relevant CI path — both the `smoke` job (push / PR)
  and the `extended` job (nightly / dispatch) in `.github/workflows/ci.yml` —
  immediately after `npm ci`, so a vulnerable lockfile fails fast before any
  suite runs.
- **Local:** run `npm run audit:ci` before committing a lockfile change; run a
  bare `npm audit` to see the full moderate/low picture.

## Current state

- **2026-11-07:** zero HIGH/CRITICAL/LOW; `npm run audit:ci` passes. Full audit reports **19 MODERATE** affected package entries (including dependent chains, not distinct CVEs). This supersedes the 4 November snapshot of 21 MODERATE and one LOW.
- **0 active exceptions.** The HIGH threshold remains unchanged; DEP-03 remains open and is not an acceptance of residual risk.
- Affected package entries: @badeball/cypress-cucumber-preprocessor, @eslint/config-array, @eslint/js, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/typescript-estree, @typescript-eslint/utils, dependency-tree, detective-typescript, detective-vue2, eslint, find-cypress-specs, glob, minimatch, mocha, precinct, spec-change, typescript-eslint.
- DEP-02 was merged in PR #45 (`ee856a1`); exact-main CI #41821470848 passed. Compatible resolutions repaired brace-expansion, source-map-js, systeminformation and undici.
- DEP-03 now resolves `qs` 6.17.1 and `serialize-javascript` 7.1.4 within the existing ranges. Only those two lockfile package objects change; no manifest, override, direct pin or Node floor changes.
- Remaining advisory roots: [glob GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) (affected 9.0.0–14.0.1) and [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (affected >=7.0.0 <11.0.1). Existing installed parent ranges do not supply patched versions. npm proposes a major preprocessor downgrade to 15.1.4; that is outside this bounded repair and has not been applied. Reassess supported parent releases before any broader migration; coordinate runtime changes with Risk #1.

## Temporary exceptions

`npm audit` has no native time-boxed allowlist, so an unavoidable HIGH+ finding
that cannot yet be remediated is **recorded here** and the gate is narrowed only
for that advisory, never disabled wholesale. Every exception MUST carry:

| Field | Meaning |
| --- | --- |
| Advisory | The `GHSA-…` / CVE id |
| Package + path | The vulnerable package and its dependency path |
| Owner | The person accountable for closing it |
| Reason | Why it cannot be remediated now (no fix, breaking upstream, etc.) |
| Expiry | A hard review date — past which the exception is invalid and must be re-justified or removed |
| Review link | The advisory and the tracking issue/PR |

An exception past its **expiry** is treated as a failure at review time: the
gate must be restored or the exception re-approved with a new date. There are no
active exceptions today, so the gate runs unmodified.

## Remediation history & override rationale

The two HIGH findings present before this policy were both transitive dev-only
DoS advisories, remediated with the smallest narrowly-reviewed lockfile change —
targeted `overrides` in `package.json`, no direct-pin or parent-major churn:

- **`brace-expansion` → `5.0.8`** (advisories GHSA-3jxr-9vmj-r5cp,
  GHSA-mh99-v99m-4gvg). Two vulnerable copies existed — `mocha → minimatch@9`
  (2.x line) and `eslint → minimatch@10` (5.x line). npm's advisory range is
  `<=5.0.7`, so **only `5.0.8` clears both**; the 2.x backport (`2.0.3`) is still
  inside the flagged range. `brace-expansion@5.0.8` is a **dual package** — its
  `require` conditional export resolves to a CommonJS build — so mocha's CJS
  `minimatch@9` still loads it, and its `engines` (`20 || >=22`) match the
  project's Node ≥20 floor and CI's Node 24. A single global override forces both
  copies to `5.0.8`; `brace-expansion`'s public API (the `expand()` function) is
  unchanged across majors.
- **`postcss` → `8.5.24`** (advisory GHSA-r28c-9q8g-f849, path-traversal). One
  transitive copy via `@badeball/cypress-cucumber-preprocessor → find-cypress-specs
  → … → postcss@8.5.16`; the override bumps it within the 8.x line.
- **`js-yaml` → `^4.3.2`** (advisory GHSA-2883-xcg3-v3hh, `maxTotalMergeKeys`
  does not limit CPU use for empty merge sources — a DoS). Supersedes the earlier
  `^4.3.1` override taken for CVE-2026-59870 / GHSA-5p4m-2wfm-xmqj on 2026-08-07:
  the new advisory's affected range is `4.0.0 - 4.3.1`, so it **includes** the
  version that previously cleared the gate, and `4.3.2` is the first release
  outside it. Two transitive copies, both under the pinned preprocessor —
  `@badeball/cypress-cucumber-preprocessor → cosmiconfig@9.0.2 → js-yaml` and
  `… → mocha@11.7.6 → js-yaml` (deduped to one install) — so a single override
  clears both. Within the 4.x line; no API change.
- **`browserslist` → `^4.28.8`** (advisories GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g,
  unbounded memory growth OOM and prototype write). Transitive copy via
  `@badeball/cypress-cucumber-preprocessor → find-cypress-specs → find-test-names →
  @babel/core → @babel/helper-compilation-targets → browserslist@4.28.4`.
  The override forces `browserslist` to `4.28.8`, clearing both advisories while
  remaining fully compatible with Node 20 and CI Node 24 (`node: >=13.7`).
- **`qs` → `6.16.0`** (advisories GHSA-x5fp-wj9c-mxmx and
  GHSA-4mjr-xmp4-gh2g). The transitive path is `cypress@15.17.0 →
  @cypress/request@4.0.1 → qs`; the parent declares `qs@^6.15.2`, so a
  lockfile-only update selected the patched release without an override or a
  direct dependency.

Both paths are exercised in CI: `eslint → minimatch → brace-expansion` by
`npm run lint`, and `mocha → minimatch → brace-expansion` (feature-file globbing
in the cucumber preprocessor) by `npm run test:smoke`.

## Relationship to the pinned trio

The audit remediations above touch only transitive packages and do **not**
change the deliberately exact-pinned compatibility
trio — `cypress`, `@badeball/cypress-cucumber-preprocessor`,
`@bahmutov/cypress-esbuild-preprocessor` (+ `esbuild`). That trio is governed by
backlog **Risk #1 (pinned-trio drift)**: the preprocessor caps Cypress at
`<=15.17.0`, so the trio is bumped only together after checking the peer range.
The `qs` remediation left the trio untouched; the live smoke gate covers its
transitive Cypress path.
