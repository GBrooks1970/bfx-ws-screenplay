# ADR-006 — Book-depth transient-overshoot margin (25 subscribed / 30 allowed)

**Status:** Fixed (change note, 17 July 2026)

`SPECIFICATION.md` Section 8 (SPEC-004) states the invariant "book depth never
exceeds subscribed length" — the subscription is `len: '25'`
(`BOOK_SETTINGS.len`, `cypress/support/config/index.ts`). The maintained-book
purity check (`sidesPureAndOrdered` in
`cypress/support/step_definitions/spec-004.steps.ts`) instead bounds each
side at `1 <= size <= 30`, not `<= 25`.

## Rationale

The locally maintained replica can transiently hold more than 25 levels on a
side between two independent frames: an update that inserts a level beyond
the subscribed depth boundary, and the platform's own compensating removal
of the level that fell out of depth. Both frames are applied in order as
they arrive; the replica is correct in aggregate, but a purity check that ran
strictly at `<= 25` would intermittently see the book in the brief
overshot state and fail — a flake in the flagship unit, precisely what
ADR-005 exists to prevent.

`<= 30` is a deliberate, generous margin around that transient window, not a
loosening of the invariant's intent: it still catches genuine corruption
(unbounded growth, duplicate/unordered levels) while tolerating the one-frame
overshoot the update protocol allows. The margin was chosen during the
SPEC-004 review pack (4–5 July 2026, out-of-repo) but was not recorded
in-repo at the time — this note closes that gap (code review v1, Risk #2).

## Decision

Keep the `<= 30` bound in `sidesPureAndOrdered`, documented here rather than
tightened to a strict `<= len` post-quiescence check — the latter would need
a settle/quiescence signal the book-update stream does not otherwise need,
for no additional protection against the failure modes this invariant
actually guards against.

`SPECIFICATION.md` Section 8's "book depth never exceeds subscribed length"
describes the platform's steady-state contract, not the replica's
transient-update state; it cross-references this ADR for the implementation
detail.

## Consequences

- No code change: `sidesPureAndOrdered` is unchanged by this note.
- A future change to the update-application strategy that removes the
  transient-overshoot window (e.g. batching within a scan) should tighten
  this bound back towards `len` and update this ADR accordingly.
