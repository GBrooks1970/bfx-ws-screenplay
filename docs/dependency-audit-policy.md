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

- **0 vulnerabilities** (`npm audit`, 28 July 2026).
- **0 active exceptions.**

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
- **`browserslist` → `^4.28.8`** (advisories GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g,
  unbounded memory growth OOM and prototype write). Transitive copy via
  `@badeball/cypress-cucumber-preprocessor → find-cypress-specs → find-test-names →
  @babel/core → @babel/helper-compilation-targets → browserslist@4.28.4`.
  The override forces `browserslist` to `4.28.8`, clearing both advisories while
  remaining fully compatible with Node 20 and CI Node 24 (`node: >=13.7`).

Both paths are exercised in CI: `eslint → minimatch → brace-expansion` by
`npm run lint`, and `mocha → minimatch → brace-expansion` (feature-file globbing
in the cucumber preprocessor) by `npm run test:smoke`.

## Relationship to the pinned trio

The audit overrides above touch only leaf packages (`brace-expansion`,
`postcss`) and do **not** change the deliberately exact-pinned compatibility
trio — `cypress`, `@badeball/cypress-cucumber-preprocessor`,
`@bahmutov/cypress-esbuild-preprocessor` (+ `esbuild`). That trio is governed by
backlog **Risk #1 (pinned-trio drift)**: the preprocessor caps Cypress at
`<=15.17.0`, so the trio is bumped only together after checking the peer range.
Because this remediation left the trio untouched, no live `@extended`
re-validation was required — the smoke gate covers the affected transitive paths.
