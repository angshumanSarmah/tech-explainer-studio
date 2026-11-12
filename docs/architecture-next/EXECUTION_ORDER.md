# One-package execution order — no v6 / v6.1 dependency

**Completed phases (01–08, 11, 11B) are NOT rerun; source code remains unchanged by the installer.** Replaced historical prompt text from a previous v6 installation is only documentation; do not use it as an implementation command. There is no requirement to undo it to proceed.

**Current gate (2026-11-11):** the user reviewed the existing audit and gave CONDITIONAL GO subject to amendments. The amended [ADR-019](ADR-019-PROPOSED-composed-scenes.md) awaits final human acceptance. Do not rerun the audit. This documentation task does not authorize 11C or 11D; the [audit report](ARCHITECTURE_VERIFICATION_2026-11-11.md) remains unchanged historical evidence.

1. **Preservation established**: the audit found 11B committed and review artifacts retained; media approvals remain pending. Keep existing source, proposals and media. No auto-commit, cleanup or phase rerun.
2. **Amendment acceptance**: review amended ADR-019 using existing evidence, then separately authorize 11C. Conditional direction approval does not remove this stop gate.
3. **11C, after authorization**: run `codex/11c-generic-visual-composition-and-continuity.md`; require meaningful asset-backed generic compositions, compatible specialized/mixed crossfades and composed handoff, boundary-pacing diagnostics, unchanged historical reads, dependency/rights tests and real narrated playback review.
4. **11D**: run `codex/11d-source-guided-ai-visual-director.md` using the actual 11C schema/catalog and `docs/architecture-next/prompt-templates/` as proposed templates to reconcile, not blindly copy into the runtime. Preserve manual JSON use without provider credentials.
5. **12**: run existing `codex/12-local-creator-dashboard.md` **PLUS** `codex/addenda/12-source-guided-creator-workflow-v61.md`.
6. **09, 10, 13**: run the existing phase prompt with its matching `codex/addenda/` note from this pack. **14** optional, with its addendum only if you choose to implement discovery.

**When a future phase has an addendum**, tell Codex to read the original phase prompt AND the addendum in the same task. The addendum supersedes only conflicting forward-looking details, not security/review controls.

## Next human review prompt

```
Review docs/architecture-next/ADR-019-PROPOSED-composed-scenes.md and the reconciled architecture/compatibility/quality documents and 11C/11D prompts. Use the existing architecture audit; do not rerun it. Accept the amendments or identify remaining changes. Do not implement 11C, modify historical code/docs or grant release approval. Stop for review.
```

After acceptance, implementation still needs a separate explicit request. 11D follows only verified and human-reviewed 11C acceptance. Do not infer the next phase's authorization from this order.
