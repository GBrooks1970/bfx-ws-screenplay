# Cross-Cutting Analysis

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Codex GPT-5)

This is a single-project repository. "Cross-cutting" therefore means alignment among the
executable suite, Screenplay framework, Node driver, protocol schemas, CI, and documentation.

## Tool-Agnostic Tests

- Gherkin scenarios express channel behaviour and protocol outcomes without Cypress commands.
- Screenplay Tasks and Questions isolate most runner-specific mechanics below domain vocabulary.
- Step definitions return Cypress chainables, so the executable glue is not runner-portable even
  though the behavioural specification is.
- The predicate DSL and buffered-frame protocol could be reused by another runner with a new
  transport Ability, but no second adapter proves that portability.

## Code-Agnostic Tests

- Feature files are independent of TypeScript syntax and can be read as protocol specifications.
- Expected schemas and invariants are described in business/protocol terms.
- The wire-number and checksum algorithm are currently implemented only in TypeScript and lack a
  language-neutral fixture set that another implementation could consume.
- Recommendation: store representative input/output fixtures as JSON to make checksum and schema
  contracts independently executable across languages.

## Single Source of Truth

- `SPECIFICATION.md` is normative for design and `docs/backlog.md` is canonical for current status;
  the division is explicit in the project contract.
- `cypress/support/config/index.ts` centralises endpoints, symbols, channel settings, status codes,
  and timeouts.
- Most frame structures live in `cypress/schemas/`, but checksum and heartbeat shapes remain
  exceptions.
- Current status has drifted: the backlog and README claim a clean audit, while the current
  lockfile audit reports one high advisory.

## API Contract Compliance

- The project tests a WebSocket protocol rather than a repository-owned REST/OpenAPI service.
- Event flow, acknowledgements, payload structures, heartbeat, ping/pong, and negative error
  responses are asserted against documented and observed behaviour.
- The suite deliberately records live-versus-docs deltas for ticker extras and generic 10300
  errors instead of fabricating stricter responses.
- No local OpenAPI document applies. The external protocol summaries and in-repo type guards
  serve as the executable contract.

## Screenplay Parity

- Actor, Ability, Task, Interaction, Question, Ensure, and Expectation use consistent vocabulary
  with the referenced hand-baked Screenplay project.
- Cypress chainables replace promise-native activities intentionally and are documented in ADR-002.
- Tasks perform domain actions, Questions retrieve facts, and the Ability wraps the bridge; this
  separation is consistently maintained.
- Some one-expression expectations remain in step files under the documented ADR-003 boundary;
  no substantial branching or iteration logic was found in glue.

## Batch File Design

N/A - the repository contains no batch or PowerShell orchestration; npm scripts and GitHub Actions
are the supported command surfaces.

## Documentation Alignment

- README architecture and actual dependency direction align closely.
- ADR-006 now accurately explains the maintained-book transient depth margin.
- Backlog resolution history maps cleanly to the current implementation for prior review items.
- `SPECIFICATION.md` status and Node-engine confirmation are stale relative to the implemented
  repository.
- The latest nightly health and audit result are not reflected in the canonical backlog.

## Logging Alignment

- Cypress Screenplay logs each attempted Activity with a readable domain description.
- Assertion errors include the Question subject and serialisable actual data; prior Map diagnostics
  are demonstrably corrected.
- Protocol frames are buffered with index and receipt timestamp, supporting causal diagnostics.
- Reports are generated as HTML, JSON, and NDJSON and uploaded on CI success or failure.
- There is no structured sanitisation requirement because the suite handles public unauthenticated
  frames, but full raw-frame diagnostics can still be large.

## Test Coverage Metrics

- 23 Gherkin scenarios: 5 SPEC-001, 3 SPEC-002, 4 SPEC-003, 4 SPEC-004, 3 SPEC-005, 4 SPEC-006.
- 8 scenarios are `@smoke`; 15 are extended-only. Two of the smoke scenarios are offline negative
  endpoint cases.
- Seven standalone pure checks run in CI: five checksum-serialisation checks and two diagnostic
  checks.
- No line, branch, function, mutation, or schema-fixture coverage report is produced.
- Latest inspected evidence: local smoke 8/8; remote nightly 22/23 due to checksum serialisation,
  not environment maintenance.

## CI Alignment

- Push and PR events run smoke; schedule and explicit extended dispatch run the full tagged suite.
- npm cache keys are derived by `setup-node` from the lockfile, and `npm ci` preserves lockfile
  reproducibility.
- `contents: read`, job timeouts, smoke concurrency, and always-run report uploads are appropriate.
- No secrets are required, so fork PR execution exposes Actions/live-endpoint usage rather than
  credentials.
- Audit is observable only as install output, and GitHub Action references are mutable major tags.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
