# ADR-009 — Supported Node floor versus CI baseline

**Status:** Accepted (design note, 29 July 2026). Closes code review v1 (Codex)
Risk #5 / open Question #2, and reconciles the test-runner compatibility note
from [ADR-005](./ADR-005-time-and-flake-policy.md) / CODEX-05.

## Decision

- **Supported minimum: Node 20** (declared in `package.json#engines` as `>=20`).
  This is a **support promise**: the static gates and the deterministic unit
  suite are guaranteed to run on any Node 20.x release.
- **Development / CI baseline: Node 24** (current active LTS): `.nvmrc` = `24`
  and both CI jobs use `actions/setup-node@v5` with `node-version: 24`.

A single Node minimum keeps the framework broadly installable (Node 20 is still
in maintenance), while CI and the checked-in `.nvmrc` exercise the current LTS.

## Why a floor *below* the CI version, and the coverage nuance

The deterministic unit suite runs on Node's built-in `node:test` via `tsx`
(CODEX-05) — available since Node 18, so it runs on the Node 20 floor. **Coverage
enforcement** (`test:unit:coverage`) additionally uses the `--test-coverage-*`
flags (`--test-coverage-include`, `--test-coverage-branches`), which Node added
in **22.8**. Those flags error on Node 20 (`bad option`).

Rather than raise the whole support floor to 22.8 just to enforce coverage, the
coverage gate is scoped to the **CI baseline** (Node 24), where it always runs.
The Node 20 floor still runs the unit tests themselves (`test:unit`) — it simply
does not compute the branch threshold. This keeps the minimum a genuine promise:
everything a Node 20 user needs to run works; only a CI-baseline reporting gate
needs the newer runtime.

## Gate matrix

| Gate | Command | Node 20 floor | Node 24 CI baseline |
| --- | --- | :---: | :---: |
| Type-check | `npm run typecheck` | ✅ | ✅ |
| Lint | `npm run lint` | ✅ | ✅ |
| Dependency audit | `npm run audit:ci` | ✅ | ✅ |
| Unit tests | `npm run test:unit` | ✅ | ✅ |
| Unit + branch coverage floor | `npm run test:unit:coverage` | ⛔ (needs Node ≥ 22.8) | ✅ |
| Cypress `@smoke` | `npm run test:smoke` | live-API/CI gate | ✅ |
| Cypress `@extended` | `npm run test:extended` | live-API/CI gate | ✅ (nightly/dispatch) |

## Floor evidence (retained)

The static and unit gates were executed on the lowest Node 20.x available to the
author and passed, confirming the floor is real:

```
Node v20.19.5 / npm 10.8.2 — 2026-07-29T06:03:46Z
typecheck   PASS
lint        PASS
audit:ci    PASS
test:unit   97/97 pass (0 fail)
```

`test:unit:coverage` was **not** run here (its flags need Node ≥ 22.8); it is
proven on every CI run under Node 24. Cypress `@smoke`/`@extended` are live-API
gates and run on the CI baseline.

## Aligned declarations

- `package.json#engines`: `{ "node": ">=20" }` — the minimum.
- `.nvmrc`: `24` — the dev/CI baseline.
- `.github/workflows/ci.yml`: `node-version: 24` (both jobs).
- `README.md`: "Requires Node 20+ (CI runs Node 24)"; the coverage note records
  the Node ≥ 22.8 requirement.
- `SPECIFICATION.md` Section 11 version-pins note points here rather than
  implying a single Node version for both `engines` and CI.

## Consequences

- The Node 20 floor is a checked promise, not just an install hint.
- Raising the floor to Node 22.8+ later (e.g. when Node 20 leaves maintenance)
  would let the coverage gate run everywhere and simplify this note; until then
  the split above is the deliberate, documented state.
