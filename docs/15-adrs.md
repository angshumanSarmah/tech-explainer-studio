# 15 — Architecture decision records

Each ADR records a **proposed settled decision** as of 2026-11-06. Revise by adding a new ADR, not silently changing history.

## ADR-001 — New independent repository, not a fork

**Status:** Accepted for implementation planning.  
**Context:** `darkzOGx/youtube-automation-agent` has scheduling, approval, analytics, and publishing, but its default video path is a slideshow/provider workflow; user's `phi-video-gen` screenshots show a more relevant typed script + render workflow.  
**Decision:** New `tech-explainer-studio` repo. Extract only concepts, and authorized code if licensed.  
**Consequences:** More P0 setup; avoids dragging in general channel-operation features and keeps ownership/compliance clear.  
**Revisit when:** audited upstream modules offer clear net benefit and rights are confirmed.

## ADR-002 — Three stages, not twelve independent agents

**Status:** Accepted.  
**Decision:** Content Director (LLM-assisted), Video Producer (deterministic services), Publisher (explicit APIs).  
**Consequences:** Fewer failure boundaries, simpler observability; research/technical review can still be independent checks without separate autonomous processes.

## ADR-003 — Versioned VideoScript as system boundary

**Status:** Accepted.  
**Decision:** Strict Zod-validated v1 JSON; no arbitrary code from LLM.  
**Consequences:** Visual breadth limited to registered components; improves repeatability, security and cacheability.

## ADR-004 — Remotion-first animations

**Status:** Accepted for P0.  
**Alternatives:** Manim, Blender, GSAP/Canvas, generic AI video.  
**Decision:** TypeScript/React/Remotion + SVG for moving mechanism diagrams; Canvas/Three.js optional.  
**Reason:** Matches developer's stack, declarative frames, testable props, reusable components.  
**Trade-off:** Premium custom graphics take engineering time. Check Remotion current organization/business license before commercialization.

## ADR-005 — DeepSeek primary; local provider optional

**Status:** Accepted.  
**Decision:** Provider abstraction; DeepSeek for content drafting, Ollama for offline/fallback after human opt-in.  
**Trade-off:** DeepSeek API is not free; provider differences require output/eval tests. Never send private/proprietary content without authorization.

## ADR-006 — Kokoro local narration

**Status:** Accepted for prototyping.  
**Decision:** Local Kokoro with reproducible voice/runtime and pronunciation overrides.  
**Trade-off:** Technical acronym quality and multilingual support may require review or future provider changes; inspect runtime/dependency licenses.

## ADR-007 — SQLite + local files for MVP

**Status:** Accepted.  
**Reason:** One-machine workflow, crash recovery, easy backup, minimal operating costs.  
**Revisit when:** several render machines or simultaneous users require distributed coordination.

## ADR-008 — Approval-bound and private-first publishing

**Status:** Accepted.  
**Decision:** Multi-axis human review bound to video hash; upload explicit `private`; no autonomous public posts.  
**Reason:** Technical accuracy, rights, and platform safety. YouTube's November 2026 API behavior no longer guarantees private for omitted privacy field.

## ADR-009 — Learn from style, not content replication

**Status:** Accepted.  
**Decision:** Visual approach inspired by moving systems/diagram storytelling from screenshots; no copying videos, scripts, colors, logos, sound or content ideas.  
**Content:** Build Your Own X, system design, technical documentation and original prototypes.

## ADR-010 — No dashboard until a working end-to-end CLI

**Status:** Accepted.  
**Decision:** First prove schema → local TTS + animation → playable MP4 → approval. UI is P2.  
**Consequence:** Less early demo polish but faster validation of core value.

## ADR-011 — Local Kokoro ONNX worker and seeded narration

**Status:** Implemented in Phase 03, 2026-11-10; refines ADR-006 within the approved local-audio boundary.

**Decision:** Keep one TypeScript package and use `kokoro-onnx==0.6.1` in a local Python 3.12 environment, with a hash-pinned dependency lock and explicit local model/voice hashes. A fixed packaged Python worker takes bounded JSON stdin; no source text enters a shell or command arguments. CPU-only inference has explicit wall/CPU/thread/file/output bounds. TypeScript validates PCM and ffprobe duration before accepting per-scene WAV/metadata. The explicit mock emits labeled tones, never replacement speech.

**Reproducibility:** An unseeded rerun changed duration despite identical recorded settings. Record a seed in versioned voice settings and seed ONNX Runtime/NumPy before constructing the inference session. Fresh source and compiled runs are compared locally; no cross-platform byte identity is promised.

**Trade-offs:** Python plus local weights are optional setup requirements for real speech; POSIX resource limits and pinned macOS arm64/Python 3.12 dependencies need verification elsewhere. The selected int8 graph rejects fractional rates instead of silently rounding. Health verifies files/imports/voice, while a real smoke validates graph compatibility. Hard RAM/network isolation, persistent recovery, word alignment and narrated assembly are outside this slice. No remote/paid provider or model download is added to runtime/tests.

## ADR-012 — Measured scene timelines and review-only caption fallback

**Status:** Implemented in Phase 04, 2026-11-10, within the requested producer boundary.

**Decision:** Keep 24 kHz PCM narration as the saved input to render-only execution. Revalidate its WAV/text identity and ffprobe duration. At 30 fps, scene frames are `ceil(max(samples / 800, authored_min_seconds * 30))`; starts are cumulative integers, and exact sample padding contains only fractional-frame slack and authored minimum holds. Reject speech exceeding the authored maximum rather than truncating or retiming it. Preserve the original script and silent renderer.

**Alignment:** Consume explicit reviewed word/sample timings bound to the exact WAV and original text hashes. Phrase cues require these timings and unique anchors. No new aligner/model is installed. A CLI opt-in scene speech-span fallback can produce an unapproved preview by displaying the complete scene narration across measured activity; it invents no word positions and blocks strict timing checks. Caption overrides also require review. Both SRT and the browser-safe overlay use the same global frame intervals; source narration/visual text remains literal data.

**QC and evidence:** Use the existing local Remotion/bundled FFmpeg tools, a reserved caption band with collision/bounds checks, and independent final stream/frame/duration inspection plus AAC decoding and per-scene signal checks. Tests deliberately mute the assembled AAC and reject it by scene. Output is finalized only after checks, and manifests record artifact/model/tool/source-code hashes, starts, holds, cue frames, missing source provenance and human review limitations. Constant DC and clipping are checked/reported separately from audible activity; no automatic cleanup conceals the user's outstanding voice-quality feedback.

**Trade-offs:** Full-scene fallback captions are coarse and need listening/phone review; progress cues retain their authored scene-relative meaning even during holds. No claim of forced alignment, perfect intelligibility, automatic approval or cross-platform byte identity is made. `--strict` is a media check, not a release/publication gate. Source collection, durable jobs/cache, approvals and publishing remain later phases. No new paid/remote service, model download or major architecture change is introduced.

## ADR-013 — Bounded public snapshots and explicit JSON evidence review

**Status:** Implemented in Phase 05, 2026-11-10; verified with mock fixtures only by user choice. No live fetch or Director invocation.

**Decision:** Use Node's native HTTP(S) transport inside the single package. Validate every resolved address and redirect hop, pin the selected public IP in lookup, check the connected peer, keep default TLS validation, disable connection reuse and omit auth/cookies/environment proxies. Follow only explicit host approvals, with no HTTPS downgrade. Limit body/header bytes, redirects and total DNS/body time; reject compression and non-UTF-8/nontext bodies. Conservatively reject IP literals, local/private-service names, query strings and custom ports instead of implementing a general browser/crawler. Public confirmation is a human assertion, not an authentication mechanism.

**Minimization:** Keep canonical/requested URL, timestamp, exact body hash, public address, redirects, available URL commit/hashed ETag/Last-Modified, unverified license mentions and at most 1200 characters of plain text. Raw documents are not persisted. Source IDs bind canonical URL, body hash and excerpt, permitting separately selected excerpts from one version. Known unsafe text quarantines the whole document with no excerpt. A clean result is still untrusted; heuristic pattern matching cannot establish complete safety. A license mention never grants code/media reuse, including linked Build Your Own X tutorials.

**Review boundary:** Strict drafts cannot set approvals. Missing references remain explicit; supported claims require literal quotes from all cited clean snapshots and a manual reviewer decision. Contradicted/insufficient/unreviewed claims block fact approval. Illustrative claims need a reviewer and retain that label. A separate manual approval binds the ledger revision, sources, claims and reviewer metadata. Context export requires current approval and emits only inert reference data with no command permissions. Every CLI write creates a new JSON file; previous files remain intact. Rendering is independent and VideoScript v1 is unchanged.

**Trade-offs:** Conservative rejection can exclude legitimate documentation and code examples. Excerpts may omit context, so human scope/version review is essential. DNS system work may outlive the timeout but cannot start a later HTTP request. Hashes detect ordinary changes, not malicious local forgery; JSON reviewer identities are unauthenticated local assertions. No full rights ledger, script approval, database, provider adapter, crawler, security sandbox or release approval is claimed. Future Director integration must preserve the untrusted-data boundary and separate Phase 08 gates; it is not started here.


**Phase 05 extension — ResearchBundle (same phase):** Add strict multi-source bundle input/output and a separate editorial brief, reusing the existing fetcher rather than replacing it. Sequential ingestion uses one outer deadline/abort signal, streaming aggregate byte accounting and count/request budgets in addition to unchanged per-source controls. Deduplicate canonical input + selections + effective policy; preserve all input-to-source mappings and charge actual consumed bytes even when redirects converge. Pasted notes hash their submitted UTF-8 bytes, have explicit manual provenance/null URLs and receive the same untrusted/quarantine handling. Selections are bounded literal text, not executable selectors. Raw pasted text is not copied into persisted bundles.

**Compatibility:** Keep original 1.0.0 snapshots/review digests. New typed source metadata and research-aware ledgers/context are 1.1.0, while the first bundle contract is 1.0.0. Bundle hash and instructions are bound to ledger approval; the future Director can consume a saved reviewed bundle without autonomous research. Human contradiction/insufficiency findings remain blocking, and no model truth assertion is introduced. All live fetching remains unverified by user choice. No new dependency, package, provider, dashboard, repository traversal or later-phase service is added.

## ADR-014 — Unified Director drafts and versioned brand consolidation

**Status:** Implemented in Phase 06,2026-11-10; manual import/production and mock provider verified. Live DeepSeek remains unverified and requires separate paid authorization.

**Decision:** Keep one TypeScript package and the existing Producer. External AI JSON is a first-class input: export schemas directly with Zod's JSON Schema conversion, the real props/cue catalog, executable restrictions, a valid example and small versioned prompt fragments. Imports and mock/DeepSeek generations share the same parser, producer preflight, exact reviewed-source/claim bindings, brand resolution and unapproved draft persistence. Runtime-only refinements are stated separately and covered by producer tests; exported JSON Schema is not a substitute for application validation. No generated code is executed.

**Evidence/review:** Reuse ResearchBundle/ClaimLedger without a parallel research model. Automated planning and grounded export require a current human-approved ledger bound to the exact bundle/snapshots/instructions. Send only bounded reviewed quotes and provenance as user-role inert data, with a fixed system prompt and no tools. Preserve claim text/status/source IDs and source versions; generation cannot overwrite reviews or grant rights. Unbound manual imports remain explicit missing-provenance preview drafts. Local narration/storyboard review binds hashes but never grants release approval. Narration can still be inaccurate despite valid citations; human semantic/scope review is essential.

**Versioning:** VideoScript 1.0.0 is retained. A small 1.1.0 extension permits an approved brand reference and null URL only for `pasted_text` sources, so Phase 05 notes need no fabricated URL. Existing scene/cue contracts and measured Producer execution are unchanged. The general `VideoScript` type covers both; `VideoScriptV1` remains the original legacy shape.

**Provider:** A small `LLMProvider` interface plus local response mock and optional DeepSeek Chat Completions adapter. Explicit paid opt-in, environment-only key, public pinned HTTPS, disabled tool/thinking modes, byte/token/time/retry bounds and at most one JSON/schema repair. Source/unsafe-output failures stop directly. Every attempt reserves conservative estimated token cost; ambiguous failures retain full reserves. Model usage and configured rate policy are recorded; pricing/tokenizer assumptions cannot guarantee external billing. No broad research, framework, OAuth or publishing path is added.

**Brand:** Centralize the current palette, local Inter scale/weights, caption band/safe zones, entrance motion and `af_heart` settings in a validated frozen profile. Existing explicit narration settings take priority. Keep model assets/resource limits, frame/sample arithmetic, layout coordinates and packet causality in existing modules. Manifests bind profile ID/version/configuration hash alongside actual audio identity. No new font, logo, palette, voice filtering or animation redesign. Document 26 records the audit and remaining renderer concerns.

**Trade-offs:** One approved profile and HTTP-specific renderer; arbitrary topic visualization, new provider adapters, word alignment, durable jobs and authenticated release approval remain later work. Screening is heuristic, local reviewer names are assertions, and no live provider performance is claimed. Representative frame/WAV comparisons establish only what was actually compared, not cross-platform identity.


## ADR-015 — Fenced local jobs and measured scene caches

**Status:** Implemented in Phase 07, 2026-11-10. Approval/publishing stay outside this boundary.

**Decision:** Use built-in Node 24 SQLite (first actual database schema), typed Zod repository reads and local content-addressed files. Keep the existing Producer and add a narrow per-scene Remotion frame-range option plus cached-clip concat adapter. No framework, queue service, paid dependency or separate renderer is introduced. Saved legacy JSON imports with the existing default brand; authored revisions remain distinct from database revision numbers.

**Durability/concurrency:** Write transactions bind step input/output hashes, bounded attempts and cache mappings. One renewable fenced job lease plus one local producer lease prevents conflicting workers; stale workers cannot commit cache/output state. Immutable byte blobs and staged copied exports allow hash-verified recovery after process interruption, including the file/SQLite commit window. Orphan blobs/attempt files may remain after crashes; automatic garbage collection is deferred. Imports are idempotent by request key, revisions reject stale optimistic versions, and prior export trees are preserved.

**Invalidation:** Separate visual brand from voice configuration and waveform bytes from measured pixels. Audio keys include exact text, local settings/model or saved WAV identity and audio implementation/tools. Visual keys include resolved props/cues, actual font, dimensions, captions and full measured composition context. Current header/global-progress pixels require conservative invalidation when starts/total duration change; same measured pixels can survive a voice change. Assembly binds the complete revision/provenance and ordered clip/audio hashes. Source/claim/bundle/review changes impose a persistent manual evidence gate without research or paid regeneration. Initial unbound imports remain unapproved previews.

**Provenance/cost:** Persist bounded origin, draft/review hashes, bundle identity/date/hash, ledger revision/hash/fact approval and source/claim review references separately from brand/assets and audio identity. Import model/token/cost/reserve/outcome/pricing receipts idempotently; do not store raw prompts/briefs or secrets. Identical exported provider receipts cannot prove distinct billing events; no live provider call or billing accuracy is claimed. All render records/manifests remain explicitly unapproved and cannot start Publisher.

**Limits:** Single local pipeline, fixed existing brand registry/1080×1920@30fps, no authenticated reviewers, automatic garbage collection, distributed workers or new approval service. Hashes catch accidental mutation, not an attacker rewriting the database and all hashes. Native SQLite must be available in the pinned Node runtime. Human caption/voice/factual/rights review remains separate.
