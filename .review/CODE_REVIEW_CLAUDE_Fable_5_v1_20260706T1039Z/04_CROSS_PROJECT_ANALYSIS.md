# Cross-Cutting Analysis (within the repository)

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: per the template's customisation notes, the nine cross-project areas are applied as cross-cutting analyses *within* this repo (test suite vs Screenplay layers vs Node driver vs CI vs documentation). Areas that do not apply are marked `N/A` with a justification.

## Tool-Agnostic Tests

- The Gherkin layer is fully tool-agnostic: no scenario mentions Cypress, tasks, buffers, or timeouts - a Playwright or plain-Node runner could adopt the feature files unchanged.
- The domain logic most worth porting (book fold, CRC-32, invariants, schemas) is pure TypeScript with no Cypress imports ([cypress/support/books/](cypress/support/books/), [cypress/schemas/](cypress/schemas/)) - deliberate portability.
- Layer 3 downward is intentionally Cypress-coupled (`Cypress.Chainable` in every `performAs`); ADR-002 documents this as the price of chainable-native adaptation, and the promise-native sibling library shows the alternative. Coupling is confined and explained rather than absent.

## Code-Agnostic Tests

- Scenario meaning is carried by protocol behaviour (acks, snapshots, frames), not by implementation detail, so the suite specifies the *API*, not the framework - e.g. [SPEC-004-book-channel.feature](cypress/e2e/features/SPEC-004-book-channel.feature) would be equally valid against a Python implementation.
- The predicate DSL ([predicate-dsl.md](docs/predicate-dsl.md)) is a language-neutral JSON contract; the driver could be re-implemented in another language against the same spec, which is exactly the property a bridge contract should have.
- N/A beyond this - single-language repository by design; there is no multi-stack parity requirement here.

## Single Source of Truth

- [SPECIFICATION.md](SPECIFICATION.md) is the declared normative source, and the repo honours it: catalogue additions discovered during units are written *back into the spec* with dates (Sections 6.3/6.4/7.3 annotations, e.g. `ws:sessions` "added 4 July 2026, SPEC-001 review").
- Structural truth is centralised in the schema modules; behavioural truth in the feature files; operational truth (timeouts/symbols/codes) in one config module - the three do not overlap or contradict.
- One deviation found where implementation silently departs from the spec's stated invariant (depth 25 vs 30 - Risk #2); one catalogue-vs-implementation lag that is legitimate roadmap (SPEC-006/007 Questions listed normatively but not yet built).

## API Contract Compliance

- The repo tests *against* a third-party WebSocket API rather than exposing one, so REST/OpenAPI compliance is N/A in the publishing sense; the analogous discipline - written message contracts with verified-against-docs headers and live-vs-docs deltas - is present and strong (every schema file cites its docs URL and verification date).
- Discovered divergences between Bitfinex docs and the live feed (ticker's 11th element, candles newest-first ordering) are documented at the guard and asserted deliberately with review approval recorded - exemplary handling of an imperfectly documented upstream API.

## Screenplay Parity

- Vocabulary parity with the reference `hand-baked-screenplay-pattern` library is high (`Actor.named().whoCan()`, `attemptsTo`, `abilityTo`, `Ensure`/`Expectation`), so a reader can move between the two repos and see the same pattern under two execution models.
- The two deliberate divergences (chainable-native `performAs`; the notepad `remembers`/`recalled` state carrier) are both documented in code comments and ADR-002.
- Parity gap worth watching: `Ensure` failure rendering (Risk #7) - the reference library's promise-native version has richer failure text; the port kept the shape but the `Map` case degrades it.

## Batch File Design

- N/A - the repository contains no batch/PowerShell scripts; all entry points are npm scripts ([package.json](package.json) lines 17-23), which is appropriate for its size.

## Documentation Alignment

- Backlog v4 claims were validated against the repo: SPEC-001..005 complete (matches merged history `13e7b1c`..`8ad726e`), 0 HIGH/MEDIUM risks (fair - this review's MEDIUMs are new findings, not known-and-omitted items), audit-overrides resolution (verified: `npm audit` = 0), Cypress 15.18.0 drift note (matches the pin table).
- README, spec progress table, contract, and registry row all tell the same story; the README's pin table matches `package.json` exactly.
- Gaps: the depth-invariant deviation (Risk #2); `engines >=20` vs Node-24 pins is tracked openly in the backlog rather than hidden - good; the backlog's "Cross-reference code review findings in `.review/` (none yet)" line becomes stale the moment this review lands and should be updated with it.

## Logging Alignment

- Screenplay activity logging is uniform: every `attemptsTo` emits a `screenplay`-named Cypress log line with actor + activity description ([Actor.ts](cypress/support/screenplay/core/Actor.ts) lines 47-52), while all `cy.task` plumbing is `{ log: false }` - the command log therefore reads as a business narrative, which is the pattern's point.
- Failure channels are consistently typed (`AssertionError` / `ConfigurationError` / `EnvironmentBlockedError`, [errors.ts](cypress/support/screenplay/core/errors.ts)) with the `environment-blocked:` message prefix as the report-filterable marker.
- Weak spot: the Node driver itself logs nothing (no connection open/close/error trace), so post-mortem analysis of a CI failure relies entirely on the browser-side narrative; a debug-gated driver log would help triage the live-API cases.

## Test Coverage Metrics

- 19 scenarios across 5 feature files: 8 `@smoke` (run per push; re-verified live in this review, 8/8) and 11 `@extended` (nightly). Negative-path coverage in `main` is connection-level only (2 `@negative @offline` scenarios); protocol-level negatives are SPEC-006's remit.
- Zero unit-level tests: the pure book/CRC modules (approx. 150 lines of the most consequential logic) are exercised only through live E2E - see the Test Pyramid discussion in [06_ARCHITECTURE_ASSESSMENT.md](06_ARCHITECTURE_ASSESSMENT.md).
- No coverage tooling is configured; for a 19-scenario E2E suite this is reasonable, and scenario-per-SPEC-unit traceability (tags) substitutes adequately for coverage numbers.

---

[<- Previous: Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
