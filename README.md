# bfx-ws-screenplay

[![ci](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/workflows/ci.yml/badge.svg)](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/workflows/ci.yml)

WebSocket test automation against the **Bitfinex public WebSocket API v2**
(`wss://api-pub.bitfinex.com/ws/2`) — Cypress, TypeScript, Cucumber BDD and an
in-house Screenplay pattern, built under Specification Driven Development.

Public channels only: no trading, no authentication, no API keys.

## What this demonstrates

- **WebSocket API testing against a live financial exchange** — protocol
  conformance, schema validity and invariants over a non-deterministic feed
  (never market-value assertions; see ADR-004).
- **Tool adaptation** — Cypress's browser-hosted command queue cannot own a raw
  socket, so the WebSocket client lives in the Cypress Node process behind a
  `cy.task()` bridge with a serialisable predicate DSL (ADR-001,
  `docs/predicate-dsl.md`). Message streams become a queryable buffer: Questions
  poll a synchronously assertable log instead of listening to events.
- **The Screenplay pattern, implemented rather than imported** — a
  Cypress-adapted derivative of my
  [hand-baked-screenplay-pattern](https://github.com/GBrooks1970/hand-baked-screenplay-pattern)
  library (promise-native there; chainable-native here — see ADR-002).
- **BDD as the executable specification** — Gherkin feature files are the
  source of behavioural truth; step definitions delegate only (ADR-003), with
  assertions expressed as `Ensure.that(question, expectation)`.
- **Specification Driven Development** — the project is implemented unit by
  unit from a written design specification, with live-docs verification before
  each unit and review gates before code.

## Architecture

```
Layer 1  Gherkin feature files          (WHAT — business/behaviour language)
Layer 2  Step definitions               (glue only — no logic)
Layer 3  Screenplay: Tasks & Questions  (HOW, in domain terms)
Layer 4  Screenplay: Abilities          (capability wrappers over the bridge)
Layer 5  cy.task bridge                 (named task contracts)
Layer 6  Node WebSocket driver          (ws client, session registry, buffers)
Layer 7  System under test              (wss://api-pub.bitfinex.com/ws/2)
```

Downward dependencies only. Layers 1–3 speak domain vocabulary (subscribe,
ticker, order book); layers 5–6 speak transport vocabulary (frame, socket,
buffer); layer 4 translates.

## Architecture decision records

| ADR | Decision |
|---|---|
| [ADR-001](docs/adr/ADR-001-cypress-node-side-websocket-driver.md) | WebSocket client in the Cypress Node process, bridged exclusively via `cy.task()` |
| [ADR-002](docs/adr/ADR-002-screenplay-in-house.md) | Screenplay implemented in-house (derived from hand-baked-screenplay-pattern), not Serenity/JS |
| [ADR-003](docs/adr/ADR-003-cucumber-preprocessor.md) | `@badeball/cypress-cucumber-preprocessor`; step definitions delegate only |
| [ADR-004](docs/adr/ADR-004-assertion-strategy-live-data.md) | Protocol/schema/invariant assertions only — market-value equality prohibited |
| [ADR-005](docs/adr/ADR-005-time-and-flake-policy.md) | Bounded condition-waits with named timeout constants; no fixed sleeps; distinct environment-blocked outcome |

## Specification progress

| Unit | Behaviour | Status |
|---|---|---|
| SPEC-001 | Connection lifecycle & framework skeleton | ✅ Done |
| SPEC-002 | Ticker channel | Planned |
| SPEC-003 | Trades channel | Planned |
| SPEC-004 | Order book channel & checksum verification (flagship) | Planned |
| SPEC-005 | Candles channel | Planned |
| SPEC-006 | Negative paths & unsubscription | Planned |
| SPEC-007 | Sequencing | Stretch (out of initial scope) |

## How to run

Requires Node 20+ (CI runs Node 24, per `.nvmrc`).

```sh
npm ci
npm run test:smoke      # @smoke scenarios (SPEC-001, SPEC-002)
npm run test:extended   # full tagged suite — used by the nightly CI job
npm run lint
npm run typecheck
```

Cucumber HTML/JSON reports are written to `reports/` (published as CI
artefacts). Scenarios blocked by platform maintenance abort as
**environment-blocked** (`EnvironmentBlockedError`), distinguishable in the
report from product failures.

### Live-API etiquette

`@smoke` runs on push; the full `@extended` suite runs nightly only. One
connection per scenario, torn down unconditionally in an `After` hook.

## Version pins

Dependencies are pinned **exactly** (no caret): the
Cypress / cucumber-preprocessor / esbuild-preprocessor trio breaks when allowed
to drift independently, so upgrades are deliberate.

| Package | Version | Why this version |
|---|---|---|
| `cypress` | 15.17.0 | Newest Cypress supported by the preprocessor (its peer range caps at 15.17.0) |
| `@badeball/cypress-cucumber-preprocessor` | 25.0.0 | Latest at implementation start (4 July 2026) |
| `@bahmutov/cypress-esbuild-preprocessor` | 2.2.8 | Latest; the preprocessor's documented bundler companion |
| `typescript` | 5.9.3 | Strict mode throughout |
| `ws` | 8.21.0 | The Node-side WebSocket client (ADR-001) |

`overrides` in `package.json` force patched `diff`/`serialize-javascript`
inside mocha's tree (`npm audit`: 0 vulnerabilities).

## Licence

[MIT](LICENSE) — © 2026 Gary Brooks
