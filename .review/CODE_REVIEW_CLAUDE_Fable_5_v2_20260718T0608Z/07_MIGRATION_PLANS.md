# Migration Strategy and Plans

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: the template's three plan areas scale to what this repo contains.
No disruptive migration is warranted; these are incremental consolidation plans.

## Single Source of Truth for Features

- Current state is already consolidated: `SPECIFICATION.md` (normative) -> feature files
  (executable) -> schema catalogue (structural truth) -> config module (operational truth).
- Plan: keep the chain intact by closing the two staleness gaps (backlog v8, ADR-006 path -
  Risks #2-#3) in one docs commit.
- Add the `unsubscribed` ack guard so the catalogue covers every asserted event type (Risk #1).
- When SPEC-007's decision lands, update spec section 8, README progress table, and backlog
  roadmap in the same commit - the three places status is asserted.
- Guard against future self-referential staleness: PR-state claims inside a PR should be
  written as "merges with this PR", not dated open/closed assertions.

## Docker Compose for Local Development

- N/A - there is no local application stack to compose: the SUT is a public, live, external
  WebSocket endpoint, and the suite's only local dependencies are Node and npm (`npm ci`
  alone builds and runs everything, per ADR-002's constraint).
- The offline lane (`@negative @offline` scenarios plus the pure `tsx` checks) already covers
  what a containerised mock would add for this project's goals; a mock exchange would dilute
  the live-API demonstration value.

## GitHub Actions / Workflow

- Current status: hardened by BFX-05 (workflow `permissions: contents: read`, job timeouts
  15/30 min, smoke concurrency with cancel-in-progress), npm caching via setup-node, report
  artefacts uploaded `if: always()` from both jobs, no secrets used or needed. Local
  reproducibility is exact: CI runs the same three npm scripts the project contract names.
- Plan (small): add typecheck + lint to the `extended` job (Risk #6); insert the network-free
  `check:pure` step into the smoke job (Risk #4); optionally note the fork-PR live-API
  implication in the README etiquette section.
- Keep the nightly-only `@extended` cadence and `workflow_dispatch` suite input - the
  live-API etiquette design is working as intended (environment-blocked outcomes remain
  distinguishable platform-maintenance signals, not failures).

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v2_20260718T0608Z.md)
