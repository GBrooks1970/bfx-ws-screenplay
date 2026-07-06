# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Findings are numbered high to low. There are **no HIGH-severity findings**: all three contract gates passed live during this review, `npm audit` reports 0 vulnerabilities, no secrets exist in the tree, and the documentation matches the code closely.

---

## Risk #1 (MEDIUM) - Checksum string construction can diverge from the wire representation for exponent-notation magnitudes

**Risk Description/Explanation**
The flagship assertion recomputes Bitfinex's CRC-32 book checksum from a locally maintained replica. The checksum input string is built with `String(price)` / `String(amount)`:

```typescript
// cypress/support/books/orderBook.ts (lines 66-72)
if (bid) {
  parts.push(String(bid.price), String(bid.amount));
}
if (ask) {
  parts.push(String(ask.price), String(ask.amount));
}
```

JavaScript's `Number`-to-string conversion produces exponential notation for magnitudes below `1e-6` and at/above `1e21` (e.g. `String(0.0000001)` is `'1e-7'`). The platform hashes its own serialisation of these values; whenever the wire literal differs from the JS shortest round-trip form, the local checksum will not match, and the scenario fails as a product failure even though the book replica is correct. [crc32.ts](cypress/support/books/crc32.ts) (line 24) also notes the input is "ASCII by construction" - true, but exponential forms are also ASCII, so nothing guards the format.

**Evidence Outline**
- [orderBook.ts](cypress/support/books/orderBook.ts) (lines 61-75) - `checksumString` uses bare `String(...)`.
- Mitigating evidence: the algorithm was proven live 8/8 before drafting and re-proves itself on every run ([orderBook.ts](cypress/support/books/orderBook.ts) lines 8-10; [backlog.md](docs/backlog.md) lines 104-110). On tBTCUSD/tETHUSD at P0 precision, prices and aggregated amounts almost never enter the exponent range, which is why this has not bitten.

**Impact Analysis**
A rare, hard-to-reproduce false failure in the project's flagship scenario - precisely the kind of flake ADR-005 exists to prevent. The probability rises if `BOOK_SETTINGS` or `SYMBOLS` are ever pointed at a low-priced pair (many altcoin pairs have levels below `1e-6` BTC-quoted). This is a latent correctness bug in the most reputation-carrying assertion of the repository.

**Refactor Recommendation and Strategy**
1. Add a formatting guard in `checksumString`: assert `!part.includes('e')` (or centralise a `wireNumber(n)` helper) and fail with a *named* error explaining the serialisation gap, so a mismatch is diagnosable rather than mysterious.
2. Better: preserve the raw token. The driver already owns the single ingress point (`bufferFrame`, [driver.ts](node-driver/driver.ts) lines 31-40); Bitfinex's own documentation notes checksum inputs should match its serialisation. A pragmatic middle ground documented in an ADR note (e.g. "exponent-range magnitudes are out of scope for the P0/tBTCUSD configuration") would also satisfy the SDD working agreement.
3. Add a pure unit check for `checksumString` covering an exponent-range level, executable via a plain `tsx`/`vitest` script - the book modules are already pure and test-ready.

---

## Risk #2 (MEDIUM) - Maintained-book depth invariant relaxed (25 -> 30) without an ADR change note

**Risk Description/Explanation**
`SPECIFICATION.md` Section 8 (SPEC-004) states the invariant "book depth never exceeds subscribed length" - the subscription is `len: '25'` ([config/index.ts](cypress/support/config/index.ts) lines 72-76). The implementation checks each side against a ceiling of **30**:

```typescript
// cypress/support/step_definitions/spec-004.steps.ts (line 29)
const sizeOk = (side: unknown[]): boolean => side.length >= 1 && side.length <= 30;
```

The relaxation is defensible (the replica can transiently exceed 25 levels between an insert beyond the depth boundary and the platform's compensating removal), but the SDD working agreement ([SPECIFICATION.md](SPECIFICATION.md) Section 10, item 3; [project-contract.md](docs/project-contract.md) lines 11-15) requires a written ADR change note *before* deviating code, and none exists in [docs/adr/](docs/adr/).

**Evidence Outline**
- [spec-004.steps.ts](cypress/support/step_definitions/spec-004.steps.ts) (lines 27-38) - `sidesPureAndOrdered` with the `<= 30` bound.
- [SPECIFICATION.md](SPECIFICATION.md) (line 270) - "book depth never exceeds subscribed length".
- No matching change note under [docs/adr/](docs/adr/) (five ADRs, all dated 2/4 July, none covering this).

**Impact Analysis**
Process-integrity rather than functional: the repository's central claim is that the spec is normative and deviations are documented. A reviewer who diffs spec against implementation finds an unexplained delta in the flagship unit, weakening the SDD demonstration. Functionally the looser bound slightly reduces the invariant's sensitivity (a replica bug that grows a side to 28 levels would pass).

**Refactor Recommendation and Strategy**
Either add a dated change note (ADR-006 or an addendum to the SPEC-004 section of the spec) explaining the transient-overshoot rationale and the chosen margin, or tighten the check to `len` and assert the *post-quiescence* depth instead. The one-line note is the cheaper and more honest fix; it may simply be recording a decision already made in the (out-of-repo) SPEC-004 review pack.

---

## Risk #3 (MEDIUM) - `ws:send` reports success unconditionally; no socket-state guard

**Risk Description/Explanation**
The driver's `send` neither checks `readyState` nor passes a completion callback:

```typescript
// node-driver/driver.ts (lines 131-135)
export function send(connectionId: string, payload: unknown): { ok: boolean } {
  const session = requireSession(connectionId);
  session.socket.send(JSON.stringify(payload));
  return { ok: true };
}
```

If the platform closes the socket mid-scenario (restart/maintenance - exactly the situation this suite is careful about elsewhere), `ws` will raise the send error asynchronously via the socket's `'error'` event; after a successful open, that listener only feeds the already-settled `settle` closure, so the error is swallowed. The step sees `{ ok: true }` and the scenario dies later in a poll timeout whose message points at the wrong cause.

**Evidence Outline**
- [driver.ts](node-driver/driver.ts) (lines 131-135) - unconditional `{ ok: true }`.
- [driver.ts](node-driver/driver.ts) (lines 102-109) - post-open `'error'` events settle an already-settled promise, i.e. are discarded.
- Contrast: the ability's poll path carefully reclassifies timeouts as environment-blocked when a blocking code exists ([CommunicateOverWebSocket.ts](cypress/support/screenplay/abilities/CommunicateOverWebSocket.ts) lines 94-112) - send failures bypass that intelligence.

**Impact Analysis**
Misleading diagnostics in the exact failure mode the project treats as first-class (platform maintenance). A dropped connection between subscribe and assert produces "Timed out after 10000 ms waiting for the ticker subscription ack" instead of "send failed: socket is not open", costing triage time and potentially mislabelling an environment issue as a product failure.

**Refactor Recommendation and Strategy**
In `send`, check `session.socket.readyState === WebSocket.OPEN` and return `{ ok: false, reason: 'socket-not-open' }` (extending the bridge contract type in [protocol.ts](node-driver/protocol.ts) line 72 and noting it in [predicate-dsl.md](docs/predicate-dsl.md)'s change log if treated as a contract change). Have the ability throw a `ConfigurationError`/`EnvironmentBlockedError` as appropriate. Optionally buffer a synthetic `connection-closed` marker frame on `'close'` so polls can distinguish "quiet channel" from "dead socket".

---

## Risk #4 (LOW) - Non-trivial invariant logic accumulating in the step-definition layer

**Risk Description/Explanation**
ADR-003 and the layer model say step definitions are "glue only - no logic". The predicates passed to `satisfies(...)` are mostly one-liners, but SPEC-004's steps define real domain logic at Layer 2: `strictlyDescending`, `strictlyAscending` and `sidesPureAndOrdered` (side purity, ordering, size bounds) - 24 lines of book semantics.

**Evidence Outline**
- [spec-004.steps.ts](cypress/support/step_definitions/spec-004.steps.ts) (lines 22-38).
- Similar, milder cases: `ohlcInvariantsHold` in [spec-005.steps.ts](cypress/support/step_definitions/spec-005.steps.ts) (lines 23-35); `bidDoesNotExceedAsk` in [spec-002.steps.ts](cypress/support/step_definitions/spec-002.steps.ts) (lines 16-17); `priceAndAmountValid` in [spec-003.steps.ts](cypress/support/step_definitions/spec-003.steps.ts) (lines 16-17).

**Impact Analysis**
Mild architecture drift, not a defect: the invariants are correct and readable. But they are unreachable for reuse (SPEC-006's post-unsubscribe checks may want them), invisible to any future unit-level testing of book semantics, and each addition further normalises logic in the glue layer the project's own ADR forbids.

**Refactor Recommendation and Strategy**
Move book-side invariants into the pure domain module (`cypress/support/books/invariants.ts`, exported alongside [orderBook.ts](cypress/support/books/orderBook.ts)) and OHLC invariants next to the candle schema; export them as named `Expectation`s (via `satisfies`) so steps become pure delegation again. Low effort, improves the ADR-003 story and enables unit testing of the invariants themselves.

---

## Risk #5 (LOW) - CI workflow lacks `timeout-minutes`, `concurrency`, and an explicit `permissions` block

**Risk Description/Explanation**
Both jobs in [ci.yml](.github/workflows/ci.yml) run against a live external service with no job timeout, no concurrency grouping, and default token permissions.

**Evidence Outline**
- [ci.yml](.github/workflows/ci.yml) (lines 20-37, 39-55) - neither `smoke` nor `extended` sets `timeout-minutes` or `concurrency`; no top-level `permissions:` key anywhere in the file.

**Impact Analysis**
- A wedged live-API run (e.g. Cypress hanging on a half-open socket) holds a hosted runner for GitHub's 6-hour default.
- Rapid consecutive pushes run parallel smoke suites against the public endpoint - against the spirit of the repo's own live-API etiquette (spec Section 9).
- Default `GITHUB_TOKEN` permissions are broader than the workflow needs (it only checks out and uploads artefacts).

**Refactor Recommendation and Strategy**
Add `timeout-minutes: 15` (smoke) / `30` (extended), `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` for the push-triggered job, and `permissions: { contents: read }` at workflow level. Three small edits, no behavioural change.

---

## Risk #6 (LOW) - `conf` acknowledgement validated inline, bypassing the schema catalogue

**Risk Description/Explanation**
Spec Section 7.2 mandates "assertions reference schemas, never inline field lists". `EnableChecksumFrames` validates the `conf` ack with a cast and an inline field check instead of a type guard in [cypress/schemas/](cypress/schemas/):

```typescript
// cypress/support/screenplay/tasks/EnableChecksumFrames.ts (lines 30-31)
const ack = frames[0]?.frame as Record<string, unknown> | undefined;
if (!ack || ack.status !== 'OK') {
```

**Evidence Outline**
- [EnableChecksumFrames.ts](cypress/support/screenplay/tasks/EnableChecksumFrames.ts) (lines 25-39); no `confEvent.ts` exists in [cypress/schemas/](cypress/schemas/).

**Impact Analysis**
Minor consistency gap: every other event type consumed by the suite has a documented guard with a verified-against-docs header. SPEC-007 (sequencing) would reuse the `conf` flow, so the gap compounds if the stretch unit lands.

**Refactor Recommendation and Strategy**
Add `cypress/schemas/confEvent.ts` (`{ event: 'conf', status: string, flags?: number }` guard with the usual docs-verification header) and use it in the task. Fifteen-minute change.

---

## Risk #7 (LOW) - Assertion failure messages stringify `Map`-based books to `{}`

**Risk Description/Explanation**
`Expectation.verify` reports failures as `... but got ${JSON.stringify(actual)}` ([Ensure.ts](cypress/support/screenplay/core/Ensure.ts) lines 13-18). `MaintainedBook` holds `Map`s ([orderBook.ts](cypress/support/books/orderBook.ts) lines 20-24), and `JSON.stringify` renders a `Map` as `{}` - so a failed book invariant prints `but got {"bids":{},"asks":{}}`, hiding the very state the engineer needs.

**Evidence Outline**
- [Ensure.ts](cypress/support/screenplay/core/Ensure.ts) (lines 14-19); [spec-004.steps.ts](cypress/support/step_definitions/spec-004.steps.ts) (lines 107-131) - the questions whose failures would be affected.

**Impact Analysis**
Diagnostics only, but it lands on the flagship unit's failures, which are also the rarest and most valuable to debug (and, per Risk #1, the ones most likely to need forensic detail).

**Refactor Recommendation and Strategy**
Either give `Expectation.verify` a pluggable renderer, or (simpler) have the book questions answer a serialisable projection (`sortedSides` output - plain arrays) instead of the raw `Map` structure; the steps already call `sortedSides` for their checks.

---

## Risk #8 (LOW, tracked) - Pinned-trio drift and Node engines floor

**Risk Description/Explanation**
Already recorded by the project itself, so listed here for completeness rather than as a new finding: the exact-pinned Cypress / cucumber-preprocessor / esbuild-preprocessor trio must be upgraded together ([backlog.md](docs/backlog.md) Risk #1, lines 38-56 - Cypress 15.18.0 already exists outside the preprocessor's peer range), and `engines: >=20` ([package.json](package.json) lines 8-10) is looser than the Node 24 CI/`.nvmrc` pin (backlog "Potential Next Steps", lines 132-134).

**Evidence Outline**
- [backlog.md](docs/backlog.md) (lines 38-56, 132-134); [package.json](package.json) (lines 8-10, 24-37); [.nvmrc](.nvmrc) (line 1).

**Impact Analysis**
Managed maintenance risk. The backlog scores it LOW (5 points) with a written upgrade procedure; this review verified the lockfile installs cleanly and `npm audit` is 0.

**Refactor Recommendation and Strategy**
No action beyond the backlog's own procedure. When SPEC-006 lands, a deliberate trio-bump check is a natural pre-close chore.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260706T1039Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_bfx-ws-screenplay.md)
