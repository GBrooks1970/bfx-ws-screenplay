# Code Review: bfx-ws-screenplay (v2)

**Reviewer:** AI assistant (CLAUDE Fable 5)
**Date:** 2026-07-18T06:08Z
**Scope:** Full single-repository review of `bfx-ws-screenplay` at commit `3247130`
(merge of PR #9, the BFX-01..08 remediation of code review v1)
**Prior review:** `CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z/` (2026-07-06; Risks #1-#7
resolved via BFX-01..07, Risk #8 tracked in the backlog)

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
4. [Cross-Project Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

## Structure Summary

This is a single-repository review following the portfolio code-review template's
single-repository customisation notes: `03_PROJECT_REVIEWS/` carries one project file, and
`04_CROSS_PROJECT_ANALYSIS.md` is a cross-cutting analysis within the repo (suite vs driver
vs CI vs schemas vs documentation). Sections that genuinely do not apply carry an
`N/A - justification` line rather than filler.

## Key Findings

1. **The v1 remediation cycle held up under re-review.** All seven resolved v1 risks were
   verified against the current tree and are genuinely fixed (wireNumber guard, ADR-006,
   socket-state-aware send, invariant relocation, CI hardening, conf-ack schema, serialisable
   book diagnostics). Gates run for this review: typecheck clean, lint clean, `test:smoke`
   8/8 green against the live API, both standalone proof scripts pass, `npm audit` 0.
2. **Risk #1 (MEDIUM):** the `unsubscribed` ack is validated by an unguarded type cast in
   [TheUnsubscriptionConfirmation.ts](../../cypress/support/screenplay/questions/TheUnsubscriptionConfirmation.ts) (line 21),
   bypassing the schema catalogue - the same defect class as v1's conf-ack finding (Risk #6),
   fixed for `conf` but not applied to `unsubscribed` when SPEC-006 landed.
3. **Risk #2 (LOW):** the backlog (v7) - the project's canonical status document - still
   states in eight places that PR #9 is "open, not yet merged as of 2026-07-17", but PR #9
   is merged and is the current HEAD (`3247130`). Documentation drift is the recurring
   portfolio theme; this instance sits in the source-of-truth file itself.
4. **Risk #3 (LOW):** ADR-006 points at the old home of the depth invariant
   (`spec-004.steps.ts`); BFX-04 relocated it to `cypress/support/books/invariants.ts`
   later in the same PR, leaving the ADR's file reference stale on arrival.
5. **No HIGH findings.** The suite design (buffer-index-deterministic checksum verification,
   ping/pong sync barrier for post-unsubscribe silence, environment-blocked as a first-class
   outcome) remains the strongest live-API testing demonstration in the portfolio.

## Navigation Guide

Read `01_EXECUTIVE_SUMMARY.md` for the overall verdict, then `02_RISKS_AND_ISSUES.md` for
the ordered findings with evidence and remediation. The project deep-dive is in
`03_PROJECT_REVIEWS/`; architecture-principle alignment is in `06_ARCHITECTURE_ASSESSMENT.md`.
File links in review files are repository-relative from this directory
(`../../` reaches the repo root).
