# Code Review: bfx-ws-screenplay

**Reviewer:** AI assistant (CLAUDE Fable 5)
**Date:** 2026-07-06T10:39Z
**Scope:** Full single-repository review of `bfx-ws-screenplay` at `main` (commit `8ad726e`, "Merge pull request #5 from GBrooks1970/feat/spec-005-candles")
**Review version:** v1 (first review in this repository's `.review/`)

## Review Metadata

- **Project:** WebSocket test automation against the Bitfinex public WebSocket API v2 (Cypress 15 + TypeScript strict + `@badeball/cypress-cucumber-preprocessor` + in-house Screenplay, chainable-native), built under Specification Driven Development against the in-repo normative `SPECIFICATION.md`.
- **Status source of truth:** [backlog.md](docs/backlog.md) (v4, "SPEC-005 complete", 2026-07-05) - validated against the repository during this review.
- **Reviewed state:** the committed default branch (`main` at `8ad726e`). SPEC-006 (negative paths and unsubscription) exists as open **PR #6** on branch `feat/spec-006-negative`, awaiting the maintainer's review/merge; that unmerged work is **out of scope** for this review and is noted only as repository context.
- **Validation run for this review (all three registry gates, per `docs/project-contract.md`), executed against a clean checkout of `main` at `8ad726e`:**
  - `npm ci` - clean install, **0 vulnerabilities** reported on install
  - `npm run typecheck` - **pass**
  - `npm run lint` - **pass**
  - `npm run test:smoke` - **pass, 8/8 scenarios** against the live public API (SPEC-001: 5/5, SPEC-002: 3/3); no `EnvironmentBlockedError` outcomes occurred
  - `npm audit` - **0 vulnerabilities**
  - The `@extended` suite was **not** run (nightly-only per live-API etiquette; registry instruction).

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md) - design/code quality bullets, highlights, pedagogical value
2. [Risks and Issues](02_RISKS_AND_ISSUES.md) - numbered findings, high to low, with evidence and remediation
3. [Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md) - the single-project deep dive
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) - suite vs driver vs CI vs docs, within this repo
5. [Recommendations](05_RECOMMENDATIONS.md) - refactors, next steps, future ideas
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) - Test Pyramid, SOLID, KISS, YAGNI, ISTQB, pedagogy
7. [Migration Plans](07_MIGRATION_PLANS.md) - roadmap-shaped plans (SPEC roadmap, CI evolution, upgrade path)

## Structure Summary

This is a single-repository review following the portfolio template's "Single-repository reviews" customisation: `03_PROJECT_REVIEWS/` carries one project file, and `04_CROSS_PROJECT_ANALYSIS.md` analyses cross-cutting concerns *within* the repo (feature suite, Screenplay layers, Node driver, CI, documentation). Sections that genuinely do not apply are marked `N/A` with a one-line justification rather than padded.

## Key Findings

1. **No HIGH-severity findings.** The suite is green on all three contract gates, `npm audit` is clean, no secrets are in the tree, and documentation matches the code unusually well.
2. **(MEDIUM) Checksum string construction relies on `String(number)`** ([orderBook.ts](cypress/support/books/orderBook.ts) lines 61-75): JavaScript renders very small/large magnitudes in exponential notation, which can diverge from the wire text the platform hashed - a rare-but-real false-failure risk in the flagship assertion. See Risk #1.
3. **(MEDIUM) The maintained-book depth check permits up to 30 levels per side** where `SPECIFICATION.md` Section 8 (SPEC-004) states "book depth never exceeds subscribed length" (25) - a pragmatic relaxation with no in-repo ADR change note, contrary to the SDD working agreement. See Risk #2.
4. **(MEDIUM) `ws:send` always reports `{ ok: true }`** without checking socket readiness ([driver.ts](node-driver/driver.ts) lines 131-135), so a send after an unexpected close surfaces only as a later, misleading poll timeout. See Risk #3.
5. **(LOW) CI jobs have no `timeout-minutes`, `concurrency` group, or `permissions` block** ([ci.yml](.github/workflows/ci.yml)) - a hung live-API run would hold a runner for the 6-hour default. See Risk #5.

## Navigation Guide

Read [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) first for the overall verdict, then [02_RISKS_AND_ISSUES.md](02_RISKS_AND_ISSUES.md) for the actionable list. The project deep dive (03) carries the layer-by-layer evidence; 04-07 support prioritisation and follow-on work. All file references are repository-relative with line numbers taken from the reviewed commit.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
