# ADR-003 — Cucumber preprocessor

**Status:** Fixed (design specification, 2 July 2026)

Gherkin execution uses `@badeball/cypress-cucumber-preprocessor` (the
maintained fork), bundled with `@bahmutov/cypress-esbuild-preprocessor`.
Feature files are the executable specification; step definitions contain no
logic beyond delegating to Screenplay Tasks and Questions — assertions are
delegated too, via `Ensure.that(question, expectation)`.

**Inline-predicate boundary** (code review v2, Risk #5): single-expression
predicates over already-answered values may be defined inline in step files;
anything with branching, iteration state, or reuse moves to the
schema/invariant modules (`cypress/schemas/`, `cypress/support/books/`).
