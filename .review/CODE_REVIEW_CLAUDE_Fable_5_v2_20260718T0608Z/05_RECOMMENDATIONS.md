# Recommendations

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

## Recommended Refactors (priority order)

- **Add `isUnsubscribedAck` to the schema catalogue** and use it in
  `TheUnsubscriptionConfirmation` and `Unsubscribe` (Risk #1) - completes the BFX-06 pattern
  for the last unguarded event type; under an hour plus one targeted `@extended` run.
- **Wire the pure proof scripts into npm + CI** (Risk #4): `check:book-diagnostics` script, a
  composite `check:pure`, and a CI step in the smoke job - network-free, seconds of runtime.
- **Refresh backlog to v8** correcting the merged state of PR #9, and fix ADR-006's file
  reference to `cypress/support/books/invariants.ts` (Risks #2-#3) - one docs-only commit.
- **Record the inline-predicate threshold in ADR-003** (or relocate the remaining helpers
  beside their schemas) so the glue-layer boundary is principled rather than habitual (Risk #5).
- **Align the extended CI job's gates** with the smoke job (add typecheck + lint) (Risk #6).

## Next Steps

- Triage this review's findings into the backlog per the portfolio convention (the v1 cycle
  proved the review -> triage -> worklist -> PR loop works well here).
- Decide SPEC-007 (sequencing): the backlog and spec both mark the decision as still open;
  the `conf` plumbing from SPEC-004 makes its marginal cost small, and it would close the
  last item in spec section 8. If declined, record the closure decision so "stretch" does
  not read as "forgotten".
- On the next deliberate dependency bump, follow backlog Risk #1's pinned-trio procedure
  (preprocessor peer range first) - Cypress 15.18.0 already sits outside the current peer cap.

## Future Project Ideas

- **SPEC-007 as a public demonstration of sequence-gap testing** - strictly monotonic
  sequence numbers over a live feed is a rare, interview-strong artefact and the natural
  capstone here.
- **A Playwright port of the domain layers** - the pure books modules and Tasks/Questions
  vocabulary would transfer; the exercise would demonstrate exactly which layers the
  Cypress adaptation (ADR-002) actually touches.
- **Reconnection/resilience probing (currently a non-goal)** - if ever promoted, the
  attempt/outcome pattern and the environment-blocked machinery are the right foundations;
  keep it out of scope until the spec changes (YAGNI holds today).

---

[<- Previous: Cross-Project Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
