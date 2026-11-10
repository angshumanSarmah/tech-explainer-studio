# Phase 06 — AI Content Director: Manual + DeepSeek, Sourced Storyboards & Centralized Branding

You are implementing Phase 06 of **Tech Explainer Studio**, a new independently owned project. Do not copy proprietary `phi-video-gen` code or employer-owned intellectual property.

## 0. Read project context first

Before writing or modifying code, read:

- `AGENTS.md`
- `CLAUDE.md` (if present)
- `ARCHITECTURE.md`
- `PROJECT_STATUS.md`
- `docs/13-roadmap.md`
- `docs/25-build-phase-map.md`
- `docs/04-content-director.md`
- `docs/03-contracts.md`
- `docs/17-prompts-and-evals.md`
- `docs/20-component-specs.md`
- `docs/16-example-http-server.md`
- `docs/11-security-and-legal.md`
- The actual Phase 05 source, claims and `ResearchBundle` contracts
- Existing Phase 02–04 Remotion, Kokoro, narration, captions and FFmpeg implementations

Inspect the current Git working tree and implementation before making changes.

**Do not assume planned components, interfaces, commands or files already exist.** Use actual implemented contracts as the source of truth.

Extend the current architecture without unnecessarily replacing working code.

---

## 1. Goal

Implement a **provider-independent AI Content Director** capable of transforming approved technical research into a valid, sourced, executable `VideoScript`.

Support two independent content-creation workflows:

**Mode A — Manual AI-assisted creation**

A user researches a technical topic using ChatGPT, Claude, Codex or another tool and generates a structured `VideoScript` externally.

Tech Explainer Studio imports, validates, reviews and renders that script without requiring an LLM API key.

**Mode B — Automated AI Content Director**

The application receives a topic, editorial instructions and approved research sources, then uses a configured LLM provider to generate narration and an animation storyboard.

DeepSeek is the initial hosted provider. The architecture must permit future Claude and local Ollama integrations without changing the Video Producer.

**Both modes must use exactly the same validation, approval, branding and rendering pipeline.**

In addition, consolidate the existing visual and audio branding from earlier phases into a centralized, versioned `BrandProfile`.

The ultimate workflow is:

Topic + Approved Sources → Content Director → Validated VideoScript → Human Review → Branded Remotion Rendering + Kokoro Narration → Narrated MP4

The Director determines **what to explain and how to tell the story**.

The Video Producer determines **how approved scenes are executed and styled**.

---

## 2. Phase 05 ResearchBundle integration

Use the actual Phase 05 implementation to support multiple research sources per video.

Requirements:

1. Consume a validated `ResearchBundle` rather than assuming a single source URL.
2. Support multiple approved documentation URLs, GitHub references and manually supplied research notes.
3. Preserve each source's identity, provenance, content hash, retrieval timestamp and revision information where available.
4. Preserve source-to-claim mappings.
5. Support claims referencing one or more source IDs.
6. Support the existing claim statuses, including `supported`, `contradicted`, `insufficient`, `illustrative` and `needs_review`, or their actual implemented equivalents.
7. Never automatically approve a factual claim solely because an LLM asserts it.
8. Treat manually supplied research notes as user-provided material, not independently verified evidence.
9. Explicitly flag conflicting, insufficient, unsupported or unverifiable claims.
10. Preserve human review decisions rather than allowing generated outputs to overwrite them.
11. Build bounded, relevant research context for the Director rather than blindly supplying entire repositories or documents.
12. Treat all retrieved content, comments, code samples and pasted notes as untrusted data.
13. Prevent instructions embedded in external content from overriding system rules, schemas, approval gates or tool restrictions.
14. Respect existing source licensing and attribution rules.

Support editorial inputs such as:

- Video topic
- Target audience
- Audience technical knowledge
- Target duration
- Video format and aspect ratio
- Concepts to emphasize
- Concepts to exclude
- Desired explanation depth
- Additional editorial instructions

Reuse Phase 05 models wherever possible. Do not introduce an incompatible parallel research system.

---

## 3. Manual ChatGPT-assisted Content Director

**This must be a first-class feature, not a temporary fallback.**

Users must be able to generate video scripts using ChatGPT or another external AI tool and import them into Tech Explainer Studio.

### 3.1 Export the actual Director contract

Provide machine-readable exports derived from the actual implementation:

1. Current versioned `VideoScript` JSON Schema.
2. Registered animation component catalog.
3. Supported animation props, constraints and cue/event anchors.
4. At least one complete, currently valid `VideoScript` example.
5. A reusable external-AI Director prompt template.
6. Relevant brand constraints and approved source/claim requirements.

The export must reflect the current Zod schemas and actual renderer capabilities.

**Do not maintain a second, manually duplicated schema that can silently drift from the application.**

If schema-generation tooling is insufficient, implement a tested equivalent that fails when required contract information becomes inconsistent.

### 3.2 External Director prompt

Create a reusable prompt template suitable for ChatGPT, Claude or another external AI tool.

The template must accept:

- Topic
- Audience
- Duration
- ResearchBundle or approved source excerpts
- Source IDs and claims
- Editorial instructions
- Current VideoScript schema
- Supported animation catalog
- Scene and timing constraints
- Brand rules

It must instruct the AI to:

- Produce engaging educational narration.
- Use only supported animation components.
- Produce valid JSON matching the actual schema.
- Preserve traceable claim and source references.
- Avoid inventing technical facts.
- Distinguish illustrative examples from factual assertions.
- Follow narration and visual timing constraints.
- Avoid arbitrary brand colors, fonts and styling.
- Return reviewable errors or limitations when the requested concept cannot be represented.

The generated JSON should be directly importable rather than requiring manual restructuring.

### 3.3 Manual JSON import

Implement a minimal CLI-based workflow consistent with the existing CLI architecture.

It must:

- Accept a local JSON file.
- Parse it safely.
- Validate the actual VideoScript contract.
- Validate referenced animation components and props.
- Validate source and claim references.
- Validate supported timing and cue anchors.
- Validate brand selection.
- Produce actionable, field-level errors.
- Persist a successful import as a draft.
- Preserve review and approval requirements.
- Pass the validated draft into the existing Video Producer.

No LLM API key should be required.

Do not silently correct malformed JSON or substitute unsupported animations without reporting the change.

Provide an example showing how a user can:

1. Export the Director contract.
2. Give it to ChatGPT.
3. Receive a VideoScript JSON.
4. Import the JSON.
5. Validate it.
6. Render a narrated video.

Use commands consistent with the actual implementation; do not invent or hardcode CLI names without checking the repository.

---

## 4. Optional automated AI Content Director

Implement an interchangeable model adapter architecture.

### 4.1 LLMProvider abstraction

Create or extend a provider-independent `LLMProvider` interface.

The interface must allow:

- Configurable provider
- Configurable model
- Structured generation requests
- Timeouts
- Bounded retries
- Cancellation where supported
- Response validation
- Token usage reporting where available
- Estimated usage cost where possible
- Explicit failure reporting
- Request budget enforcement

Avoid provider-specific assumptions in the Director's core logic.

Future adapters such as Ollama or Claude must be possible without changes to the VideoScript or Video Producer contracts.

### 4.2 DeepSeek adapter

Implement an optional DeepSeek provider with:

- Environment-based API credentials
- Configurable model and endpoint
- Request timeout
- Bounded retries and backoff
- Rate-limit handling
- Structured output handling where supported
- Token accounting
- Cost estimation
- Configurable maximum API budget
- Clear handling of missing credentials

The application must function normally without `DEEPSEEK_API_KEY`.

A DeepSeek key is required only when explicitly selecting real DeepSeek generation.

Never log, persist or display the API key.

Never perform a real paid API call during normal tests.

### 4.3 Budget-aware operation

Support an automated generation workflow equivalent to:

`studio plan --topic "How does an HTTP server work?" --provider deepseek --max-api-usd 0.10`

Treat this command as illustrative; adapt it to the actual CLI.

The Director must:

- Support dry-run or mocked operation.
- Require explicit authorization for real paid requests.
- Enforce conservative cost controls.
- Limit tokens and repair attempts.
- Stop when the configured budget cannot safely accommodate another request.
- Report usage and cost estimates honestly.

Estimated provider charges are not guaranteed exact billing amounts.

### 4.4 No complex agent framework yet

Do not introduce LangGraph, an MCP orchestration layer or a complex autonomous agent loop simply to generate a script.

A small bounded workflow with explicit stages is sufficient.

Keep future multi-step research orchestration possible through clean interfaces.

---

## 5. Sourced script and animation storyboard generation

Use small, versioned prompt templates for:

1. Research synthesis
2. Claim audit
3. Educational narration
4. Animation storyboard
5. Structured JSON repair

Avoid one enormous unversioned prompt.

The Director should generate a storyboard containing, where supported by the actual VideoScript schema:

- Video title and topic
- Educational hook
- Clear explanation progression
- Scene-by-scene narration
- Scene purpose
- Valid animation components
- Valid component configuration
- Semantic animation actions
- Cue anchors and timing instructions
- Estimated narration durations
- Source and claim IDs
- A suitable conclusion or call to action

Do not force unsupported fields into VideoScript without a justified, versioned schema change.

### 5.1 Animation catalog enforcement

The Director must know which animation components the current Remotion implementation can actually render.

If the renderer supports HTTP request flows, node diagrams and text transitions, the Director may use those.

It must not invent a nonexistent animation component or arbitrary React implementation.

When the requested visual cannot be represented:

1. Use a genuinely suitable registered alternative, if one exists.
2. Otherwise return an explicit `unsupported_visual` or equivalent review-needed state.

The Director must not generate and execute arbitrary JavaScript, React, shell commands or animation code.

### 5.2 Visual and narration synchronization

Use supported cue anchors and scene timing contracts.

The storyboard should describe meaningful events tied to narration, such as:

- A client sends a request.
- The request reaches the server.
- The server processes it.
- A response returns to the client.

Actual audio durations must continue to be measured by the existing narration/timing pipeline rather than blindly trusting LLM timing estimates.

Preserve the Phase 04 timing-review mechanism.

Do not bypass `requiresTimingReview` or equivalent safety states.

---

## 6. Centralized Brand Design System

**This is a mandatory part of Phase 06.**

We want all Tech Explainer Studio videos to look and sound like they belong to the same recognizable channel.

Branding must be centralized rather than independently generated for every video.

### 6.1 Audit existing branding from Phases 02–05

Before implementing new branding infrastructure, inspect all existing branding-related code and configuration.

Include:

- Remotion scene backgrounds
- Hard-coded colors and gradients
- Font families
- Heading and body typography
- Diagram colors
- Text and label styling
- Caption appearance
- Caption highlighting
- Caption placement and safe zones
- Scene transitions
- Animation easing and motion defaults
- Kokoro default voice
- Narration speed and audio defaults
- Logo or watermark handling, if present
- Intro and outro styling, if implemented
- Existing theme files and constants
- Any relevant configurations introduced during Phase 05

Phase 05 may not contain visual branding. Do not invent branding there if none exists.

Identify duplicated styling values, conflicting defaults and scattered configurations.

Produce a concise audit showing:

- Existing setting
- Current definition/location
- Proposed centralized ownership
- Whether it is brand-specific or renderer-specific

### 6.2 Consolidate existing branding

Create a versioned `BrandProfile` or equivalent contract that serves as the single logical source of truth for channel-specific presentation.

It should cover:

**Colors**

- Background
- Foreground
- Primary
- Secondary
- Accent
- Muted text
- Semantic success
- Semantic warning
- Semantic error

**Typography**

- Approved font families
- Heading style
- Body text style
- Code/text label style
- Size scale
- Weight conventions

**Captions**

- Font family
- Text size
- Caption colors
- Highlight color
- Placement
- Safe-zone margins
- Line wrapping
- Emphasis behavior

**Motion**

- Default transitions
- Animation pacing conventions
- Easing defaults
- Entrance and exit behavior
- Motion intensity defaults

**Assets**

- Logo reference when an approved asset exists
- Watermark reference
- Intro/outro branding configuration if already implemented

**Narration**

- Default Kokoro voice
- Default speaking speed
- Other existing channel-level voice settings

Use actual implemented settings. Do not add imaginary asset paths or download new fonts without authorization.

### 6.3 Preserve existing appearance and sound

**Critical requirement: This is a consolidation, not a visual redesign.**

The initial default BrandProfile must preserve the existing Phase 02–04 visual style and audio behavior as closely as possible.

Do not:

- Invent a new palette.
- Change the selected narrator.
- Replace fonts without a reason.
- Redesign existing diagrams.
- Introduce a new logo.
- Replace existing animation behavior.
- Rebuild working components unnecessarily.

Any aesthetic redesign must be a separate, explicitly approved decision.

### 6.4 Refactor existing rendering components

Where practical and within the Phase 06 scope:

- Make existing Remotion components consume shared brand tokens.
- Make caption rendering consume centralized caption settings.
- Make default narration settings resolve from the approved brand configuration.
- Keep timing, rendering performance and other technical parameters outside the branding model.
- Avoid storing unrelated project, source or research metadata inside BrandProfile.

A single logical BrandProfile may be implemented across well-organized modules. Do not create an oversized configuration file if modular implementation is more maintainable.

### 6.5 Brand ownership rules

The Director controls the meaning and story.

The BrandProfile controls visual and audio identity.

The renderer interprets semantic intent through approved brand tokens.

Examples:

- Director says "highlight this concept" → use approved brand accent.
- Director says "request failed" → use semantic error styling.
- Director says "show code" → use brand-approved code typography.
- Director says "display caption emphasis" → use brand caption highlighting.

An LLM must not freely invent colors, CSS, fonts, narrator identities or logo assets in its VideoScript.

Allow only explicitly supported, validated overrides.

### 6.6 Backward compatibility

Existing VideoScript fixtures must continue to work.

When a script doesn't specify a brand, resolve the current approved default profile.

Preserve any implemented per-video narrator override.

Do not overwrite per-video voice selections merely because a channel default exists.

Persist the resolved brand ID, brand version and relevant configuration identity in the video/job manifest for reproducibility.

Preserve any existing narration model identity, voice and audio generation metadata.

### 6.7 Branding regression verification

Test that:

- Existing scenes use the shared tokens correctly.
- Existing visual appearance is preserved.
- Captions remain correctly positioned.
- Safe zones remain intact.
- Existing transitions continue working.
- Default narrator configuration remains unchanged.
- Explicit supported per-video narrator overrides still work.
- Different VideoScripts using the same BrandProfile resolve consistent brand settings.
- Invalid brand overrides are rejected.

Use representative rendered frames or visual regression comparisons where the environment allows. Do not claim pixel-identical output without actually verifying it.

Document how a future change to the default channel colors, font or narrator can be made centrally without modifying individual VideoScripts.

---

## 7. Unified validation and review pipeline

Manual and automated Director outputs must pass exactly the same production requirements.

Required checks:

- Strict JSON parsing
- Actual VideoScript Zod schema
- Schema version compatibility
- Registered animation types
- Valid animation props
- Valid cue anchors
- Scene timing requirements
- Approved source references
- Claim-review status requirements
- BrandProfile selection and overrides
- Existing production approval gates

A syntactically valid JSON file is not automatically technically correct or executable.

A valid executable storyboard is not automatically approved for publication.

Use explicit draft, review-needed and approval states consistent with existing application contracts.

Never allow the LLM to set or bypass final release approval.

If importing an external ChatGPT-generated script without a matching ResearchBundle, report missing provenance and keep its factual claims in an appropriate review-needed state.

Do not fabricate source IDs to satisfy validation.

---

## 8. Existing Video Producer compatibility

The Producer must remain independent of content origin.

These should all work through the same validated pipeline:

- Human-written VideoScript
- ChatGPT-generated VideoScript
- Codex-generated VideoScript
- DeepSeek-generated VideoScript
- Future local LLM-generated VideoScript

Preserve:

- Phase 01 VideoScript contracts
- Phase 02 Remotion renderer
- Phase 03 Kokoro narration
- Phase 04 audio/video synchronization and captions
- Phase 05 source and claim storage
- Existing manifest and approval semantics

Do not reimplement rendering, TTS, caption generation or FFmpeg muxing as part of the Director.

If a previously reported missing-audio issue remains unresolved, report it explicitly rather than marking a narrated end-to-end test as successful.

---

## 9. Out of scope

Do NOT implement:

- Autonomous broad web research
- Trending-topic discovery
- Automatic arbitrary-topic source crawling
- Social-media scraping
- An unrestricted AI agent loop
- AI-generated React or JavaScript execution
- A major animation library expansion
- A new Vue dashboard
- A full brand design editor
- An entirely new visual identity
- Autonomous factual approval
- Automatic YouTube/Instagram publishing
- Any paid API call without explicit authorization

Keep clean extension points for later phases without implementing those features prematurely.

---

## 10. Acceptance criteria

**AC-01 — Manual AI-assisted workflow**

An externally created VideoScript JSON can be imported, validated and persisted without any LLM API credentials.

**AC-02 — Exportable Director contract**

Export actual VideoScript schema, animation catalog, valid example and reusable external-AI prompt template.

**AC-03 — Phase 05 integration**

A validated multi-source ResearchBundle can be supplied to the Director with source and claim references preserved.

**AC-04 — Mock AI generation**

A topic plus approved research can produce a valid VideoScript draft using a mocked LLM provider.

**AC-05 — Optional DeepSeek**

The application works without a DeepSeek key. A separately authorized real DeepSeek smoke test is possible with a capped budget.

**AC-06 — Strict executable storyboard**

Unknown animations, invalid props, unsupported cue anchors and malformed JSON produce actionable errors or review states.

**AC-07 — Claim integrity**

Missing sources, unsupported claims and contradictory research cannot silently become approved factual assertions.

**AC-08 — Centralized branding**

Existing visual, caption, transition and narrator defaults are consolidated into a versioned BrandProfile and consumed by the relevant production components.

**AC-09 — No unapproved redesign**

The default BrandProfile preserves existing production appearance and sound unless an explicitly approved change is necessary.

**AC-10 — Branding persistence**

The applied brand profile identity/version is recorded in generated manifests. Per-video voice overrides continue to behave correctly.

**AC-11 — Unified production**

Manual and automated Director outputs use the same validation, review and rendering contracts.

**AC-12 — Automated test coverage**

Tests cover:
- Valid manual import
- Invalid JSON
- Schema incompatibility
- Unknown animation components
- Invalid animation props
- Invalid cue anchors
- Missing source references
- Contradictory or insufficient claims
- Prompt injection
- Missing LLM credentials
- Provider HTTP 429
- Provider timeout
- Budget exhaustion
- Bounded JSON repair
- Invalid brand configuration
- Brand consistency
- Existing VideoScript compatibility
- Narrator default and override resolution

**AC-13 — End-to-end verification**

Demonstrate the manual workflow with an existing HTTP-server example and actual Video Producer.

Where the environment permits rendering, verify the produced MP4 has both audio and video streams, and preserve existing timing-review and publishing gates.

**AC-14 — No unauthorized paid calls**

Normal tests use mocks. A live API smoke test is optional and must not be performed without my explicit authorization.

---

## 11. Verification

Execute relevant commands based on the actual repository:

- TypeScript typecheck
- Lint
- Unit tests
- Integration tests
- Director prompt evaluations
- Zod/schema validation
- Mock provider tests
- Manual JSON import tests
- Brand profile validation tests
- Regression tests for earlier phases
- End-to-end production test where feasible

Use actual output to determine pass/fail.

Do not claim a test passed if it was skipped or never executed.

For any generated MP4, use actual media inspection such as ffprobe to verify video and audio streams, duration and compatibility.

Check representative visual frames where practical.

Verify that existing video scenes, caption layouts and voice selections remain consistent.

Ensure API credentials and potentially sensitive research material do not leak into logs or generated artifacts.

---

## 12. Implementation guidelines

Inspect current modules before creating new ones.

Likely areas include:

- `src/llm/`
- `src/director/`
- `src/branding/` or existing renderer theme modules
- `src/sources/`
- `src/claims/`
- `prompts/`
- `tests/director/`
- `tests/branding/`
- `examples/`
- Existing CLI, VideoScript and rendering modules

These paths are suggestions, not mandatory architecture.

Prefer the smallest coherent implementation that satisfies the acceptance criteria.

Keep modules focused, interfaces explicit and dependencies minimal.

Use strict TypeScript.

Validate all untrusted structured input with Zod or equivalent existing trusted boundaries.

Keep the renderer deterministic.

Do not create speculative abstraction layers that have no immediate consumer.

---

## 13. Execution rules

1. Inspect the current repository and Git diff first.
2. Implement in small, testable iterations.
3. Reuse actual Phase 01–05 contracts.
4. Preserve working production behavior.
5. Do not copy proprietary code.
6. Do not execute LLM-generated code.
7. Do not run paid DeepSeek calls without explicit authorization.
8. Do not perform live OAuth flows.
9. Do not upload or publish media.
10. Do not commit or push without explicit authorization.
11. Do not globally install packages without authorization.
12. Do not download large models or assets without authorization.
13. Mock remote services in ordinary tests.
14. Do not weaken source, claim, input or credential security.
15. Do not begin Phase 07 or later work.

If a materially conflicting architecture change, irreversible action, paid dependency, confidential-code import or safety downgrade becomes necessary, stop and explain the issue before proceeding.

---

## 14. After the phase

### 14.1 Update PROJECT_STATUS.md

Record:

- Actual Phase 06 completion status
- Components implemented
- Files changed
- Commands executed
- Actual test results
- Generated artifacts
- Manual workflow demonstration
- Brand consolidation results
- Known limitations
- Remaining risks
- Blockers
- Recommended next phase

### 14.2 Update architecture documentation

Update the main `ARCHITECTURE.md` only where actual implemented architecture changed.

Clearly distinguish planned functionality from completed functionality.

Keep `docs/02-architecture.md` consistent with implemented technical behavior.

Update affected contract, component and reference documents only when their real behavior changes.

Record significant architecture decisions in `docs/15-adrs.md`.

Update `AGENTS.md` or `CLAUDE.md` only if a genuinely new durable project-wide coding rule is necessary.

Do not accumulate phase logs in agent instructions.

### 14.3 Provide a completion report

Summarize:

1. Files created and modified.
2. Manual ChatGPT-to-VideoScript workflow.
3. Exported Director contract locations.
4. DeepSeek integration status.
5. Existing styling consolidated into BrandProfile.
6. Where channel colors, fonts, captions and narrator are now configured.
7. Any branding values not yet centralized and why.
8. Actual verification commands and results.
9. Example CLI commands for import, validation and rendering.
10. Known issues and next human review actions.

**STOP after Phase 06. Do not implement Phase 07.**
