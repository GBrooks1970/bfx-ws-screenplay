# ADR-005 — Time and flake policy

**Status:** Fixed (design specification, 2 July 2026)

Every wait is a bounded wait for a condition (a frame matching a predicate)
with an explicit timeout constant in one configuration module
(`cypress/support/config/index.ts`). **No fixed sleeps.**

- Default message wait: 10 seconds. Connection timeout: 5 seconds.
- Heartbeat scenarios use a dedicated 30-second constant, because the platform
  emits `hb` roughly every 15 seconds (confirmed against live docs,
  4 July 2026; recorded in spec Section 11).
- A scenario blocked by platform status codes (20051/20060 or
  `platform.status: 0`) aborts as **environment-blocked**
  (`EnvironmentBlockedError`), distinguishable in reports from a product
  failure. A timed-out wait rescans the buffer for blocking codes before it is
  allowed to report a timeout.
- On the trades channel a bounded `te` wait that times out with no blocking
  code is further **classified** rather than blindly failed: a quiet market (no
  trade executed within the window, but connection, subscription and a
  schema-valid snapshot all present) surfaces as environment-blocked, while a
  malformed/mis-paired frame, an unacknowledged subscription, a missing
  snapshot or a socket fault stays a loud product failure. See
  [ADR-008](./ADR-008-trade-starvation-classification.md).
- The same classification now applies to every other bounded "at least N frames"
  window — ticker, candles and book checksums — and an environment-blocked
  outcome no longer fails the build: the suite runs through a gate that passes a
  run whose *only* failures carry the marker, while any product failure
  alongside one still turns the build red. See
  [ADR-010](./ADR-010-quiet-window-classification-and-gating.md).
- **Still no blind retries.** A quiet market is classified and reported, never
  re-rolled; every wait remains a single bounded condition-wait.
