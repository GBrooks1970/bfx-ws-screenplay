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
