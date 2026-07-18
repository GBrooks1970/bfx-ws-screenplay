# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

## Test Pyramid

- Deliberately E2E-heavy for an API-conformance suite, with the pure layer (books, CRC-32,
  invariants) unit-checkable and actually unit-checked by the two `tsx` proof scripts -
  though those are not yet CI-gated (Risk #4).
- The two `@offline` scenarios give a fast, network-free negative lane inside the E2E suite.
- Alignment: appropriate. Gap: none structural; wiring the pure checks into CI would make
  the small unit base load-bearing.

## SOLID Principles

- **SRP:** strong - one task/question/schema per concern; the driver does transport only.
- **OCP:** the predicate DSL extends by new `kind`/fields with a documented contract-change
  process; the question catalogue grew per SPEC unit without modifying core.
- **LSP:** all Activities honour the `performAs` contract; anonymous and named forms are
  interchangeable.
- **ISP:** the single Ability is cohesive (open/send/poll/close/sessions); no fat interfaces.
- **DIP:** upper layers depend on the Ability abstraction, not the bridge; the one inversion
  wobble is the ability importing driver types directly from `node-driver/protocol.ts` -
  acceptable, since those are the shared wire contract.

## KISS

- The Screenplay core is ~9 tiny files; the driver is 187 lines; the DSL has three kinds and
  three operators. Complexity budget is spent where it earns (checksum determinism), not on
  framework ceremony.

## YAGNI

- Honoured: no reconnection library, no sequencing plumbing ahead of SPEC-007's decision, no
  speculative DSL operators (each was added only when a SPEC unit needed it, per the
  contract-change log in [docs/predicate-dsl.md](../../docs/predicate-dsl.md) lines 47-57).

## REST + OpenAPI

- N/A - the SUT is a WebSocket API; the REST surface is used only once, off-line, to select
  the quiet pair (documented in [config/index.ts](../../cypress/support/config/index.ts)
  lines 51-57). Schema guards play the OpenAPI role for the wire contract.

## ISTQB Strategies

- Equivalence partitioning and boundary thinking are visible in endpoint classes
  (public/unreachable/malformed) and the negative-subscription pair (unknown symbol vs
  unknown channel).
- State transition testing underlies the lifecycle and unsubscription scenarios
  (open -> subscribed -> unsubscribed -> silent; verified via index scans).
- Error guessing is upgraded to probe-driven fact-finding (live-vs-docs deltas asserted).

## Pedagogical Comments

- Consistently explain why at the point of surprise: the candle field-order trap, the
  exponent-notation guard, the sync-barrier TCP-ordering argument, the chainable-vs-promise
  adaptation. Aimed at and suitable for mid-level engineers; this is a model repo for the
  practice.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
