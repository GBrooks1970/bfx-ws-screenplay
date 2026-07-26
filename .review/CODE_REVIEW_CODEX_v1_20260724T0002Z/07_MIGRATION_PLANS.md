# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Return to Index ->](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md)

**Reviewer:** AI assistant (Codex GPT-5)

These plans preserve the project's SDD order and live-API etiquette. They are recommendations,
not implementation changes.

## Plan 1 - Single Source of Truth for Features and Protocol Fixtures

- Keep `SPECIFICATION.md` normative for design, `docs/backlog.md` canonical for current status,
  feature files authoritative for executable behaviour, and type guards authoritative for frame
  structure; document that division in one short governance table.
- Add language-neutral JSON fixtures for checksum books, predicate matches, and message schemas.
- Make checksum fixtures include ordinary decimals, exponent-form JavaScript inputs, deletions,
  empty-side edges, and signed CRC results verified against current Bitfinex rules.
- Add checksum-frame and heartbeat guards so every message shape named in specification section
  7.2 has a catalogue entry.
- Update the specification status and Node-floor decision through the required ADR/change-note
  route before editing implementation policy.
- Refresh backlog and README audit/version statements with dated evidence after dependency work.
- Keep SPEC-007 absent until its recorded post-SPEC-006 decision explicitly approves it.

## Plan 2 - Docker Compose for Local Development

N/A - the system under test is Bitfinex's external public WebSocket service, the project ships no
local application or infrastructure service, and containerising Cypress alone would not make the
live protocol deterministic. A replay fixture adapter is a smaller and more useful local test seam.

## Plan 3 - GitHub Actions and Workflow Hardening

- Repair Risk #1 on a topic branch, then use an explicit extended dispatch for the targeted
  SPEC-004 proof and the required consecutive green evidence.
- Add a fast unit job or step before any live suite, covering protocol fixtures and critical
  branches without consuming exchange capacity.
- Add an explicit `npm audit` policy with a chosen severity threshold and a documented,
  expiry-dated exception route.
- Run the composite pure/unit gate in both smoke and extended jobs, or factor static/unit evidence
  into a reusable prerequisite job to avoid drift.
- Preserve smoke-on-push/PR and nightly-only extended etiquette, job timeouts, read-only token
  permissions, and always-run report uploads.
- Consider pinning GitHub Actions to reviewed commit SHAs with automated update PRs, reducing
  mutable-tag supply-chain exposure.
- Surface `environment-blocked` maintenance distinctly in the job summary/report while preserving
  the project's rule that it is not a Bitfinex product failure.

## Plan 4 - Deterministic Test-Pyramid Base

- Select a lightweight TypeScript runner and add `test:unit` plus `test:unit:coverage`.
- First migrate the seven standalone checks without changing their intent, then correct the
  checksum cases to prove supported serialisation rather than expected rejection.
- Add table-driven suites for predicate paths/operators, every schema guard, book folding/removal,
  CRC vectors, and complete checksum fixtures.
- Introduce minimal socket and clock seams around `node-driver/driver.ts`; test open success,
  invalid URL, timeout, error, close, reset, send-after-close, poll cut-offs, and session cleanup.
- Test maintenance-code classification separately from product assertion failure and transport
  configuration failure.
- Set a critical-module branch floor after measuring the initial suite, then raise it only when new
  risk justifies the cost.
- Keep the live suites as end-to-end confirmation of real protocol behaviour and documentation
  drift.

## Completion Criteria

- The latest default-branch nightly is green or any red run is explicitly classified with
  evidence; a `1e-8` book amount no longer aborts checksum serialisation.
- Static, unit/pure, smoke, and approved extended gates have recorded outcomes.
- `npm audit` status in CI, README, and backlog agrees.
- Normative specification, package engine, README, and backlog state one consistent Node policy.
- All review navigation and evidence links remain valid after any remediation refactor.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md)
