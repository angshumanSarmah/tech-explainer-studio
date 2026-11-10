# Phase 06 — AI Content Director: Manual + DeepSeek, sourced storyboard, centralized branding

**Goal:** Generate or import a valid, sourced, executable VideoScript while consolidating existing Phase 02–04 branding without redesigning it.  
**Stage:** First AI-assisted video with one unified producer.  
**Roadmap mapping:** Content Director, research evidence, manual import and optional DeepSeek.  
**Execution:** One phase prompt; no separate SDD/spec/plan/tasks documents.  
**Prerequisite:** Phase 05 must be verified in `PROJECT_STATUS.md`; Phase 04's narrated output should work or an unresolved regression must be explicitly reported.  
**After this phase:** Phase 07.

## Run this phase in Codex

Paste the **complete prompt below**. Do not copy only the excerpts.

```text
You are implementing Phase 06 of Tech Explainer Studio, an independently owned project. Do not copy proprietary phi-video-gen code or employer-owned IP.

READ FIRST
AGENTS.md; CLAUDE.md if present; ARCHITECTURE.md; PROJECT_STATUS.md; docs/13-roadmap.md; docs/25-build-phase-map.md; docs/04-content-director.md; docs/03-contracts.md; docs/17-prompts-and-evals.md; docs/20-component-specs.md; docs/16-example-http-server.md; docs/11-security-and-legal.md; actual Phase 05 source/claims/ResearchBundle code; and Phase 02–04 Remotion/Kokoro/FFmpeg/caption implementation.

Inspect git status/diff, installed interfaces and executable code first. Do not assume planned files or commands exist. Reuse actual contracts. Do not replace working modules merely to fit a design document.

GOAL
Provide two peer workflows yielding the same validated, reviewable VideoScript:
A) MANUAL: ChatGPT, Codex, Claude or a human creates JSON externally, then the studio imports/validates/renders it without an LLM API key.
B) AUTOMATED: a provider-independent Director uses approved sources, with optional DeepSeek adapter, to generate structured narration and storyboard.
Consolidate current channel presentation into a versioned BrandProfile that applies to both workflows. DeepSeek, manual import and rendering must remain independent.

A. RESEARCHBUNDLE AND FACTUAL INTEGRITY
- Consume actual Phase 05 multi-source ResearchBundle; do not create a parallel source schema.
- Accept topic, target audience/level, format, duration, focus, exclusions and editorial instructions.
- Preserve multiple source IDs, claim IDs, provenance, revision/hash and reviewed statuses; source excerpts must be bounded and relevant.
- Keep external text/pasted notes untrusted; separate source content from system instructions and prohibit executing document instructions.
- Never promote unsupported, contradicted, insufficient or needs_review claims merely because an LLM cites them. Treat illustrative examples distinctly from verified facts.
- Keep claimant-to-source mappings in the generated draft or accompanying manifest, respecting existing versioned contracts and human review gates.
- Make manual notes identifiable as user-provided, not independently verified.

B. MANUAL CHATGPT/EXTERNAL-AI WORKFLOW — FIRST CLASS
- Provide a machine-readable export of the *actual* versioned VideoScript JSON Schema from Zod or a tested, equivalent schema representation.
- Export the *actual registered* animation catalog: component names, allowed props, accepted cue anchors/events, constraints and example invocations.
- Export at least one complete valid existing example; ensure it currently passes validation.
- Create a reusable prompt template for an external AI model, accepting topic, audience, duration, approved source excerpts/IDs, actual JSON Schema, catalog, and brand/storytelling constraints. Instruct external AI to output ONLY valid matching JSON and flag unrepresentable visuals rather than inventing components.
- Implement a CLI mechanism consistent with existing conventions to export this contract package, import externally generated JSON from a local file, parse and validate it, and save a draft for the existing Producer.
- Report precise field-level validation errors; no silent coercion, fabrication of evidence/source IDs, or covert styling changes.
- Manual import/validation/render must work with NO DEEPSEEK_API_KEY and no hosted model request.
- Demonstrate exact export -> external creation -> import -> validation -> render commands (use existing CLI names rather than assuming new ones).
- Avoid untested duplication of schema definitions; contract exports must stay in sync when registry/schema versions change.

C. OPTIONAL LLM DIRECTOR / DEEPSEEK
- Implement a provider-independent LLMProvider interface with structured requests/responses, timeout, cancellation where feasible, bounded retries/backoff, failure categories, token reporting and conservative cost estimation.
- Implement a DeepSeek adapter using configurable model and endpoint with environment-only credentials; do not require its key at startup or for manual work.
- Support mock/dry-run generation and an explicit capped-budget paid-call option, equivalent to `studio plan --topic ... --provider deepseek --max-api-usd ...` (adapt to actual CLI).
- Budget checks must include bounded context/output and repair attempts, stop when the next request cannot safely fit the allowance, and not claim cost estimates are final bills.
- Keep provider core replaceable by future Ollama/Claude adapters without changing Producer contracts; do not implement those adapters unless existing code warrants a tiny test double.
- Separate versioned prompt templates for research synthesis, claim audit, narration, storyboard and JSON repair.
- Parse untrusted LLM output as strict JSON. Validate against actual Zod schemas, registry, cues, evidence and review states; limit repair attempts.
- Do not add LangGraph, MCP orchestration or a broad research crawler simply to call an LLM.
- No paid DeepSeek calls without my explicit specific authorization. Ordinary tests use mocks.

D. EXECUTABLE STORYBOARDS
- Generate hook, narrative progression, scenes, narration, available visual types/props, semantic animation cues, source/claim references, estimated timing and suitable ending only where supported by existing schema.
- Use ONLY components registered in the actual Remotion/scene registry.
- If unsupported, choose a genuinely equivalent registered visual or return actionable unsupported_visual/review-needed information; do not invent components or execute LLM-supplied React/JS/shell code.
- Cue anchors must be validated. Speech timing estimates are advisory: retain measured Kokoro duration/sync and the Phase 04 requiresTimingReview gate.
- Preserve human approvals: a valid draft is not publication approval.

E. CENTRAL BRAND CONSOLIDATION — AUDIT BEFORE IMPLEMENTING
- Audit all existing Phase 02–05 style and voice settings: colors/backgrounds/gradients; diagrams, fonts/typography; captions, highlights, placement/safe zones; transitions/easing; Kokoro default narrator, speed and lexicon settings; logo/watermark/intro/outro *if present*; preexisting theme/config modules. Phase 05 may have none; do not invent any.
- Produce a concise location/ownership audit of hardcoded or duplicated values.
- Define a small versioned BrandProfile as the logical channel identity; cover colors (incl semantic success/warning/error), typography, captions, motion defaults, optional existing asset references and narrator defaults. Keep technical render dimensions/fps, source metadata and research records OUT of brand profile.
- Refactor currently working Remotion scenes, caption styling and default narration resolution to share approved brand tokens without a large rewrite. Modular files under one logical brand contract are fine.
- CRITICAL: preserve current appearance, fonts, caption behavior and selected narrator as the initial default brand. Do not invent a palette, logo, audio signature or redesign. Preserve installed font licensing and do not download assets without permission.
- Director expresses SEMANTIC intent, e.g. emphasis/error, while Producer resolves actual brand colors/styles. Reject arbitrary unsupported CSS, color, voice or asset injection in storyboards.
- Default existing scripts to the current approved BrandProfile; allow only validated approved profile IDs/overrides. Maintain previously implemented per-video voice override semantics, with a stable channel default.
- Persist resolved brand ID/version and relevant configuration identity in render/job manifest for reproducibility; preserve model/voice identity as separately required by current narration contract.
- Regression-test brand token use across multiple scenes, captions/safe zones, narrator defaults/overrides, compatibility with old scripts, and representative visual output where feasible. Never claim pixel-identical appearance without comparative evidence.
- Document exactly where a future channel color, caption font or default narrator is changed once for all videos.

F. SAME VALIDATION PATH FOR BOTH MODES
Manual/DeepSeek outputs must pass the SAME strict parsing, current versioned VideoScript Zod schema, animation registry/props, cues/timing, Phase 05 source/claim review, BrandProfile validation and existing release gates. Neither may self-approve. Preserve draft/review-needed semantics and existing Phase 01–05 fixtures, codecs, narration, captions and ffprobe checks.

OUT OF SCOPE
No autonomous broad topic search or topic trends agent; no recursive crawling; no new dashboard; no new visual identity; no major animation library expansion; no LLM-code execution; no OAuth or publishing; no live paid API usage without separate explicit authorization.

ACCEPTANCE CRITERIA
AC-01 A manual external VideoScript imports and validates without an LLM key, then works with the existing producer.
AC-02 Exports contain real versioned JSON schema, registered animation catalog, valid example and reusable external-AI prompt, all verified to match code.
AC-03 Mock provider uses a topic plus approved multi-source ResearchBundle to yield a valid sourced VideoScript draft.
AC-04 DeepSeek adapter is optional and handles missing keys, 429/timeouts, bounded retries, token/cost budgets and malformed JSON clearly.
AC-05 Invalid components/props/cues, missing evidence, contradictions, injection attempts and unsupported visuals cannot silently pass.
AC-06 The Phase 02–04 appearance and audio defaults are consolidated into versioned BrandProfile without unapproved redesign; existing example scripts still render.
AC-07 Per-video narrator override/default selection and resolved brand-version manifest data remain correct.
AC-08 An end-to-end manually imported HTTP-server example renders a narrated MP4 if environment permits; ffprobe verifies audio and video, captions and timing-review flags, or exact limitation is reported.
AC-09 Mock tests cover schema drift, manual import, provider failures and budget, proof/rights gates and brand consistency.
AC-10 No unauthorized paid API calls, automatic factual/public approval or uploads.

VERIFICATION
Run actual relevant typecheck/lint/unit/integration/prompt eval/brand/renderer regression tests. Provide commands and observed results, not assumed pass. Examine output MP4 streams with ffprobe if rendering; compare representative frames and narration settings if possible. Never remove requiresTimingReview or approval gates to pass a test. If pre-existing missing audio persists, report it as a blocker, don't assert narrated render success.

IMPLEMENTATION GUIDELINES
Possible areas: src/llm/, src/director/, existing Zod schemas and registry, src/branding/ or existing render theme, prompts/, CLI, tests/director/, tests/branding/. Inspect before creating. Prefer minimum coherent changes; avoid speculative infrastructure.

EXECUTION RULES
- Inspect repository and git diff first, work in small testable iterations, strict TypeScript/Zod, deterministic render-only execution.
- No paid DeepSeek call, OAuth, upload, commit/push, global install, big model download, confidential-code import or security downgrade without explicit specific authorization.
- Mock external services in tests, redact secrets, preserve employer IP boundaries and existing Phase 01–05 behavior. Stop for material architecture conflicts instead of silently weakening guards.
- Do not implement Phase 07 or later work.

AFTER PHASE
1. Update PROJECT_STATUS.md with observed status, changes, executed commands/results, artifacts, blockers and recommended next Phase 07.
2. Update main ARCHITECTURE.md only for implemented architectural changes, keeping docs/02-architecture.md and changed interface docs consistent; record significant decisions in docs/15-adrs.md.
3. Update AGENTS.md or CLAUDE.md ONLY for a durable global rule; avoid accumulating phase logs.
4. Report exported Director contract files, sample import commands, DeepSeek mocked/live status, branding audit and actual centralized setting locations, regressions and human review actions.
STOP after Phase 06.
```

## Human completion check

Review actual diffs, command output, exported schemas, narrator selection, first rendered MP4 and brand preservation before marking Phase 06 complete. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md). Do **not** trigger paid DeepSeek calls just to mark this phase complete.
