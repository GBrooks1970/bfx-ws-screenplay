<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: DOCS/implementation-logs/YYYY-MM-DD_[topic].md
  TEMPLATE: DOCS/templates/implementation-log.template.md
-->

# CI red on the default branch — quiet-window classification and the environment-blocked gate — 2026-08-06

## Session Summary

Diagnosed why `main` was red and fixed it. The default branch had failed **3 of its last 9
nightly runs (33%)** with a healthy tree — commit `c5975cc` passed on 5 August and failed on
both 4 and 6 August, the same tree returning three different verdicts depending on market
activity. Two independent causes were found: the `EnvironmentBlockedError` marker that ADR-008
promised would keep quiet markets out of failure counts was **never consumed by anything**, and
the ticker, candle and book-checksum waits ADR-008 deferred had since started failing as bare
`AssertionError`s indistinguishable from real regressions. Both are fixed on
`claude/bfx-ws-screenplay-ci-red-qy33n4` and **merged to `main` as PR #32** (`c5e2695`):
quiet-window classification is generalised to every channel, and both suites now run through a
build gate that honours the marker. Unit suite 97 → **122 tests / 34 suites**.

**PR #32 merged without any CI run.** It was merged roughly one minute after being opened, before
Actions scheduled the `smoke` job, so the change reached `main` with only the local gates
(`typecheck`, `lint`, `test:unit:coverage`) behind it. The first live exercise is therefore the
post-merge `push` run on `main`, not the PR — see Recommendations.

---

## Objectives

1. ✅ Identify the actual cause(s) of the red default branch from CI evidence, not inference.
2. ✅ Make the `EnvironmentBlockedError` marker affect the build, as ADR-008 claimed it already did.
3. ✅ Extend quiet-window classification to the ticker and book-checksum waits that failed unclassified.
4. ✅ Keep every product-failure path loud — no regression may be masked by a quiet market.
5. ✅ Reconcile the ADRs whose stated consequences this work proved untrue.
6. ⏸️ Cypress `retries` — **deliberately not done**; contradicts ADR-005 (see Technical Decisions).
7. ⏸️ `npm audit` live-advisory exposure — **out of scope**, recorded as a policy question.

---

## Test Results

Local, Node v22.22.2, branch `claude/bfx-ws-screenplay-ci-red-qy33n4`:

| Stack | Suite / gate | Before | After | Status |
|---|---|---|---|---|
| TypeScript | `node:test` unit suite (`test:unit`) | 97 tests / 29 suites | **122 tests / 34 suites** | ✅ PASS |
| TypeScript | Branch-coverage floor (`test:unit:coverage`, ≥80%) | green | green (93.81% overall) | ✅ PASS |
| TypeScript | `channelWindowDiagnostics.ts` coverage | — | 100% line / **90.91% branch** | ✅ PASS |
| TypeScript | `environmentBlockedGate.ts` coverage | — | 90.91% line / **89.58% branch** | ✅ PASS |
| TypeScript | `tsc --noEmit` (`typecheck`) | green | green | ✅ PASS |
| TypeScript | `eslint .` (`lint`) | green | green | ✅ PASS |
| Cypress (live) | `@extended` on `main` @ `c5e2695` (dispatched run #31126673546) | — | **23/23 passing**, run green | ✅ PASS |
| Cypress (live) | The gate's *excusing* path, live | — | **not exercised** — no quiet window occurred | ⏸️ UNPROVEN |

**The live Cypress suites could not be run *locally* in this session.** The sandbox proxy blocks the
Cypress browser-binary download (`ECONNRESET` on the `cypress install` postinstall); dependencies
were installed with `CYPRESS_INSTALL_BINARY=0`, which is sufficient for typecheck, lint and the
`node:test` suite but not for a browser run.

Since PR #32 merged with no CI, an `@extended` run was **dispatched manually against `main`**
(#31126673546, `c5e2695`) to close that gap. It passed 23/23 in 1:38. That result proves:

- the new `scripts/run-suite.ts` wrapper drives Cypress correctly in CI and propagates a clean exit
  — the module-API invocation was a real risk, since it replaced a plain `cypress run`;
- the new `onTimeout` classifiers on ticker, candles and book checksums **do not misfire** when
  frames do arrive — every one of those waits resolved normally.

It does **not** prove the gate excuses a quiet market in production. The market was busy at 19:10
UTC (SPEC-002 in 12 s, SPEC-003 in 19 s), so no window starved and the gate had nothing to excuse —
it correctly printed nothing and passed through. **The excusing path remains unexercised live** and
will stay so until a genuinely quiet window occurs. Until then the unit suite is its only proof.

Both real failures were replayed through the gate as a substitute end-to-end check:

| Replayed input | Expected | Actual |
|---|---|---|
| Nightly #31068372818 report (1 quiet-market failure) | pass the build | **exit 0** ✅ |
| Same report + a genuine checksum mismatch | stay red, preserve code | **exit 2** ✅ |

---

## Changes Implemented

### 1 — The build gate that honours the marker

**Files changed:**
- `scripts/environmentBlockedGate.ts` (new) — pure decision: reduces a cucumber JSON report to its
  failed scenarios and decides whether a non-zero Cypress exit is explained *entirely* by
  environment-blocked outcomes.
- `scripts/run-suite.ts` (new) — the impure half: drives Cypress via its Node module API and applies
  the gate.
- `package.json` — `test:smoke` / `test:extended` now invoke `run-suite.ts` instead of `cypress run`
  directly; `test:unit:coverage` gains the two new pure modules.
- `tsconfig.json` — `scripts/**/*.ts` added to `include` so the gate is typechecked.

`core/errors.ts` documents `EnvironmentBlockedError` as *"the marker reports are filtered on"* and
ADR-008 closes by claiming quiet-market nightlies *"now report an explained, distinguishable
environment outcome instead of a red product failure."* Neither was true in the build: `cypress run`
counts any thrown error as a failing test and exits non-zero. `grep` for `EnvironmentBlockedError`
outside its throw sites found only the re-export in `core/index.ts`. The classification produced a
better *message* and changed nothing about the verdict.

The gate can only ever turn a red build green, so it is deliberately biased toward staying red. It
opens **only** when there is at least one failed scenario and *every* failed scenario carries the
marker. Each of these stays red, and each has a unit test:

- a product failure alongside a quiet market — the masking risk;
- a non-zero exit with no failed scenario in the report (crash, config error, missing report) — an
  unrun suite is not a pass;
- an unparseable report;
- a product failure whose assertion text merely *quotes* the marker — matching is anchored to the
  start of the error message, so only an error genuinely thrown as `EnvironmentBlockedError`
  qualifies.

The original non-zero exit code is preserved rather than normalised, and every excused scenario is
printed with its diagnostic before the build passes.

Cypress is driven through its **Node module API**, not by spawning a binary: `cypress/bin/cypress`
is not an exported subpath (`ERR_PACKAGE_PATH_NOT_EXPORTED`), and the `.bin` shim differs between
the project's local Windows shell and CI's Ubuntu. The union
`CypressRunResult | CypressFailedRunResult` is narrowed on the *presence* of `status`, since
`CypressRunResult` carries no such field.

### 2 — Generalised quiet-window classification

**Files changed:**
- `cypress/support/screenplay/streams/channelWindowDiagnostics.ts` (new) — pure `classifyChannelWindow`.
- `cypress/support/screenplay/streams/classifyChannelStarvation.ts` (new) — the Cypress-side evidence
  gatherer, mirroring `trades/classifyTradeStarvation.ts`.
- `cypress/support/screenplay/streams/index.ts` (new).
- `cypress/support/screenplay/questions/ReceivedUpdates.ts` — `fromTheTicker` and `candles` gain
  `onTimeout` classification.
- `cypress/support/screenplay/questions/ChecksumVerifications.ts` — `firstConsecutive` likewise.

ADR-008 deferred these waits: *"the same pattern could extend to them if a future quiet-window
failure warrants it."* It warranted it — run #30953031343 failed on a ticker update window and
#30686140556 on a book-checksum window, both as bare `AssertionError`s.

The trades path keeps its own classifier: `te`/`tu` evidence has no analogue on other channels. The
two modules share **precedence, not code** — most-specific product failure first, so a real
regression can never be masked by market quiet.

**`quietFloor` is the new lever**, and the reason this generalises safely. It is the number of
matching frames that must arrive before a shortfall counts as merely quiet:

| Wait | `quietFloor` | Why |
|---|---|---|
| Ticker, candles | `0` | A genuinely quiet minute pushes no update at all — zero is a plausible market state. |
| Book checksums | `1` | `cs` frames only flow because `EnableChecksumFrames` set the conf flag. **Zero** `cs` frames while the book streams means the flag was never honoured — a product failure `quietFloor: 0` would have excused as market quiet. A partial run (2 of 5) is a slow book and passes. |

Candles had not yet failed but is the identical wait shape and was grouped with ticker by ADR-008;
included to avoid a known-latent repeat.

### 3 — Unit coverage for both new decisions

**Files changed:**
- `test/unit/channel-window-classification.test.ts` (new) — 10 tests: every branch, the precedence
  between them, and all three `quietFloor` cases.
- `test/unit/environment-blocked-gate.test.ts` (new) — 15 tests: marker matching (including the
  quoted-marker false positive), report reduction against the real preprocessor shape, and every
  gate path that must stay red.

Both new pure modules were added to the `test:unit:coverage` branch-coverage floor, per the CODEX-05
precedent that a pure decision module is not done until it is in the gate.

---

## Technical Decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Gate at the **report**, not inside Cypress | ADR-008 already specified the marker as the thing "reports are filtered on"; a post-run gate is pure, unit-testable, and needs no Cypress internals | Converting the failure to a Mocha *pending* mid-test via `this.skip()` / `cy.state('runnable')` — depends on undocumented internals and does not compose with the cucumber preprocessor's step binding |
| Gate opens only when **all** failures carry the marker | One real regression must never ride out on a quiet night; this is the same precedence ADR-008 fixed inside the classifier, applied at the build level | Excusing environment-blocked failures individually and failing on the remainder — would have let a quiet market silently reduce the failure count |
| Anchor marker matching to the **start** of the error message | A product failure whose assertion text quotes `environment-blocked:` must not open the gate | Substring search anywhere in the message |
| Preserve the original non-zero exit code | `cypress run` exits with its failure count; #30686140556 exited 2, and that information should reach CI | Normalising every failure to 1 |
| Introduce `quietFloor` rather than a uniform rule | Zero frames means "quiet" on ticker and "broken" on checksums; a single rule would have to be wrong on one of them | A uniform "any shortfall is quiet" rule — would have excused a silently disabled checksum flag |
| Separate `streams/` module rather than extending `trades/` | `TradeStreamEvidence` is `te`/`tu`-specific; generalising it in place would have churned a module under an accepted ADR for no behavioural gain | Rewriting `classifyTradeStream` to serve both |
| Drive Cypress via the **Node module API** | `cypress/bin/cypress` is not an exported subpath, and `.bin` shims differ across the project's Windows/Ubuntu split | `spawnSync` on `node_modules/.bin/cypress`; `npx cypress run` |
| **No Cypress `retries`** | ADR-005 and `config/index.ts` state the position explicitly — *"named condition-waits, never retries."* A quiet market is classified and reported, never re-rolled. Retries would also double live-API load against spec Section 9 etiquette | `retries: { runMode: 1 }` on the live specs — raised in the initial recommendation, withdrawn on reading ADR-005 |

---

## Documentation Updates

- `docs/adr/ADR-010-quiet-window-classification-and-gating.md` — **new.** The full decision record:
  both problems with their CI evidence, the generalised outcome table, `quietFloor`, the gate's
  stay-red conditions, and the consequences (including the residual risk that a defect presenting
  exactly as a quiet window is now excused).
- `docs/adr/ADR-008-trade-starvation-classification.md` — annotated **both** of its stated
  consequences, which this session proved untrue in the build: the marker had no effect, and the
  deferred ticker/candle waits did go on to fail.
- `docs/adr/ADR-005-time-and-flake-policy.md` — records that classification now covers every bounded
  window and that an environment-blocked outcome no longer fails the build; restates **no blind
  retries**.
- `README.md` — ADR-010 in the decision table; the reports section now describes the gate; the unit
  test section lists the two new pure modules.
- `docs/project-contract.md` — the environment-blocked norm now covers quiet markets as well as
  maintenance, and points at `scripts/run-suite.ts`.

---

## Lessons Learned

- **A documented marker is not a mechanism.** ADR-008 was a good decision, correctly implemented,
  with a thorough test suite — and it did not change the build, because nothing read the marker it
  defined. The ADR's Consequences section asserted an outcome that no code delivered. Worth asking
  of any "distinguishable outcome" design: *what specifically consumes this, and is that thing under
  test?*
- **Same commit, different verdicts, is the whole diagnosis.** `c5975cc` passing on 5 August and
  failing on 4 and 6 August ruled out a code regression before a single log was read. Checking
  whether a red run's SHA has ever been green is a cheap first move on any live-API suite.
- **Deferred scope in an ADR is a prediction worth re-reading.** ADR-008 said ticker and candles
  *"could extend … if a future quiet-window failure warrants it."* Two such failures had already
  happened by the time anyone looked. The deferral was reasonable; the absence of a trigger to
  revisit it was the gap.
- **A gate that can only turn red green must be tested from the red side.** The valuable tests here
  are not "a quiet market passes" but the four cases that must *stay* red — especially the product
  failure whose text merely quotes the marker, which a naive substring match would have excused.
- **"Zero" is not one condition.** Zero ticker updates is a quiet market; zero checksum frames is a
  broken feature flag. Encoding that as an explicit per-call-site floor kept one rule from having to
  be wrong somewhere.

---

## Recommendations / Next Steps

- [x] ~~Verify the merged change live.~~ **Done** — dispatched `@extended` run #31126673546 on
      `c5e2695` passed 23/23. `main` is not broken by this change.
- [ ] **Confirm the gate's excusing path on a real quiet window.** The one thing still unproven
      live: run #31126673546 hit a busy market, so nothing starved and the gate never had to excuse
      anything. Watch for the first nightly that would previously have gone red and confirm it now
      passes *with* the `environment-blocked gate (ADR-010)` summary block in the log. Until that is
      seen, the excusing path rests on unit tests alone. — *high*
- [ ] **Investigate why no `push`/`pull_request` run was scheduled.** No workflow run was created for
      PR #32 opening, the merge push to `main`, or PR #33 opening, over roughly an hour — while a
      manual `workflow_dispatch` ran immediately. The pushes to the feature branch correctly produced
      no run (`push` is filtered to `branches: [main]`), but the other three are unexplained. Leading
      hypothesis: events originating from a GitHub App token do not spawn workflow runs, which would
      cover the two PR openings. Check Settings → Actions → General. Until this is understood, **no
      PR in this repo is actually being tested** — a larger exposure than the bug this session
      fixed. — *high*
- [ ] **Consider requiring `smoke` to pass before merge.** This session's change reached `main` on
      local gates alone because the PR was merged inside the CI scheduling window. A required check
      on `smoke` would close that hole — and is more valuable now that the gate makes `smoke`
      tolerant of quiet markets, so requiring it no longer means requiring a busy market. — *medium*
- [ ] **Confirm on the next nightly `extended` run** that a quiet window now reports as excused and
      passes, and that the gate's summary appears in the log. — *high*
- [ ] **Decide the `npm audit` policy.** `audit:ci` consults the live advisory database on every run,
      so a newly published HIGH advisory turns CI red with no code change — this caused
      #30880617831 (`brace-expansion` GHSA-rgw5-rvv9-x895, since fixed). Options: keep as-is and
      accept the interrupt, pin to a reviewed snapshot, or split the audit into a separate
      non-blocking job. Belongs in `docs/dependency-audit-policy.md`. — *medium*
- [ ] **Add a nightly quiet-rate signal.** The gate prints excused scenarios but nothing tracks them
      over time; a channel that is excused every night is a real problem wearing a green check.
      Consider counting environment-blocked outcomes per run in the artefact. — *medium*
- [ ] **Revisit `SYMBOLS.primary` for SPEC-003.** Every trades starvation observed so far is on
      `tBTCUSD` at ~03:25 UTC. If quiet windows persist after this change, the observation window or
      the symbol may deserve tuning rather than repeated excusing. — *low*

---

*Session logged: 2026-08-06. Author: Claude (claude-opus-5), driven by @GBrooks1970.*
