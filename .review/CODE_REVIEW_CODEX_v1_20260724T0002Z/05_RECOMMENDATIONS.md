# Recommendations

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Recommended Refactors

- **P0:** Complete exponent-to-plain-decimal checksum serialisation and prove it with known
  Bitfinex-compatible fixtures before relying on the flagship live assertion.
- **P1:** Remediate the high transitive audit advisory through a reviewed lockfile/parent update or
  the smallest proven compatible override; add an explicit CI audit policy.
- **P1:** Introduce a conventional deterministic unit suite for protocol predicates, schemas,
  book folding, CRC/checksum fixtures, driver lifecycle, and environment-block routing.
- **P2:** Add checksum-frame and heartbeat type guards to the central schema catalogue.
- **P2:** Reconcile normative specification status/Node policy and refresh README/backlog health
  claims after the code changes land.

## Next Steps

- Triage Risk #1 first because the latest default-branch nightly is red on the portfolio's
  flagship assertion.
- Use the approved SDD path: verify current checksum wire rules, record any design clarification,
  add/approve behavioural evidence, then implement and validate.
- Keep `@extended` work on nightly or explicit dispatch; local development should use deterministic
  fixtures plus the prescribed smoke gate.
- After repair, require at least the documented consecutive targeted green runs before marking
  SPEC-004 healthy again.
- Re-run `npm audit`, update dated dependency evidence, and check that the preprocessor/Cypress/
  esbuild trio remains peer-compatible as a unit.

## Future Project Ideas

- Add a replay adapter that feeds captured, sanitised public frames through the same Questions for
  fast deterministic protocol regression.
- Publish a small JSON fixture pack for book updates and expected CRC values as a language-neutral
  teaching artefact.
- If SPEC-007 is approved, design sequencing as a separate stretch unit using the existing conf
  plumbing and buffer indexes rather than coupling it into checksum code.
- Add mutation testing selectively around predicate evaluation and book folding after unit tests
  establish a fast baseline.

## Recorded Questions

The review ran unattended, so these questions are recorded rather than blocking publication:

1. Should `wireNumber()` support every finite number the public book schema accepts, or should the
   supported precision range be narrowed explicitly after verification against current Bitfinex
   checksum rules?
2. Should Node 20 remain the minimum supported local runtime, with Node 24 only the CI baseline, or
   should `engines` be tightened to match the original normative confirmation?
3. Is SPEC-007 still a desired stretch deliverable, or should the post-SPEC-006 decision be
   recorded as "deferred indefinitely" so the backlog has a terminal state?
4. Should CI fail immediately on high development-tool advisories, or use a documented,
   time-bounded exception mechanism when exploitability is demonstrably absent?

## Acceptance Evidence for the Highest-Priority Repair

- Deterministic unit fixtures serialise exponent-form finite values into exact plain-decimal tokens.
- At least one complete maintained-book fixture matches a known signed CRC-32.
- `npm run typecheck`, `npm run lint`, and the new unit gate pass.
- `npm run test:smoke` passes or records only an explicitly identified `environment-blocked`
  maintenance outcome.
- The approved targeted/full extended CI evidence passes without weakening the checksum assertion.

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
