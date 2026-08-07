# Code Review: bfx-ws-screenplay

**Reviewer:** AI assistant (CLAUDE_3_5_SONNET)
**Date:** 2026-08-07T14:10Z
**Scope:** Full repository review against `docs/backlog.md` v12 and normative `SPECIFICATION.md`
**Baseline:** `main` @ `22c56d7`
**Review version:** CLAUDE_3_5_SONNET v1

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Review](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

## Structure Summary

This is a single-repository code review of `bfx-ws-screenplay`. The review covers the Cypress/TypeScript/Cucumber BDD test suite, the in-house Screenplay pattern implementation, the Node-side WebSocket driver, schema validation catalogues, CI workflows, and project documentation against normative specifications.

## Key Findings

- **MEDIUM:** `npm run test:unit:coverage` uses Node's `--experimental-test-coverage` flag which causes warnings or execution failures on Node 20 LTS, despite `package.json` declaring `"engines": { "node": ">=20" }`.
- **LOW:** Cypress preprocessor trio peer dependency cap (`@badeball/cypress-cucumber-preprocessor@25.0.0` peer range `<=15.17.0`) prevents independent Cypress minor version upgrades.
- **LOW:** Schema guards for checksum frames and heartbeat frames are embedded in composite modules rather than dedicated files in `cypress/schemas/`.
- **LOW:** Screenplay tasks lack JSDoc annotations referencing normative `SPECIFICATION.md` sections, slightly reducing pedagogical clarity for mid-level engineers.
- **STRENGTH:** Flawless BDD-to-Screenplay decoupling, zero active security vulnerabilities (`npm audit` = 0), and robust live API maintenance detection via `environmentBlockedGate.ts`.

## Navigation Guide

- Read [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) for high-level findings and portfolio scoring.
- Read [02_RISKS_AND_ISSUES.md](02_RISKS_AND_ISSUES.md) for detailed risk analyses with line-level evidence and remediations.
- Read [03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md) for the project-specific review.
- Read [06_ARCHITECTURE_ASSESSMENT.md](06_ARCHITECTURE_ASSESSMENT.md) for SOLID, Test Pyramid, and Screenplay pattern evaluation.
```

---