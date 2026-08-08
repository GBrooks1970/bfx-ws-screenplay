# Risks and Issues

**Project:** bfx-ws-screenplay
**Reviewer:** AI assistant (Gemini)
**Date:** 2026-08-07T14:10Z

The findings below are ordered from highest to lowest severity.

---

### Risk #1 (MEDIUM): `--experimental-test-coverage` in unit coverage script requires Node 22+, breaking engine floor promise on Node 20

- **Risk Description:** [package.json](package.json) (line 8-10) defines `"engines": { "node": ">=20" }`. However, [package.json](package.json) (line 28) configures `test:unit:coverage` using Node's `--experimental-test-coverage` flag:
  `node --import tsx --test --experimental-test-coverage ...`
  In Node 20 LTS, `--experimental-test-coverage` exhibits API instability and produces experimental warnings or runner failures. Node 24 is used in CI ([.github/workflows/ci.yml](.github/workflows/ci.yml) line 37), but local execution by developers on Node 20 fails.
- **Evidence:**
  `package.json` line 8-10:
  ```json
  "engines": {
    "node": ">=20"
  }
  ```
  `package.json` line 28:
  ```json
  "test:unit:coverage": "node --import tsx --test --experimental-test-coverage --test-coverage-include=node-driver/predicates.ts ..."
  ```
- **Impact Analysis:** Developers using Node 20 (the declared minimum supported engine) encounter broken local unit coverage runs.
- **Refactor Recommendation and Strategy:** Update `docs/adr/ADR-009-node-support-baseline.md` and `package.json` script descriptions to clarify that while runtime execution supports Node 20+, unit test coverage profiling requires Node >=22. Alternatively, provide a fallback `test:unit` execution without coverage flags for Node 20 environments.

---

### Risk #2 (LOW): Pinned trio peer dependency range cap on Cypress

- **Risk Description:** `@badeball/cypress-cucumber-preprocessor@25.0.0` caps its peer dependency on Cypress at `>=15.0.0 <=15.17.0`. Cypress is currently pinned to `15.17.0`.
- **Evidence:**
  [package.json](package.json) lines 32, 37:
  ```json
  "@badeball/cypress-cucumber-preprocessor": "25.0.0",
  "cypress": "15.17.0"
  ```
  [docs/backlog.md](docs/backlog.md) line 53-73 (Risk #1).
- **Impact Analysis:** Patching Cypress to versions above 15.17.0 requires a synchronized update of the preprocessor, preventing quick standalone updates.
- **Refactor Recommendation and Strategy:** Retain exact pins and perform trio upgrades (Cypress, cucumber-preprocessor, esbuild-preprocessor) as a coordinated maintenance step when new preprocessor peer ranges are released.

---

### Risk #3 (LOW): Schema Catalogue layout asymmetry for Checksum and Heartbeat frames

- **Risk Description:** While most protocol frame types have dedicated modules in `cypress/schemas/` (e.g. `confEvent.ts`, `tickerChannel.ts`), checksum frames and heartbeat frames are defined inline in [cypress/schemas/channelFrames.ts](cypress/schemas/channelFrames.ts) and [cypress/schemas/bookChannel.ts](cypress/schemas/bookChannel.ts).
- **Evidence:**
  [cypress/schemas/bookChannel.ts](cypress/schemas/bookChannel.ts) (line 45) contains `isBookChecksumFrame`.
  [cypress/schemas/channelFrames.ts](cypress/schemas/channelFrames.ts) (line 12) contains `isHeartbeatFrame`.
- **Impact Analysis:** Minor structural inconsistency in the `cypress/schemas/` catalogue organization.
- **Refactor Recommendation and Strategy:** Extract `checksumFrame.ts` and `heartbeatFrame.ts` into individual files under `cypress/schemas/` and export them via `cypress/schemas/index.ts`.

---

### Risk #4 (LOW): Absence of JSDoc annotations in Screenplay Task definitions

- **Risk Description:** Tasks in `cypress/support/screenplay/tasks/` implement critical protocol flows (e.g. `EstablishConnection.ts`, `SubscribeToTicker.ts`, `EnableChecksumFrames.ts`) but lack JSDoc comments detailing expected frame responses, error conditions, and SPEC unit references.
- **Evidence:**
  [cypress/support/screenplay/tasks/EstablishConnection.ts](cypress/support/screenplay/tasks/EstablishConnection.ts) line 1.
- **Impact Analysis:** Reduces pedagogical readability for engineers referencing the framework code to understand Bitfinex WebSocket protocol interactions.
- **Refactor Recommendation and Strategy:** Add JSDoc headers to each Task class detailing the intent, protocol payload, and corresponding `SPECIFICATION.md` unit section.
```

---