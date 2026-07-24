# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Test Pyramid - PARTIAL

- The broadest evidence sits at the live system layer: 23 Cypress/Cucumber scenarios exercise the
  real public WebSocket endpoint.
- Seven fast checks cover two previously found edge areas, but there is no general unit-test
  harness for the custom framework and protocol logic.
- No middle-layer component test drives the Node driver with a fake WebSocket or recorded frames.
- The pyramid is therefore inverted. Keep the valuable live apex, but broaden the deterministic
  base and add a driver/component seam.
- Coverage metrics are absent, so critical branch completeness cannot be assessed quantitatively.

## SOLID Principles

### Single Responsibility Principle - STRONG

- Driver, predicate interpreter, protocol types, schemas, config, Screenplay core, Tasks, Questions,
  and step glue have clear responsibilities.
- `CommunicateOverWebSocket` has a coherent bridge role, although it also owns error
  classification; this is proportionate at the current size.
- Invariants moved out of step definitions into schema/book modules, preserving glue readability.

### Open/Closed Principle - GOOD

- New channel behaviour can be added with schemas, Tasks, Questions, and feature steps without
  modifying the Screenplay core.
- The predicate discriminated union is explicit and exhaustive, making DSL extension deliberate.
- Adding a new DSL kind or operator requires modifying protocol types, interpreter, and docs, which
  is appropriate for a small governed contract.

### Liskov Substitution Principle - GOOD

- All Activities honour the Cypress-chainable execution contract used by `Actor.attemptsTo()`.
- Question generics preserve answer types through Ensure/Expectation.
- No inheritance override weakens a base postcondition; most extensibility uses small abstract
  contracts rather than deep class hierarchies.

### Interface Segregation Principle - STRONG

- Ability, Activity, Question, and protocol types are small and role-specific.
- Node bridge contracts expose only open/send/poll/close/reset/session operations.
- Channel-specific Tasks do not depend on unrelated framework APIs.

### Dependency Inversion Principle - PARTIAL

- High-level Tasks and Questions depend on the Ability rather than importing the Node driver.
- Browser/Node separation is strong at the Cypress task boundary.
- The Node driver constructs `WebSocket` and uses real timers directly, leaving no injected seam for
  deterministic component tests.
- Introduce a narrow socket/timer interface only when adding driver tests; avoid a general DI
  container.

## KISS - STRONG

- The Screenplay implementation is compact and uses ordinary classes/functions.
- The serialisable predicate DSL deliberately performs selection only, leaving assertion semantics
  in Questions.
- One config module and one per-scenario Ability keep state discoverable.
- The checksum serializer should remain a small deterministic function with fixtures; a large
  numeric abstraction would be disproportionate unless current wire rules require it.

## YAGNI - STRONG

- No authenticated trading, UI automation, load harness, or production reconnection library has
  been added outside project goals.
- SPEC-007 remains stretch rather than being implemented speculatively.
- Only the channel-specific Tasks and Questions needed for SPEC-001 through SPEC-006 exist.
- A replay adapter and injectable driver seam are justified only as targeted responses to current
  deterministic coverage gaps.

## REST and OpenAPI - N/A

N/A - the runtime target is an external public WebSocket protocol and the repository owns no REST
service or OpenAPI definition. REST volume data was used historically to choose a quiet symbol,
not as an executable contract.

## ISTQB Strategy Alignment - GOOD

- **Use-case testing:** each feature models a market-data consumer journey through connection,
  subscription, observation, and teardown.
- **Equivalence partitioning:** valid public channels, invalid symbol, invalid channel, reachable,
  unreachable, and malformed endpoints cover meaningful input classes.
- **Boundary value analysis:** timeout boundaries and checksum numeric representation need stronger
  deterministic tests; current exponent cases assert failure rather than required support.
- **State transition testing:** connect/open, subscribe/ack/data, unsubscribe/ack/silence, and
  ping/pong transitions are explicit and independently exercised.
- **Error guessing and exploratory evidence:** ticker extra fields, generic 10300 errors, heartbeat
  cadence, candle order, and book overshoot are recorded from live observations.

## Pedagogical Value - STRONG

- ADRs explain why the architecture exists and distinguish constraints from preferences.
- The README layer diagram maps accurately to repository folders and code vocabulary.
- Comments generally explain protocol traps and design reasons rather than restating syntax.
- The custom Screenplay core is small enough to teach pattern mechanics without library opacity.
- A fixture-driven unit suite and a reconciled normative status would make the repository easier
  for a learner to trust and experiment with offline.

## Overall Architecture Verdict

The architecture is simple, coherent, and well matched to the Cypress/WebSocket constraint. Its
main weakness is not structural complexity but evidence distribution: too much confidence depends
on a live exchange. The observed checksum failure shows why the pure protocol core now needs a
broader deterministic test base.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
