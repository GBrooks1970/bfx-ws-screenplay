# Cross-Cutting Analysis (within the repository)

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: the template's nine cross-project areas are applied as
cross-cutting concerns between the repo's own layers (suite, driver, schemas, CI, docs).

## Tool-Agnostic Tests

- The Gherkin layer is fully tool-agnostic: no Cypress vocabulary appears in any feature file.
- The domain layers are portable in design: Tasks/Questions depend on the Ability interface,
  and the pure book modules have zero runner coupling - a Playwright port would reuse them
  unchanged.
- The Screenplay core is deliberately Cypress-native (`Cypress.Chainable` in
  `Activity.performAs`), a documented trade-off (ADR-002) rather than an accident; porting
  cost is confined to core + ability.

## Code-Agnostic Tests

- Feature files express behaviour without implementation language leakage; step text like
  "5 consecutive checksum frames each match her locally maintained book" is
  business-readable while precisely testable.
- N/A beyond that - single-language repo (TypeScript throughout), so cross-language parity
  does not arise.

## Single Source of Truth

- `SPECIFICATION.md` is the normative behaviour source; feature files are its executable
  projection; `docs/backlog.md` is the status source. The chain is explicit and mostly honest.
- Two truth violations found, both in the status/governance chain, not behaviour: backlog v7's
  stale PR-#9 state (Risk #2) and ADR-006's stale file reference (Risk #3).
- Config truth is centralised exactly as ADR-005 demands: every timeout, symbol, endpoint and
  flag lives in [cypress/support/config/index.ts](../../cypress/support/config/index.ts).

## API Contract Compliance

- The project tests someone else's API rather than shipping one: compliance is expressed as
  the schema catalogue, with each guard citing its docs URL and verification date.
- Where the live platform deviates from its documentation, the repo records the delta and
  asserts observed reality (ticker's 11th element; generic error code 10300) - the correct
  posture for a black-box consumer.
- The internal bridge contract (spec section 7.3) matches the implementation task-for-task
  ([node-driver/tasks.ts](../../node-driver/tasks.ts)), including the SPEC-001-era `ws:sessions`
  addition and the BFX-03 `SendResult` change, both recorded in the docs.

## Screenplay Parity

- Vocabulary parity with hand-baked-screenplay-pattern is maintained (`whoCan`, `abilityTo`,
  `attemptsTo`, `Ensure.that`), with the chainable-vs-promise divergence documented at its
  source (ADR-002; `Activity.ts` comment).
- Internal parity is high: all subscribe tasks follow the same send-await-guard-remember
  shape; all buffer questions follow poll-guard-project.
- The one parity gap is Risk #1: every other ack is schema-guarded; `unsubscribed` is cast.

## Batch File Design

- N/A - the repo contains no batch/shell scripts; automation entry points are npm scripts
  plus two `tsx` scripts, reviewed under Risk #4.

## Documentation Alignment

- README, SPECIFICATION, ADRs, predicate-DSL doc and backlog agree on architecture, pins,
  etiquette and roadmap status; the README pin table matches `package.json` exactly.
- Misalignments found are the two staleness items (Risks #2-#3) plus the benign engines-floor
  question the backlog already tracks (Risk #7).
- `docs/project-contract.md` gates match the registry row (typecheck, lint, test:smoke) -
  the cascade resolved first-hit at the project contract, and this review ran exactly those.

## Logging Alignment

- Screenplay activity logging is uniform: `Actor.attemptsTo` emits one `screenplay` log line
  per activity ([Actor.ts](../../cypress/support/screenplay/core/Actor.ts) line 47), and all
  bridge calls pass `{ log: false }` so the command log stays domain-level.
- Failure diagnostics are aligned by construction after BFX-07: Questions answer serialisable
  projections, so `Ensure`'s `JSON.stringify` prints real state
  ([Ensure.ts](../../cypress/support/screenplay/core/Ensure.ts) lines 13-19).
- Reporting is consistent: messages/JSON/HTML outputs to `reports/`
  ([.cypress-cucumber-preprocessorrc.json](../../.cypress-cucumber-preprocessorrc.json)),
  uploaded as CI artefacts from both jobs.

## Test Coverage Metrics

- 23 scenarios / 6 features / 13 tasks / 15 question modules / 9 schema modules; 8 scenarios
  in the push-gated smoke lane (verified 8/8 green in this review), 15 in the nightly lane.
- No code-coverage instrumentation - reasonable for an E2E-against-live-API suite where the
  meaningful metric is protocol-surface coverage (all four in-scope channels plus lifecycle,
  negative paths and unsubscription are covered; sequencing is the documented stretch gap).

---

[<- Previous: Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
