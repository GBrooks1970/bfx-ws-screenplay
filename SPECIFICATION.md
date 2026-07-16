# Design Specification — Bitfinex WebSocket Test Automation Portfolio Project

**Project codename:** `bfx-ws-screenplay`
**Author:** Gary Brooks
**Date:** 2 July 2026
**Status:** Design & specification phase — no implementation
**Intended consumers:** A human engineer or an AI coding agent, working under Specification Driven Development (SDD). Every specification unit in Section 8 is written to be independently implementable and verifiable without reference to the author.

---

## 1. Purpose

### 1.1 Portfolio goals

This project exists to demonstrate, in a public repository, the following capabilities:

1. WebSocket API test automation against a live financial exchange (Bitfinex public WebSocket API v2).
2. BDD methodology — executable Gherkin specifications as the single source of behavioural truth.
3. The Screenplay pattern as the automation design model, in TypeScript.
4. Cypress as the test runner and orchestration tool.
5. Specification Driven Development — this document is itself the demonstration artefact: an agent (human or AI) should be able to implement the project from this document alone.

### 1.2 Secondary goals

- Show sound handling of a non-deterministic, live data source (invariant- and schema-based assertions rather than value assertions).
- Show CI integration (GitHub Actions) with tagged test selection and readable reporting.
- Provide interview-ready talking points for roles requiring WebSocket testing at a financial or crypto platform.

### 1.3 Explicit non-goals

- No trading, no authenticated endpoints, no API keys. Public channels only.
- No load or performance testing.
- No UI testing of bitfinex.com.
- No production-grade reconnection/resilience library — resilience behaviours are exercised only to the extent needed to demonstrate testing technique (see SPEC-007, marked stretch).

---

## 2. System under test

### 2.1 Endpoint

- Public WebSocket API v2: `wss://api-pub.bitfinex.com/ws/2`
- No authentication required for the channels in scope.
- Reference documentation: https://docs.bitfinex.com/docs/ws-general (the implementer must verify current message formats against the live docs before coding each spec unit; the summaries below are design-time understanding, not a contract).

### 2.2 Channels in scope

| Channel | Purpose | Key message types |
|---|---|---|
| `ticker` | Price/volume summary for a symbol | subscribe ack, snapshot, update |
| `trades` | Executed trades stream | snapshot, `te` (trade executed), `tu` (trade updated) |
| `book` | Order book | snapshot, updates, optional checksum (`cs`) frames |
| `candles` | OHLC data for a symbol/timeframe key | snapshot, update |

### 2.3 Protocol behaviours in scope

- `info` event on connect (platform version and status).
- `subscribe` / `subscribed` / `unsubscribe` / `unsubscribed` event flow and `chanId` allocation.
- Error events for invalid subscriptions (e.g. unknown symbol), including error codes.
- Heartbeat (`hb`) frames on quiet channels.
- `ping` / `pong` round-trip.
- Configuration flags via the `conf` event (used by the checksum and sequencing spec units).

### 2.4 Known constraints the design must respect

- Public connections are rate-limited and channel-limited per connection; the framework must reuse a single connection per scenario by default and must tear it down cleanly.
- The feed is live and non-deterministic: message timing, order-book contents, and trade frequency cannot be predicted. All assertions must therefore target **structure, invariants, and protocol behaviour**, never specific market values.
- Bitfinex may broadcast maintenance/restart status codes; tests must fail with a distinguishable 'environment' failure (not a product failure) when the platform reports itself non-operative. This is a first-class design requirement (see Section 6.5).

---

## 3. Recorded design decisions (ADRs)

These decisions are fixed. The implementer must not revisit them without a change to this document.

### ADR-001 — Cypress with a Node-side WebSocket driver

Cypress executes test code in a browser context with a queued command model, which is a poor host for long-lived raw WebSocket sessions. The design therefore places the actual WebSocket client (the `ws` npm library) in the **Cypress Node process** (`setupNodeEvents`), exposed to the test context exclusively through `cy.task()` calls. The browser-side framework code never opens a socket itself.

Consequences:
- All WebSocket state (connections, message buffers) lives in a Node-side session registry keyed by a connection ID.
- Tasks are the only bridge; every task is defined in Section 7.3 as a named contract.
- This is a deliberate demonstration of tool adaptation and must be documented in the repository README as such.

### ADR-002 — Screenplay implemented in-house, not via Serenity/JS

To keep the pattern demonstration transparent, the Screenplay classes (Actor, Ability, Task, Interaction, Question) are implemented as small in-repo TypeScript modules rather than importing Serenity/JS. The repository is then evidence of understanding the pattern, not merely consuming it.

**Note (agreed with Gary, 4 July 2026):** the in-repo implementation uses Gary's `hand-baked-screenplay-pattern` library (github.com/GBrooks1970) as its design reference — mirroring its vocabulary and API surface (`Actor.whoCan(...)`, `attemptsTo(...)`, `abilityTo(...)`, the Ability/Task/Interaction/Question separation and `Ensure`/`Expectation` style) — but is **ported and adapted, not consumed as a dependency**. Two reasons: (a) the hand-baked core is promise-native (`performAs(): Promise<void>`), which conflicts with Cypress's queued-chainable command model — here `performAs` returns `Cypress.Chainable`; (b) the library is distributed as a sibling repo, not an npm package, and this showcase repo must build with `npm ci` alone. The derivation is credited in the README with a link.

### ADR-003 — Cucumber preprocessor

Gherkin execution uses `@badeball/cypress-cucumber-preprocessor` (the maintained fork). Feature files are the executable specification; step definitions must contain no logic beyond delegating to Screenplay Tasks and Questions.

### ADR-004 — Assertion strategy for live data

Assertions are limited to three categories: (a) protocol conformance (event flow, field presence, types); (b) schema validity (validated against in-repo JSON schemas or type guards); (c) invariants (e.g. bid < ask; order book checksum recomputes correctly; sequence numbers are monotonic). Category (d), value equality against market data, is prohibited.

### ADR-005 — Time and flake policy

Every wait is a bounded wait for a condition (message received matching a predicate) with an explicit timeout constant defined in one configuration module. No fixed sleeps. Default message-wait timeout: 10 seconds; connection timeout: 5 seconds. A scenario that fails on platform status codes is reported as `environment-blocked`, not failed (see Section 6.5).

---

## 4. Architecture

### 4.1 Layer model

```
Layer 1  Gherkin feature files          (WHAT — business/behaviour language)
Layer 2  Step definitions               (glue only — no logic)
Layer 3  Screenplay: Tasks & Questions  (HOW, in domain terms)
Layer 4  Screenplay: Abilities          (capability wrappers over the bridge)
Layer 5  cy.task bridge                 (named task contracts)
Layer 6  Node WebSocket driver          (ws client, session registry, buffers)
Layer 7  System under test              (wss://api-pub.bitfinex.com/ws/2)
```

Rules:
- Downward dependencies only; no layer may skip more than one layer down.
- Layers 1–3 use domain vocabulary (subscribe, ticker, order book). Layers 5–6 use transport vocabulary (frame, socket, buffer). Layer 4 translates between them.

### 4.2 Message handling model

The Node driver appends every inbound frame to a per-connection, per-channel **message buffer** with a monotonically increasing local index and a receipt timestamp. Questions never 'listen'; they query the buffer (optionally polling until a predicate matches or timeout). This converts an asynchronous stream into a synchronously assertable log — the key design idea that makes WebSocket testing tractable in Cypress.

---

## 5. Repository structure (normative)

```
bfx-ws-screenplay/
├── README.md                     # Project intro, ADR summary, how-to-run
├── SPECIFICATION.md              # This document
├── cypress.config.ts
├── package.json
├── tsconfig.json
├── .github/workflows/ci.yml
├── cypress/
│   ├── e2e/features/             # Layer 1 — .feature files, one per SPEC unit
│   ├── support/
│   │   ├── step_definitions/     # Layer 2
│   │   ├── screenplay/
│   │   │   ├── core/             # Actor, Ability, Task, Interaction, Question base types
│   │   │   ├── abilities/        # Layer 4
│   │   │   ├── tasks/            # Layer 3
│   │   │   └── questions/        # Layer 3
│   │   └── config/               # timeout constants, symbols under test, endpoint
│   └── schemas/                  # JSON schemas / type guards per message type
├── node-driver/                  # Layer 6 — ws client, session registry, task handlers
└── docs/
    └── adr/                      # ADR-001..005 as individual files
```

Naming conventions: feature files `SPEC-00N-short-name.feature`; Tasks are verb phrases (`SubscribeToChannel`); Questions are noun phrases (`TheSubscriptionConfirmation`, `ReceivedTickerUpdates`); Abilities are `CommunicateOverWebSocket` style capability names.

---

## 6. Screenplay design

### 6.1 Actor

One actor persona is sufficient: **Marketa, a market-data consumer**. Scenarios are written from her perspective ('Marketa subscribes to the BTC/USD ticker'). She is granted a single ability at scenario start.

### 6.2 Ability — `CommunicateOverWebSocket`

Wraps the `cy.task` bridge. Contract (described, not coded):

| Capability | Behaviour |
|---|---|
| `open()` | Opens a connection via the driver; stores connection ID; resolves once the `info` event is buffered or fails on connection timeout. |
| `send(payload)` | Sends a JSON payload on the connection. |
| `messagesWhere(predicate, options)` | Polls the buffer for frames matching a predicate; returns matches; times out per ADR-005. |
| `close()` | Closes the connection and clears the session. Called in scenario teardown unconditionally. |

### 6.3 Tasks (Layer 3) — normative list

| Task | Composition |
|---|---|
| `EstablishConnection` | open + await `info` event |
| `SubscribeToTicker(symbol)` | send subscribe + await `subscribed` ack, record `chanId` |
| `SubscribeToTrades(symbol)` | as above for trades |
| `SubscribeToOrderBook(symbol, precision, frequency, length)` | as above with book parameters |
| `SubscribeToCandles(key)` | as above with candle key |
| `EnableChecksums` / `EnableSequencing` | send `conf` flags before subscribing |
| `Unsubscribe(chanId)` | send unsubscribe + await `unsubscribed` ack |
| `SendPing` | send ping with correlation ID |
| `AttemptInvalidSubscription(symbol)` | send subscribe expected to fail; does **not** await success |
| `AttemptConnection(endpointKey)` | *(added 4 July 2026, SPEC-001 review)* open against a configured endpoint key; records the outcome (success or failure reason) for later questioning; does **not** fail the scenario itself |

### 6.4 Questions (Layer 3) — normative list

| Question | Answers |
|---|---|
| `ThePlatformInfo` | version and status fields from the `info` event |
| `TheSubscriptionConfirmation(channel)` | ack payload incl. `chanId` |
| `TheChannelSnapshot(chanId)` | first data frame after ack |
| `ReceivedUpdates(chanId, count)` | first N post-snapshot frames |
| `TheErrorEvent` | error payload incl. code and message |
| `ThePongResponse(correlationId)` | pong frame matching the ping |
| `HeartbeatsObservedOn(chanId)` | boolean/count of `hb` frames within window |
| `TheOrderBookChecksumValidity(chanId)` | result of recomputing the checksum locally against buffered book state and comparing to the latest `cs` frame |
| `SequenceMonotonicity(chanId)` | boolean over buffered sequence numbers |
| `TheConnectionOutcome` | *(added 4 July 2026, SPEC-001 review)* recorded outcome of the last connection attempt: success, or failure reason (connect failure / invalid endpoint) |
| `TheSessionRegistration` | *(added 4 July 2026, SPEC-001 review)* whether the driver still holds a session for the actor's connection |

### 6.5 Environment-blocked handling (cross-cutting)

If, at any point, the buffered stream contains a platform status/maintenance code indicating the API is not operative, the framework must abort the scenario with a distinct tagged outcome (`@environment-blocked` in reporting) rather than a test failure. The implementer must locate the current status codes in the Bitfinex docs and centralise them in `support/config`.

---

## 7. Contracts

### 7.1 Gherkin conventions

- `Given` establishes connection state; `When` performs Tasks; `Then` asserts via Questions only.
- One behaviour per scenario; scenarios independent and order-agnostic; every scenario closes its connection in teardown.
- Tags: `@smoke` (SPEC-001, SPEC-002), `@extended` (all others), `@stretch` (SPEC-007), plus `@spec-00N` per unit.

### 7.2 Schema catalogue (to be authored as part of SPEC-002 to SPEC-005)

One schema (or TypeScript type guard) per message type: info event, subscribed ack (per channel type), ticker snapshot/update, trade snapshot/`te`/`tu`, book snapshot/update/checksum frame, candle snapshot/update, error event, heartbeat, pong. Schemas live in `cypress/schemas/` and are the single source of structural truth; assertions reference schemas, never inline field lists.

### 7.3 cy.task bridge contract (Layer 5)

| Task name | Input | Output |
|---|---|---|
| `ws:open` | `{ url }` | `{ connectionId }` |
| `ws:send` | `{ connectionId, payload }` | `{ ok }` |
| `ws:poll` | `{ connectionId, predicateSpec, timeoutMs }` | `{ frames: Frame[] }` |
| `ws:close` | `{ connectionId }` | `{ ok }` |
| `ws:reset` | `{}` | `{ ok }` (test-run hygiene; closes all sessions) |
| `ws:sessions` | `{}` | `{ connectionIds: string[] }` *(added 4 July 2026, SPEC-001 review — supports `TheSessionRegistration`)* |

`predicateSpec` must be serialisable (functions cannot cross the task boundary): the design mandates a small declarative predicate DSL (e.g. match on channel ID, event name, frame shape) interpreted Node-side. Defining that DSL precisely is part of SPEC-001's Definition of Done.

---

## 8. Specification units

Each unit below is an independent SDD work package. **Definition of Done for every unit:** feature file written first; step definitions delegate only; all scenarios pass three consecutive runs locally and in CI; no fixed sleeps; lint clean; unit's schemas added to the catalogue; README updated if behaviour is user-visible.

### SPEC-001 — Connection lifecycle & framework skeleton

**Behaviour:** Marketa can open a connection, receive the platform `info` event with an API version of 2 and an operative status, exchange a ping/pong, and close cleanly.
**Scenarios (indicative Gherkin titles):**
- Connecting yields a version-2 info event
- The platform responds to a ping with a matching pong
- Closing the connection releases the session
**Also delivers:** repository skeleton, Screenplay core types, Node driver with session registry and buffer, predicate DSL, timeout config, CI workflow running `@smoke`.
**Failure modes to cover:** connection timeout; malformed URL; environment-blocked status.

### SPEC-002 — Ticker channel

**Behaviour:** Subscribing to the ticker for a configured symbol yields a `subscribed` ack with a channel ID, followed by a schema-valid snapshot and at least one schema-valid update within the timeout.
**Invariants:** bid ≤ ask in every frame; all numeric fields parse as finite numbers.
**Failure modes:** none beyond generic timeout — this is the 'happy path proves the machine' unit.

### SPEC-003 — Trades channel

**Behaviour:** Subscribing to trades yields an ack, a snapshot (array of schema-valid trades), and subsequent `te`/`tu` frames that validate against their schemas.
**Invariants:** each trade has positive absolute amount and positive price; `tu` for a given trade ID follows its `te`.
**Note:** on quiet pairs, updates may not arrive within the timeout; the scenario asserting live updates must use a high-liquidity symbol from config and may be tagged `@extended`.

### SPEC-004 — Order book channel & checksum verification

**Behaviour:** Subscribing to the book (parameterised precision/frequency/length via Scenario Outline) yields an ack echoing the parameters, a snapshot, and updates. With checksums enabled via `conf`, periodically received `cs` frames match a locally recomputed checksum over the maintained book state.
**This is the flagship unit** — local book-state maintenance plus checksum recomputation is the strongest technical demonstration in the project. The implementer must follow the checksum algorithm from the Bitfinex documentation and must document it in `docs/`.
**Invariants:** best bid < best ask after snapshot application; book depth never exceeds subscribed length (steady-state contract; the maintained-replica implementation tolerates a documented one-frame transient overshoot — see `docs/adr/ADR-006-book-depth-transient-overshoot-margin.md`).

### SPEC-005 — Candles channel

**Behaviour:** Subscribing with a candle key (e.g. 1-minute BTC/USD, exact key format per live docs) yields ack, schema-valid snapshot, and updates.
**Invariants:** for every candle, low ≤ open, close ≤ high; timestamps align to the subscribed timeframe boundary.

### SPEC-006 — Negative paths & unsubscription

**Behaviour:** An invalid symbol subscription yields an error event with a documented error code and no channel ID; unsubscribing from a live channel yields an `unsubscribed` ack and no further data frames for that channel ID (verified over a bounded quiet window).
**Failure modes are the subject here:** error schema, code presence, and post-unsubscribe silence.

### SPEC-007 — Sequencing (stretch)

**Behaviour:** With sequencing enabled via `conf`, sequence numbers across received frames are strictly monotonic for the life of the connection.
**Marked stretch:** valuable talking point, but the project is presentable without it.

**Mandatory implementation order:** SPEC-001 → 002 → 003 → 004 → 005 → 006 → (007). Each unit merges independently; the repository must be green after every merge.

---

## 9. Non-functional requirements

- **Language/tooling:** TypeScript strict mode; ESLint + Prettier; no `any` outside the Node driver's raw-frame ingress point.
- **CI:** GitHub Actions; `@smoke` on every push; full `@extended` suite nightly (live-API etiquette — do not hammer the public endpoint on every commit).
- **Reporting:** Cucumber HTML/JSON report published as a CI artefact; `environment-blocked` outcomes visibly distinguished from failures.
- **Documentation:** README covers purpose, architecture diagram, ADR summaries, and a 'what this demonstrates' section aimed at reviewers/recruiters.
- **Etiquette:** respect published rate limits; one connection per scenario; unconditional teardown.

## 10. SDD working agreement (for the implementing agent, human or AI)

1. Implement one SPEC unit at a time, in order; do not begin a unit until the previous unit's Definition of Done is met.
2. For each unit: (a) verify current message formats against the live Bitfinex docs; (b) write/adjust the feature file; (c) get the feature file reviewed (by Gary) before writing framework code; (d) implement; (e) demonstrate three consecutive green runs.
3. Any deviation from this document requires a written change note in `docs/adr/` before the deviating code is written.
4. Ambiguities discovered mid-unit are raised as questions, not resolved by assumption.

## 11. Pre-implementation confirmations (resolved 4 July 2026)

All four open items were confirmed by Gary on 4 July 2026:

1. **Symbols under test — confirmed.** tBTCUSD as high-liquidity primary; tETHUSD as the second parameterised pair for the SPEC-004 Scenario Outline. The quiet pair for heartbeat scenarios is deliberately **not** named here: it is selected empirically at implementation time against a documented criterion (typically minutes between trades, checked via the public REST 24h-volume data) and held in `support/config` so it can be swapped without code change. Consequential detail: Bitfinex emits `hb` frames at roughly 15-second intervals, which exceeds ADR-005's default 10-second message wait; heartbeat scenarios therefore use their own named timeout constant (30 seconds) in the config module. This is consistent with ADR-005 (explicit named timeouts), not a deviation from it.
2. **Repository and licence — confirmed.** Public repo `bfx-ws-screenplay`, MIT licence.
3. **SPEC-007 — confirmed out of initial scope.** Remains a stretch item, revisited after SPEC-006. Rationale: SPEC-001→006 covers every skill gap the role-fit report identified; the `conf` plumbing built for SPEC-004 makes SPEC-007's later marginal cost small.
4. **Version pins — confirmed.** Node 24 (current active LTS, matching the portfolio CI baseline): `.nvmrc`, `engines` field, and `setup-node` with `node-version: 24`. Cypress: the newest major supported by `@badeball/cypress-cucumber-preprocessor` at SPEC-001 start (v15 as of preprocessor v24.0.1), with **exact version pins** (no caret) for `cypress`, `@badeball/cypress-cucumber-preprocessor`, and `@bahmutov/cypress-esbuild-preprocessor`, since this trio breaks when allowed to drift independently. TypeScript current 5.x, strict. Pins recorded in the README.

Additionally confirmed (4 July 2026): the Screenplay core will be a **Cypress-adapted derivative of Gary's existing `hand-baked-screenplay-pattern` library** — see the note appended to ADR-002.

## 12. References

- Bitfinex WebSocket API v2 documentation — docs.bitfinex.com (general, public channels, checksum algorithm)
- `@badeball/cypress-cucumber-preprocessor` documentation
- Screenplay pattern — Serenity/JS design documentation (pattern reference only, per ADR-002)
