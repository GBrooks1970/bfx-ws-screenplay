# Project Review: bfx-ws-screenplay

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Cross-Project Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: this is the only project file, per the template's single-repository
customisation notes.

## Architecture and design patterns

- The seven-layer model (Gherkin -> glue -> Tasks/Questions -> Ability -> cy.task bridge ->
  Node driver -> SUT) is real, not aspirational: imports flow strictly downward, and the only
  place transport vocabulary appears above layer 5 is the Ability's translation surface
  ([CommunicateOverWebSocket.ts](../../../cypress/support/screenplay/abilities/CommunicateOverWebSocket.ts)).
- The in-house Screenplay core (~9 small files under
  [cypress/support/screenplay/core/](../../../cypress/support/screenplay/core/index.ts)) mirrors
  hand-baked-screenplay-pattern's API while adapting `performAs` to return
  `Cypress.Chainable` - the adaptation is documented where it bites
  ([Activity.ts](../../../cypress/support/screenplay/core/Activity.ts) lines 6-13).
- The attempt/outcome pattern (task records to the notepad, question recalls - no scenario
  failure inside the attempt) is applied uniformly to connections
  ([AttemptConnection.ts](../../../cypress/support/screenplay/tasks/AttemptConnection.ts)) and
  subscriptions ([AttemptSubscription.ts](../../../cypress/support/screenplay/tasks/AttemptSubscription.ts)),
  which keeps negative-path scenarios honest.

## Code quality and maintainability

- Strict TypeScript with `noUncheckedIndexedAccess` ([tsconfig.json](../../../tsconfig.json))
  forces the guard-then-use style visible throughout the questions; `no-explicit-any` is an
  ESLint error with the single `unknown` ingress at the driver's `bufferFrame`.
- Pure logic is genuinely pure: `cypress/support/books/` (fold, CRC-32, invariants) has no
  Cypress or network imports, which is what makes the standalone `tsx` proof scripts possible.
- Naming follows the spec's conventions (Tasks as verb phrases, Questions as noun phrases)
  without exception across 13 tasks and 15 question modules.
- Weakness: the `unsubscribed` ack cast (Risk #1) and the locally re-declared `FieldMatch`
  (Risk #8) are the two places where the otherwise uniform conventions crack.

## Test coverage and approach

- 23 scenarios across six feature files; `@smoke` (SPEC-001/002, 8 scenarios) on push,
  `@extended` (SPEC-003..006, 15 scenarios) nightly - matching the documented live-API
  etiquette exactly. Two `@negative @offline` scenarios cover connection failure without the
  network.
- Assertion discipline holds: every assertion observed is protocol conformance, schema
  validity, or an invariant; no market-value equality anywhere (ADR-004 verified by
  inspection of all six step files).
- Deferred coverage is explicit and matches the docs: SPEC-007 (sequencing) is the only
  planned-but-unimplemented unit, marked stretch in [SPECIFICATION.md](../../../SPECIFICATION.md)
  (lines 282-285), [README.md](../../../README.md) (line 69), and the backlog roadmap - no
  quarantined or silently skipped scenarios exist (no `@skip`/`@quarantine` tags in the tree).
- Suite stability rests on named bounded waits with probe-derived margins
  ([config/index.ts](../../../cypress/support/config/index.ts) lines 17-44) - each timeout
  constant records the live observation that justifies it.

## Documentation quality

- Six ADRs, a normative specification, a predicate-DSL contract doc, and a scored backlog -
  all cross-referenced. The SDD trail (review-pack question numbers, probe dates) is
  embedded in code comments at the exact decision points.
- Live-vs-docs deltas are first-class documentation: the undocumented 11th ticker element
  ([tickerChannel.ts](../../../cypress/schemas/tickerChannel.ts) lines 31-38) and the generic
  10300 error code ([errorEvent.ts](../../../cypress/schemas/errorEvent.ts) lines 4-13).
- Weaknesses: backlog v7's stale PR-#9 state (Risk #2) and ADR-006's stale file reference
  (Risk #3) - both artefacts of the remediation PR describing itself.

## Strengths and weaknesses summary

- **Strengths:** flagship checksum verification with buffer-index determinism; deterministic
  post-unsubscribe silence via sync barrier; environment-blocked as a first-class outcome;
  exemplary schema catalogue; supply-chain hygiene (exact pins, overrides, audit 0, MIT).
- **Weaknesses:** one schema-catalogue bypass (Risk #1); self-referential doc staleness from
  PR #9 (Risks #2-#3); proof scripts not wired into CI (Risk #4); undocumented inline-predicate
  threshold (Risk #5).

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Cross-Project Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
