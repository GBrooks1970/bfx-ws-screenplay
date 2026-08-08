# Recommendations

**Project:** bfx-ws-screenplay
**Reviewer:** AI assistant (Gemini)
**Date:** 2026-08-07T14:10Z

## Priority Refactors

1. **Node 20 Unit Coverage Script Adaptation (MEDIUM):** Update `package.json` script definitions or `ADR-009` to clarify Node 22+ requirement for coverage profiling, or add a dual-target `test:unit` script for Node 20 local execution.
2. **Schema Catalogue Modularization (LOW):** Extract `isBookChecksumFrame` and `isHeartbeatFrame` into dedicated schema files under `cypress/schemas/`.
3. **Screenplay Task JSDoc Annotations (LOW):** Add JSDoc header documentation to Screenplay Tasks referencing corresponding `SPECIFICATION.md` sections.

## Immediate Next Steps

1. Continue periodic Cypress preprocessor trio dependency updates when `@badeball/cypress-cucumber-preprocessor` releases expanded peer range support.
2. Maintain automated dependency security audit policy (`npm run audit:ci`) in CI workflows.

## Future Project Enhancements

1. **SPEC-007 Sequencing & Reconnection (Stretch):** Implement optional reconnection and sequence-gap detection if stretch goal SPEC-007 is approved in future portfolio planning.
```

---