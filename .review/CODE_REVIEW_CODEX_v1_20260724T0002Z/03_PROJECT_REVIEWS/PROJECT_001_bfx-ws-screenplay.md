# Project Review: bfx-ws-screenplay

[<- Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Project Purpose and Stack

The repository tests Bitfinex's unauthenticated public WebSocket API v2 using Cypress 15,
TypeScript, the Badeball Cucumber preprocessor, `ws`, and a small in-house Screenplay
implementation. `SPECIFICATION.md` is the normative SDD design source and `docs/backlog.md` is the
canonical current-status source.

## Review Summary

- **Architecture and patterns:** The layer boundary is both documented and implemented. Gherkin
  maps to glue-only steps, Screenplay Tasks and Questions carry domain intent, the Ability owns the
  browser-to-Node translation, and `node-driver/` owns transport state. This is a faithful,
  Cypress-aware Screenplay adaptation rather than a decorative use of pattern names.
- **Correctness and reliability:** Buffer indexes, predicate-based waits, named timeouts, a
  per-scenario connection, and unconditional reset are strong foundations. The current
  `wireNumber()` limitation is nevertheless a correctness blocker for the flagship checksum
  scenario, as demonstrated by the latest nightly default-branch failure.
- **Coverage and test approach:** The 23 scenarios cover lifecycle, ticker, trades, order book,
  candles, negative subscriptions, unsubscription, and heartbeats. The suite is system-heavy:
  seven standalone checks do not yet provide broad deterministic evidence for the substantial
  custom driver, schemas, DSL, and fold/checksum code.
- **Executable specifications:** Feature files use the Marketa persona consistently, state one
  behaviour per scenario, avoid implementation vocabulary in steps, and use tags coherently.
  The negative/offline connection scenarios correctly remain in smoke because they do not hit
  additional live channels.
- **Data and API assumptions:** Tests use public, unauthenticated market data and assert schemas,
  protocol flow, and invariants rather than fixed market values. Symbols, channel settings, and
  timeouts are centralised. The quiet-pair choice is empirically justified but should be treated
  as replaceable data because liquidity changes.
- **CI and operations:** Smoke versus nightly extended separation respects live-API etiquette.
  Least-privilege permissions, npm caching, timeouts, concurrency, and artefact publication are
  implemented well. The missing audit gate and current red nightly require attention; action
  references are major-version tags rather than immutable commit SHAs.
- **Documentation and portfolio credibility:** README, ADRs, predicate DSL documentation, and
  backlog provide unusually good design rationale. Current credibility is reduced by stale audit/
  dependency claims and normative status/Node contradictions, all of which are straightforward to
  reconcile after the checksum defect.

## Runtime Lifecycle, Isolation, and Synchronisation

- [hooks.ts](../../../cypress/support/step_definitions/hooks.ts) (lines 14-24) creates one Actor
  before each scenario and invokes `ws:reset` after every scenario outcome.
- [driver.ts](../../../node-driver/driver.ts) (lines 66-121) registers a session before open
  completion, bounds the info-event wait, and removes/terminates a failed session.
- [CommunicateOverWebSocket.ts](../../../cypress/support/screenplay/abilities/CommunicateOverWebSocket.ts)
  (lines 103-138) lets the Node-side poll finish before Cypress's task timeout and rescans for
  known maintenance codes on timeout.
- [Unsubscribe.ts](../../../cypress/support/screenplay/tasks/Unsubscribe.ts) (lines 22-58) uses an
  acknowledgement plus correlated pong as a deterministic barrier before checking silence.
- Inference: high-frequency inbound buffers are unbounded for the scenario lifetime. Current
  scenarios are short and reset after each one, so this is not a present defect; longer stretch or
  soak work should introduce an explicit retention policy.

## Deferred and Planned Coverage

- SPEC-001 through SPEC-006 are present as six feature files and 23 scenarios.
- SPEC-007 sequencing remains explicitly tagged as stretch in
  [SPECIFICATION.md](../../../SPECIFICATION.md) (lines 282-287); no sequencing feature, task,
  question, or configuration flag was found, so the backlog's "open decision" description is
  accurate.
- No scenario is quarantined, skipped, pending, or marked as expected failure in the current
  feature set.
- `@extended` was not run locally for this review, in accordance with the project contract.
  Remote nightly evidence was inspected instead.

## Data, Token, and Authentication Assumptions

- No API key, token, credential, account, or authenticated channel is required or present.
- All scenario data is repository-controlled configuration or live public market data.
- Invalid subscription strings are constant fixtures, not untrusted user input.
- The suite relies on Bitfinex's public endpoint availability and live protocol compatibility.
  Known maintenance status is named `environment-blocked`; the observed checksum failure is not
  in that category.
- The repository makes no REST/OpenAPI contract implementation. The historical REST volume survey
  used to choose a quiet symbol is documented evidence, not a runtime dependency.

## Validation and Current Health

| Area | Evidence |
|---|---|
| Install | `npm ci` completed; direct tree subsequently valid |
| Static | Typecheck and lint pass |
| Pure proofs | 7/7 pass |
| Live smoke | 8/8 pass on Node 20.19.5 |
| Live extended | Not run locally; latest remote nightly 22/23 with SPEC-004 failure |
| Dependency audit | One high transitive advisory |
| Licence | Project MIT; direct packages inspected are MIT or Apache-2.0 |

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
