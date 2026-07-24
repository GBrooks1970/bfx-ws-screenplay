# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)

**Reviewer:** AI assistant (Codex GPT-5)

Findings are ordered from highest to lowest severity. The latest nightly failure was inspected
specifically for the project-contract distinction: it is not a platform maintenance or
`environment-blocked` outcome.

## Risk #1 (HIGH) - The flagship checksum assertion cannot serialise valid live `1e-8` amounts

**Risk Description:** `wireNumber()` rejects every JavaScript number whose `String()` form uses
exponent notation. That was a safe interim response to a silent checksum divergence, but it does
not implement the required plain-decimal wire serialisation. Valid current Bitfinex order-book
data has now reached the rejected path and made the latest nightly run red.

**Evidence:**

- [orderBook.ts](../../cypress/support/books/orderBook.ts) (lines 78-99) states that the platform
  expects a plain decimal token, then throws `ChecksumSerializationError` whenever the native
  token contains `e` or `E`.
- [check-checksum-serialization.ts](../../scripts/check-checksum-serialization.ts) (lines 55-73)
  treats throws for `1e-7` and `1e21` as passing behaviour; it does not prove conversion to the
  platform's plain-decimal representation or a known checksum fixture.
- [ChecksumVerifications.ts](../../cypress/support/screenplay/questions/ChecksumVerifications.ts)
  (lines 48-55) routes every live checksum through `bookChecksum()`, so one valid exponent-form
  price or amount aborts the entire flagship scenario before comparison.
- GitHub Actions run
  [29982495691](https://github.com/GBrooks1970/bfx-ws-screenplay/actions/runs/29982495691)
  on baseline `aa84dc9` failed 22/23: SPEC-004 raised
  `ChecksumSerializationError: checksum serialisation gap: 1e-8`. SPEC-001, 002, 003, 005, and
  006 passed. No `environment-blocked` marker appeared.
- [docs/backlog.md](../../docs/backlog.md) (lines 66-74) records the prior issue as resolved
  because the guard fails loudly. The current nightly proves that this mitigated silent
  miscomparison but did not restore the specified checksum behaviour.

**Impact Analysis:**

- The repository's strongest advertised assertion is unavailable for valid current feed values.
- Default-branch nightly CI is red, reducing portfolio credibility and masking later regressions.
- The error is correctly diagnosable, but it is a framework limitation rather than a Bitfinex
  product failure or platform-maintenance event.
- `check:pure` gives a misleading green signal because it proves the guard, not checksum parity.

**Refactor Recommendation and Strategy:**

1. Verify the exact decimal token rules against current Bitfinex checksum documentation and a
   captured frame/checksum fixture.
2. Replace the exponent rejection with a deterministic exponent-to-plain-decimal serializer, or a
   deliberately selected decimal library whose output contract is covered by fixtures.
3. Add boundary cases for `1e-8`, `-1e-8`, large magnitudes, zero, and ordinary decimals.
4. Add one or more full known-book fixtures with expected checksum values, so the unit proof tests
   the whole `levels -> wire string -> signed CRC-32` path.
5. Run static gates and the targeted SPEC-004 extended scenario through the approved
   nightly/on-demand channel; do not weaken or skip the assertion.

## Risk #2 (MEDIUM) - A high transitive advisory is present while project status claims zero

**Risk Description:** The current lockfile resolves Mocha's nested `brace-expansion` to 2.1.1,
which `npm audit` reports under a high-severity denial-of-service advisory. The repository is a
test tool rather than a deployed service, so exploitability is limited, but the canonical status
and README claims are factually wrong and CI does not gate the audit.

**Evidence:**

- [package-lock.json](../../package-lock.json) (lines 5895-5903) resolves
  `node_modules/mocha/node_modules/brace-expansion` at 2.1.1.
- [package-lock.json](../../package-lock.json) (lines 5954-5962) shows Mocha's nested
  `minimatch` accepting `brace-expansion ^2.0.2`.
- [package.json](../../package.json) (lines 12-17) overrides `diff` and
  `serialize-javascript`, but does not constrain this newly disclosed transitive.
- `npm audit --audit-level=low` failed on 2026-07-24 with one high-severity advisory,
  `GHSA-3jxr-9vmj-r5cp`; npm reported that a fix is available.
- [README.md](../../README.md) (lines 120-121) and
  [docs/backlog.md](../../docs/backlog.md) (lines 169-173) both state `npm audit: 0
  vulnerabilities`.
- The latest nightly `npm ci` log also printed "1 high severity vulnerability" but continued,
  because the workflow has no explicit audit step.

**Impact Analysis:**

- A crafted glob pattern reaching the vulnerable transitive could consume excessive CPU.
- The practical exposure is constrained to developer/CI tooling and repository-controlled input;
  no public service or authenticated production data path exists here.
- False zero-vulnerability claims weaken trust in the backlog as the current source of truth.
- Future advisories can accumulate unnoticed because CI remains green at the install step.

**Refactor Recommendation and Strategy:**

1. Test the package-manager-proposed lockfile repair on a branch and inspect the actual dependency
   delta rather than applying a blind update.
2. If the parent cannot yet update, add the smallest compatible override only after confirming
   Mocha/minimatch compatibility and running all gates.
3. Add an explicit audit policy command to CI, with a documented severity threshold and exception
   process for non-exploitable tooling advisories.
4. Update README and backlog claims to include the audit date and result, avoiding permanent
   "zero" wording that becomes stale.

## Risk #3 (MEDIUM) - Deterministic coverage is too narrow for the amount of custom protocol code

**Risk Description:** The repository has a broad live E2E suite but only two standalone scripts
containing seven checks. Critical pure or mockable modules have no conventional unit runner,
fixture suite, coverage measurement, or branch-level regression evidence.

**Evidence:**

- [package.json](../../package.json) (lines 18-29) exposes live smoke/extended scripts and two
  custom proof scripts, but no `test:unit`, mock-driver, contract-test, or coverage script.
- The two scripts cover `wireNumber`/`checksumString` and error-message diagnostics. They do not
  cover [predicates.ts](../../node-driver/predicates.ts), driver open/poll/close edge cases,
  schema guards, book update/removal folding, CRC fixtures, or `EnvironmentBlockedError` routing.
- The executable feature inventory contains 23 live or socket-facing scenarios. Eight smoke
  scenarios passed in this review; extended execution is intentionally deferred to CI.
- [ci.yml](../../.github/workflows/ci.yml) (lines 39-43) runs the seven pure checks only in the
  smoke job and publishes no code coverage or mutation evidence.
- Risk #1 demonstrates the limitation directly: the pure checks passed 7/7 in this review while
  the current default-branch nightly failed the checksum behaviour they are meant to protect.

**Impact Analysis:**

- Most fault localisation depends on a live exchange and Cypress, increasing feedback time and
  exposure to non-deterministic data.
- Boundary defects in the predicate DSL, buffer cut-offs, schemas, and book fold may be found only
  by nightly scenarios.
- A portfolio reviewer cannot quantify which branches of the custom framework have deterministic
  evidence.
- The top-heavy pyramid makes safe dependency and Cypress-major upgrades harder.

**Refactor Recommendation and Strategy:**

1. Adopt a lightweight TypeScript unit runner already compatible with the stack.
2. Start with table-driven fixtures for predicate operators, all schema guards, book add/update/
   delete rules, CRC-32 known vectors, and full known-book checksum parity.
3. Extract or inject the WebSocket construction/timer boundary so driver lifecycle and timeout
   paths can be tested without the public endpoint.
4. Add unit coverage with an explicit, modest initial floor based on critical branches rather than
   chasing a vanity percentage.
5. Keep live smoke and nightly extended suites as system-level confidence; unit tests supplement,
   not replace, the protocol proof.

## Risk #4 (LOW) - Checksum and heartbeat frames bypass the normative schema catalogue

**Risk Description:** The normative specification requires one schema/type guard per message
type, including book checksum and heartbeat frames. Those shapes are recognised inline by a
Question and by the predicate interpreter instead of through `cypress/schemas/`.

**Evidence:**

- [SPECIFICATION.md](../../SPECIFICATION.md) (lines 221-223) explicitly lists book checksum
  frames and heartbeat among the types whose schemas are the single source of structural truth.
- [ChecksumVerifications.ts](../../cypress/support/screenplay/questions/ChecksumVerifications.ts)
  (lines 41-47) checks only that index 2 is an integer; it does not validate the full frame shape.
- [predicates.ts](../../node-driver/predicates.ts) (lines 45-59) treats any channel frame whose
  index 1 is `hb` as a heartbeat, including shapes with unexpected trailing data.
- [schemas/index.ts](../../cypress/schemas/index.ts) (lines 1-42) exports no checksum-frame or
  heartbeat guard.

**Impact Analysis:**

- Malformed frames can be selected and partially validated rather than failing at a named schema
  boundary.
- The documented "one structural source of truth" rule has exceptions that a new contributor may
  extend.
- This is low current runtime risk because later logic still checks the values it consumes.

**Refactor Recommendation and Strategy:**

- Add exact `isBookChecksumFrame(frame, chanId)` and `isHeartbeatFrame(frame, chanId)` guards in
  `cypress/schemas/`, export them centrally, and use them at the assertion boundary.
- Keep the predicate DSL transport-focused; a match selects a candidate, while the schema guard
  proves the complete shape.
- Add positive, wrong-channel, wrong-length, and wrong-type unit fixtures.

## Risk #5 (LOW) - Normative SDD metadata contradicts the implemented Node support policy

**Risk Description:** The normative design document is intentionally historical in places, but it
still presents live normative claims that conflict with the implemented repository.

**Evidence:**

- [SPECIFICATION.md](../../SPECIFICATION.md) (line 6) says "Design & specification phase - no
  implementation", while README and backlog record SPEC-001 through SPEC-006 as complete.
- [SPECIFICATION.md](../../SPECIFICATION.md) (line 313) says `.nvmrc`, `engines`, and CI are all
  Node 24. [package.json](../../package.json) (lines 8-10) deliberately allows Node 20+, and
  [README.md](../../README.md) (line 73) documents that split.
- The prescribed gates and live smoke passed in this review on Node 20.19.5, providing current
  evidence that Node 20 is supported in practice.
- [docs/backlog.md](../../docs/backlog.md) (lines 247-248) leaves the floor as an open question
  rather than reconciling the normative statement.

**Impact Analysis:**

- An SDD agent following the normative specification cannot tell whether to preserve Node 20
  compatibility or tighten the engine to Node 24.
- The "no implementation" status makes the primary design artefact look abandoned after delivery.
- Runtime risk is low because package and README agree and the current gates pass.

**Refactor Recommendation and Strategy:**

- Record the post-implementation status and Node-floor decision through the project's required
  specification/ADR change process.
- If Node 20 remains supported, amend the normative confirmation to distinguish minimum supported
  Node from the CI baseline. If Node 24 is required, tighten `engines` and validate locally/CI.
- Add an "implemented as of" status without rewriting historical design decisions.

## Strengths Re-verified

- No fixed sleeps were found in scenario code; the driver's 100 ms polling interval implements
  bounded condition polling rather than test synchronisation by delay.
- Each scenario receives a fresh Actor and Ability, while the `After` hook resets every driver
  session unconditionally.
- The public API uses no keys, authentication, or secrets, and the repository search found no
  committed credential artefacts.
- CI uses `contents: read`, npm caching, job timeouts, push concurrency control, and always-run
  report uploads.
- The MIT project licence is present; inspected direct dependencies declare MIT or Apache-2.0.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0002Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
