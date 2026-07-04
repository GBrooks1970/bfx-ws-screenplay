# Project Contract — bfx-ws-screenplay

## Gates

npm run typecheck
npm run lint
npm run test:smoke

## Working norms

- **SDD is the working method** (`SPECIFICATION.md` Section 10): one SPEC unit at a time, in
  order; verify live Bitfinex docs before each unit; the feature file is reviewed by Gary
  **before** framework code; deviations from the spec require an ADR change note in `docs/adr/`
  before the deviating code is written; ambiguities are raised as questions, never resolved by
  assumption.
- **`npm run test:smoke` hits the live public API** (`wss://api-pub.bitfinex.com/ws/2`). A
  scenario aborted by `EnvironmentBlockedError` (`environment-blocked:` message prefix) means
  platform maintenance, **not** a product failure — do not "fix" the framework for it.
- **Live-API etiquette:** `@smoke` on push only; the full `@extended` suite runs nightly in CI;
  one connection per scenario, torn down unconditionally in the `After` hook.
- **Exact version pins** for the `cypress` / `@badeball/cypress-cucumber-preprocessor` /
  `@bahmutov/cypress-esbuild-preprocessor` trio; upgrades are deliberate — check the
  preprocessor's Cypress peer range first (see backlog Risk #1).
- **No `any`** outside the Node driver's raw-frame ingress point (`node-driver/driver.ts`,
  `bufferFrame`).
- **The predicate DSL is a contract**: any new `kind` or operator requires a note in
  `docs/predicate-dsl.md` before the code that uses it.
- Assertions are protocol/schema/invariant only — never market-value equality (ADR-004).
