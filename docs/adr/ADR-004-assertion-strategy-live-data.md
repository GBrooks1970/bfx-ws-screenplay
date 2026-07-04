# ADR-004 — Assertion strategy for live data

**Status:** Fixed (design specification, 2 July 2026)

The feed is live and non-deterministic, so assertions are limited to three
categories:

- **(a) protocol conformance** — event flow, field presence, types;
- **(b) schema validity** — in-repo type guards (`cypress/schemas/`), the
  single source of structural truth;
- **(c) invariants** — e.g. bid < ask, checksum recomputation, sequence
  monotonicity.

Category (d), **value equality against market data, is prohibited**.
