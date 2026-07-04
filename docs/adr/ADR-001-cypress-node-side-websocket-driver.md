# ADR-001 — Cypress with a Node-side WebSocket driver

**Status:** Fixed (design specification, 2 July 2026)

Cypress executes test code in a browser context with a queued command model — a
poor host for long-lived raw WebSocket sessions. The actual WebSocket client
(the `ws` library) therefore lives in the **Cypress Node process**
(`setupNodeEvents`), exposed to the test context exclusively through
`cy.task()` calls. The browser-side framework never opens a socket itself.

Consequences:

- All WebSocket state (connections, message buffers) lives in a Node-side
  session registry keyed by connection ID (`node-driver/driver.ts`).
- Tasks are the only bridge; each is a named contract (`node-driver/tasks.ts`,
  spec Section 7.3).
- Predicates cannot cross the task boundary as functions, so frame selection is
  a serialisable DSL interpreted Node-side (see `docs/predicate-dsl.md`).
- This is a deliberate demonstration of tool adaptation.
