# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: the template's three canonical plans are adapted to what this repo actually needs. Docker Compose is N/A (no local application stack exists or is warranted - the SUT is a third-party public endpoint), so its slot is taken by the plan this repo does need: an offline verification lane.

## Plan 1 - Single Source of Truth for Features (spec/backlog/code convergence)

- The SPEC roadmap in [backlog.md](docs/backlog.md) already *is* the migration plan (its own words, line 82); keep it authoritative and complete SPEC-006 through the open PR #6, then record the SPEC-007 go/no-go decision it requires.
- Close the two truth gaps this review found: the depth-invariant deviation note (Risk #2) and the `conf` ack schema (Risk #6), so implementation and normative spec re-converge.
- Add a status column (Implemented / SPEC-006 / SPEC-007-stretch) to the spec's Section 6.3/6.4 catalogue tables so the normative lists cannot be misread as shipped inventory.
- Fold this review's findings into the backlog's risk register with the backlog's own scoring system, and update the stale ".review/ (none yet)" maintenance note.
- On SPEC-006 merge: verify the quiet-pair selection criterion gets recorded in [config/index.ts](cypress/support/config/index.ts) as the backlog success criterion demands, retiring the `null` placeholder.

## Plan 2 - Offline verification lane (in place of Docker Compose - N/A, no app stack)

- Add a dependency-light unit gate (`vitest` or `tsx`-driven asserts) over the pure modules: `books/orderBook.ts`, `books/crc32.ts`, `node-driver/predicates.ts`, and the schema guards - none import Cypress, so this is wiring, not refactoring.
- Seed it with a recorded live fixture (one book session: snapshot, ~50 updates, >=5 `cs` frames captured from a probe) to make the flagship checksum algorithm verifiable deterministically and offline.
- Include the Risk #1 regression case (exponent-range level) and known CRC-32 vectors.
- Wire it as `npm run test:unit` and add it to the contract gates in [project-contract.md](docs/project-contract.md) ahead of `test:smoke` - fast feedback before any live call.
- Benefit: platform maintenance windows and live-data non-determinism stop being blockers for verifying the most valuable logic in the repo.

## Plan 3 - GitHub Actions / Workflow evolution (current status: working, needs hardening)

- Current state: [ci.yml](.github/workflows/ci.yml) is correct and live - `@smoke` on push/PR, nightly `@extended` at 02:17 UTC, dispatchable suite input, reports uploaded as artefacts with run-ID names. Node 24 + npm cache. Verified consistent with README/spec Section 9.
- Step 1 (hardening, Risk #5): `timeout-minutes` on both jobs, `concurrency` group with `cancel-in-progress` for the push path, `permissions: contents: read` at workflow level.
- Step 2: surface environment-blocked outcomes distinctly in CI - a report-parsing step that annotates the run (or a job summary) when `EnvironmentBlockedError` occurred, so a nightly "failure" caused by platform maintenance is distinguishable from the Actions list without opening artefacts.
- Step 3: add the offline unit lane (Plan 2) as a first job that gates the live jobs - cheap, and keeps live-API etiquette by failing fast before any socket opens.
- Step 4 (with the pinned-trio procedure): a monthly manual-dispatch "upgrade rehearsal" that runs `npm outdated` and the peer-range check from backlog Risk #1, keeping drift deliberate rather than discovered.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md)
