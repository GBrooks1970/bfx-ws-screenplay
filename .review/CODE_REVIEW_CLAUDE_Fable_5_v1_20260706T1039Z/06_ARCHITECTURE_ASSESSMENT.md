# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

## Test Pyramid

- **Alignment:** deliberately E2E-heavy and honest about it - the project's purpose is live-API behaviour, and every scenario earns its network round-trip. The `@smoke`/`@extended` split plus offline `@negative` scenarios keep the per-push cost proportionate.
- **Gap:** the pyramid has no base. The pure modules ([orderBook.ts](cypress/support/books/orderBook.ts), [crc32.ts](cypress/support/books/crc32.ts), [predicates.ts](node-driver/predicates.ts), the schema guards) are unit-testable by construction yet only executed through live E2E. A checksum or predicate regression is currently detectable only against non-deterministic live data. Cheap to fix; see Recommendations.

## SOLID Principles

- **SRP:** strong throughout - one Task/Question/schema per concern; the driver does transport, the ability does translation, `Ensure` does assertion. The step files' invariant helpers are the only SRP smudge (Risk #4).
- **OCP:** the predicate DSL and schema catalogue extend by addition (new `kind`s, new guards) with documented contract-change notes; `TheSubscriptionConfirmation`'s channel union grows per unit without modification of behaviour.
- **LSP:** `Task`/`Interaction`/`Question` abstracts are substitutable everywhere `Activity` is consumed; `AnonymousInteraction`/`AnonymousQuestion` honour the same contracts.
- **ISP:** interfaces are minimal (`Activity` = `performAs` + `toString`); the bridge exposes six narrow task contracts rather than one god-task.
- **DIP:** Layers 1-3 depend on the `CommunicateOverWebSocket` abstraction, never on `cy.task` names or `ws` - verified by import inspection across the tree.

## KISS (Keep It Simple, Stupid)

- The core insight (buffer + poll instead of listeners + events) removes an entire class of async complexity; the Screenplay core is ~200 lines with zero cleverness.
- The predicate DSL resists scope creep explicitly ("the DSL does frame selection only") - the `label`/`where` extension was added only when SPEC-003's pairing invariant demanded it, with a change note.
- Minor complexity debt: the checksum question's nested `.then` chains are dense but necessary given chainable semantics; comments carry the reader through.

## YAGNI (You Aren't Gonna Need It)

- Largely honoured: no reconnection library, no report portal, no abstraction for channels that do not exist yet. `AttemptInvalidSubscription` from the spec catalogue is correctly absent until SPEC-006.
- Two forward declarations are tolerated intentionally (`SYMBOLS.quiet = null`, `heartbeatWaitMs`) - documented placeholders required by the spec's confirmation record rather than speculative code. Acceptable, but they are the only unused code in the repo.

## REST + OpenAPI

- N/A as a publishing concern - the repo consumes a third-party WebSocket API and exposes none. The equivalent contract discipline (in-repo message schemas with docs-URL + verification-date headers, documented live-vs-docs deltas) is present and better maintained than most OpenAPI consumers manage.

## ISTQB Strategies

- **Equivalence partitioning / boundary awareness:** endpoint keys partition connection outcomes (valid/unreachable/malformed); schemas enforce exact-length vs minimum-length boundaries deliberately (4-element trades reject funding's 5; ticker tolerates >=10 with documented rationale).
- **State transition testing:** the connection lifecycle unit walks connect -> info -> ping/pong -> close -> session-released; subscription flows assert ack -> snapshot -> update ordering via buffer indexes.
- **Use case testing:** each SPEC unit is a business-readable use case from the Marketa persona's perspective.
- **Negative testing:** present at connection level in `main`; protocol-level negatives (error codes, unsubscription) are correctly scheduled as SPEC-006 rather than skipped silently.
- Decision tables are N/A for this protocol surface; the parameterised book Scenario Outline the spec suggests (prec/freq via outline) was implemented as a single pinned combination - a conscious narrowing worth an explanatory line in the spec.

## Pedagogical Comments

- Consistently explain *why*: the chainable-vs-promise adaptation ([Activity.ts](cypress/support/screenplay/core/Activity.ts)), the buffer-log rationale ([driver.ts](node-driver/driver.ts) lines 12-19), the candles field-order trap with "do not fix it" ([candlesChannel.ts](cypress/schemas/candlesChannel.ts) lines 15-17), and dated live-probe evidence in the timeout constants.
- Comments carry provenance (dates, review-question references, probe results), which teaches the *method* - evidence-based test design - not just the code.
- The one place needing more: `checksumString`'s number-formatting assumption deserves the same "trap" treatment the candles schema got (ties to Risk #1).

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
