# Code Review: bfx-ws-screenplay

**Reviewer:** AI assistant (Codex GPT-5)
**Date:** 2026-07-24T00:02Z
**Scope:** Full repository review against `docs/backlog.md` and the normative `SPECIFICATION.md`
**Baseline:** `aa84dc9` (`main`)
**Review version:** CODEX v1

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Review](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

## Structure Summary

This is a single-repository review. The project review covers the Cypress/TypeScript/Cucumber
suite, its in-house Screenplay framework, Node-side WebSocket driver, protocol schemas, CI, and
documentation. Cross-cutting analysis compares those layers inside this repository rather than
inventing additional projects.

## Key Findings

- **HIGH:** The latest nightly run on current `main` failed the flagship SPEC-004 checksum
  scenario on a valid live amount of `1e-8`. The framework deliberately throws instead of
  serialising the value into the plain-decimal checksum token required by the wire algorithm.
- **MEDIUM:** `npm audit` now reports one high-severity transitive `brace-expansion` advisory,
  while the README and canonical backlog still claim zero vulnerabilities.
- **MEDIUM:** The test pyramid is top-heavy: 23 live scenarios and only seven narrow standalone
  checks. The predicate DSL, driver lifecycle, schema guards, book folding, and known checksum
  fixtures lack a conventional deterministic unit suite and coverage report.
- **LOW:** The normative schema catalogue requires checksum-frame and heartbeat schemas, but both
  are still validated ad hoc outside `cypress/schemas/`.
- **LOW:** The normative specification still says "no implementation" and records Node 24 as the
  `engines` floor, while the completed repository intentionally supports and passes on Node 20.

## Validation Snapshot

| Command/evidence | Result |
|---|---|
| `npm ci` | Completed; `npm ls --depth=0` subsequently reported the installed direct tree as valid |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run check:pure` | PASS - 5/5 checksum-serialisation checks and 2/2 diagnostic checks |
| `npm run test:smoke` | PASS - 8/8 scenarios against the live Bitfinex public WebSocket API v2 |
| `npm audit --audit-level=low` | FAIL - one high-severity transitive advisory |
| `npm outdated --long` | Informational non-zero result; several exact-pinned packages have newer releases |
| `npm run test:extended` | Not run locally; contract reserves `@extended` for nightly/on-demand CI |
| Latest nightly CI, run 29982495691 | FAIL - 22/23; SPEC-004 checksum serialisation gap on `1e-8`, not `environment-blocked` |

## Navigation Guide

Start with the [Executive Summary](01_EXECUTIVE_SUMMARY.md), then use
[Risks and Issues](02_RISKS_AND_ISSUES.md) for evidence and remediation. The
[Recommendations](05_RECOMMENDATIONS.md) order the proposed work. The
[Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) is the best entry point for a hiring
manager or technical lead assessing the portfolio demonstration.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
