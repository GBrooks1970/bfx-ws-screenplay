# Project Review: bfx-ws-screenplay

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review; this is the only project file per the template's single-repo customisation. Paths below are repository-relative.

## Stack and intent

Cypress 15.17.0 + TypeScript 5.9.3 (strict) + `@badeball/cypress-cucumber-preprocessor` 25.0.0, with an in-house chainable-native Screenplay implementation and a Node-side `ws` 8.21.0 driver bridged via `cy.task()`. System under test: the live public Bitfinex WebSocket API v2 (`wss://api-pub.bitfinex.com/ws/2`), public channels only, no authentication. The repo is an SDD demonstration: [SPECIFICATION.md](SPECIFICATION.md) is normative and units SPEC-001..005 are implemented and merged; SPEC-006 exists as open PR #6 (out of scope here); SPEC-007 is a declared stretch.

## Assessment

- **Architecture and design patterns** - The seven-layer model (feature files -> steps -> Tasks/Questions -> Ability -> task bridge -> Node driver -> SUT) is genuinely enforced, not just drawn: only [CommunicateOverWebSocket.ts](cypress/support/screenplay/abilities/CommunicateOverWebSocket.ts) calls `cy.task`, only [node-driver/driver.ts](node-driver/driver.ts) imports `ws`, and step files import only Tasks/Questions/Expectations. The Screenplay port is faithful to its `hand-baked-screenplay-pattern` reference (Actor/`whoCan`/`attemptsTo`/`abilityTo`, `Ensure.that(question, expectation)`) with the one deliberate, well-explained signature change (`performAs(): Cypress.Chainable`, [Activity.ts](cypress/support/screenplay/core/Activity.ts) lines 5-15).

- **Correctness and reliability of the test implementation** - The buffered-log model ([driver.ts](node-driver/driver.ts) lines 12-40) plus serialisable predicate DSL ([predicates.ts](node-driver/predicates.ts), [protocol.ts](node-driver/protocol.ts)) gives deterministic, bounded waits (poll loop, lines 137-159) with a bridge margin so `cy.task` never times out before the driver ([CommunicateOverWebSocket.ts](cypress/support/screenplay/abilities/CommunicateOverWebSocket.ts) line 33). `open()` settles exactly once, only counts a connection as open when the `info` event is buffered, and cleans up failed sessions (lines 65-120). Residual gaps: the unguarded `send` (Risk #3) and the exponential-notation edge in the checksum string (Risk #1).

- **The flagship (SPEC-004) is the real thing** - Pure fold/CRC-32 modules ([orderBook.ts](cypress/support/books/orderBook.ts), [crc32.ts](cypress/support/books/crc32.ts)) with buffer-index determinism: each `cs` frame is verified against the book folded from exactly the frames that preceded it ([ChecksumVerifications.ts](cypress/support/screenplay/questions/ChecksumVerifications.ts) lines 47-55, [bookFolding.ts](cypress/support/screenplay/questions/bookFolding.ts)). Five consecutive matches are demanded by the scenario ([SPEC-004-book-channel.feature](cypress/e2e/features/SPEC-004-book-channel.feature) lines 27-30). This is a strong, interview-defensible artefact.

- **Executable specifications stay business-readable** - Features are written from Marketa's perspective with per-unit narrative preambles that even encode discovered platform traps in plain language (the candles field-order note, [SPEC-005-candles-channel.feature](cypress/e2e/features/SPEC-005-candles-channel.feature) lines 3-7). Tagging follows the spec contract (`@spec-00N`, `@smoke`, `@extended`, plus `@negative @offline` for the connection-failure scenarios). Given/When/Then discipline (Given = state, When = Tasks, Then = Questions) holds across all five files.

- **Test isolation, lifecycle, and stability** - One connection per scenario; a fresh Actor per scenario in `Before`; unconditional `ws:reset` teardown in `After` catches leaked sessions from failed scenarios ([hooks.ts](cypress/support/step_definitions/hooks.ts) lines 14-24). Timeouts are all named constants with dated live-probe rationale ([config/index.ts](cypress/support/config/index.ts) lines 17-43) - the 30 s update wait and 45 s candle wait are justified by measured arrival gaps, not guesswork. No fixed sleeps anywhere. Questions are idempotent buffer reads, so re-asking cannot double-consume.

- **Data setup and API/auth assumptions** - Public API, no keys, no secrets in the tree (verified: no token-like strings; `.gitignore` covers reports/screenshots). Symbols, endpoints, book settings, and blocking codes are all config, not code. The `unreachable`/`malformed` endpoint keys make the negative connection scenarios offline-safe. The quiet-pair slot is deliberately `null` pending empirical selection ([config/index.ts](cypress/support/config/index.ts) lines 50-55) - honest, though it means `heartbeatWaitMs` is currently dormant config.

- **Documentation quality** - Among the best in the portfolio: README (with pin-rationale table and live-docs deltas), five ADRs that map to real code, a contract-status backlog validated as accurate (v4), a predicate-DSL contract doc with a change log, and a project contract naming the gates. Two alignment nits: the depth-invariant relaxation lacks its ADR note (Risk #2), and `SPECIFICATION.md` Section 6.4's normative Question list still names `TheErrorEvent`, `HeartbeatsObservedOn`, `SequenceMonotonicity` which do not exist in `main` - correctly so (they belong to SPEC-006/007), but a status column would prevent misreading the catalogue as implemented.

- **Weaknesses** - Concentrated and mostly small: the three MEDIUM risks above; invariant logic drifting into step files (Risk #4); no unit-level execution of the pure book modules despite their testability (everything is exercised only through the live E2E path, so a checksum-algorithm regression is only detectable against live data); CI hardening gaps (Risk #5).

## Deferred / planned-but-unimplemented coverage (backlog vs repo)

- **SPEC-006 (negative paths and unsubscription)** - backlog line 117 says PLANNED; in the repo, `main` contains no error-event schema, no `Unsubscribe`/`AttemptSubscription` tasks and no `TheErrorEvent`-family questions. Consistent. (PR #6 has since been opened to deliver this - out of scope for this review.)
- **SPEC-007 (sequencing)** - stretch, confirmed out of initial scope (spec Section 11.3); no `EnableSequencing` or `SequenceMonotonicity` code exists. Consistent.
- **Heartbeat/quiet-pair coverage** - `SYMBOLS.quiet = null` and `TIMEOUTS.heartbeatWaitMs` are forward-declared config with no consuming scenario in `main`; the backlog's success criterion (quiet pair "selected... when heartbeat scenarios first arrive") records this accurately.
- **Funding channels/symbols** - excluded by design; the schemas' exact-length checks reject funding payloads deliberately and say so ([tradesChannel.ts](cypress/schemas/tradesChannel.ts) lines 6-8, [tickerChannel.ts](cypress/schemas/tickerChannel.ts) lines 8-11).

## Suite metrics (reviewed state)

| Unit | Scenarios | Tags | Verified in this review |
|---|---|---|---|
| SPEC-001 | 5 (3 happy, 2 negative-offline) | `@spec-001 @smoke` | Ran live: 5/5 pass |
| SPEC-002 | 3 | `@spec-002 @smoke` | Ran live: 3/3 pass |
| SPEC-003 | 4 | `@spec-003 @extended` | Not run (nightly-only); code-reviewed |
| SPEC-004 | 4 | `@spec-004 @extended` | Not run (nightly-only); code-reviewed |
| SPEC-005 | 3 | `@spec-005 @extended` | Not run (nightly-only); code-reviewed |

19 scenarios total; 11 tasks, 11 question modules, 8 schema modules, 3 pure book modules, 4 driver modules.

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
