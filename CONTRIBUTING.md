# Contributing to Tech Explainer Studio

This package implements offline VideoScript validation. Rendering, narration, external integrations and the rest of the proposed application remain future phases; see `PROJECT_STATUS.md` for verified progress.

## Contribution workflow

1. Open a narrow issue with requirement ID, expected behavior, test plan and risks.
2. If it changes architecture or platform policy, add/update an ADR first.
3. Implement behind a typed interface, schema and test fixture.
4. Run typecheck, unit tests, integration tests and golden-frame validation.
5. Update `README` links and the appropriate engineering doc.
6. Review security/rights checks; disclose all third-party code/assets and licenses.

## Coding standards

- TypeScript strict; stable IDs; no hidden side effects.
- Prefer dependency injection for LLM, clock, filesystem, database, publisher and renderer.
- Avoid large prompt template strings in orchestrator classes; version markdown prompts separately.
- Every script/version/asset has provenance and checksum.
- Keep test fixtures synthetic, small and reproducible.
- Explicit error messages over automatic acceptance of placeholder assets.
- Do not include private Jira/Confluence URLs, employer names, credentials, or internal customer data.

## Review questions

Does this change make explanations more **correct, readable or repeatable**? Does it increase operational/AI cost? Does it create a new path to publish without approval? Are all visual props safe and typed? Would a source document be able to issue commands or expose secrets? Are code, tutorial and asset licenses documented?

## License note

The new repository's own license has **not yet been chosen**. Do not assume the eventual app is MIT merely because an upstream project is MIT. Third-party notices and rights reviews are required before publishing or distributing implementation source.
