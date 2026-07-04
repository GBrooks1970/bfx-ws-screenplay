# ADR-002 — Screenplay implemented in-house, not via Serenity/JS

**Status:** Fixed (design specification, 2 July 2026); reference-implementation note agreed 4 July 2026

To keep the pattern demonstration transparent, the Screenplay classes (Actor,
Ability, Task, Interaction, Question) are small in-repo TypeScript modules
rather than a Serenity/JS import. The repository is evidence of understanding
the pattern, not merely consuming it.

**Reference-implementation note (4 July 2026):** the core is a
**Cypress-adapted derivative of
[hand-baked-screenplay-pattern](https://github.com/GBrooks1970/hand-baked-screenplay-pattern)**,
mirroring its vocabulary and API surface (`Actor.whoCan`, `attemptsTo`,
`abilityTo`, the Ability/Task/Interaction/Question separation, the
`Ensure`/`Expectation` style) — ported, not consumed as a dependency:

1. The hand-baked core is promise-native (`performAs(): Promise<void>`), which
   conflicts with Cypress's queued-chainable command model. Here `performAs`
   returns `Cypress.Chainable`.
2. The library is distributed as a sibling repository, not an npm package, and
   this showcase repo must build with `npm ci` alone.
