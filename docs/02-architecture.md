# 02 — Architecture and Mermaid diagrams

## 2.1 System context

```mermaid
flowchart LR
    Creator[Creator / reviewer]
    Sources[Public GitHub + specifications + technical docs]
    DeepSeek[DeepSeek API]
    LocalAI[Optional Ollama]
    Youtube[YouTube Data API]
    Instagram[Instagram native upload]
    Studio[Tech Explainer Studio<br/>Local CLI / later UI]
    Creator -->|Topic, source, review, approve| Studio
    Sources -->|Approved, cited source excerpts| Studio
    Studio -->|Scoped research and drafting| DeepSeek
    Studio -.->|Offline alternative| LocalAI
    Studio -->|Approved video only| Youtube
    Studio -->|Exported media + metadata| Instagram
```

**Trust boundary:** untrusted GitHub/web content is *reference data*, not instructions. Only user-confirmed sourced excerpts are sent to external AI providers; never send employer IP or secrets.

## 2.2 High-level containers

```mermaid
flowchart TB
    CLI[CLI: plan / render / review / publish]
    UI[Optional future local web studio]
    API[App service + workflow coordinator]
    DIR[1. Content Director<br/>LLM + evidence]
    PROD[2. Video Producer<br/>deterministic]
    PUB[3. Publisher<br/>API adapter]
    DB[(SQLite)]
    ART[(Content-addressed files)]
    LLM[DeepSeek / Ollama adapters]
    REG[Scene registry / Zod validators]
    RENDER[Remotion + SVG]
    UIREC[Playwright optional]
    AUDIO[Kokoro local]
    MUX[FFmpeg / FFprobe]
    YT[YouTube Data API]

    CLI --> API
    UI -.-> API
    API --> DIR
    API --> PROD
    API --> PUB
    API <--> DB
    API <--> ART
    DIR --> LLM
    DIR --> REG
    PROD --> REG
    PROD --> RENDER
    PROD -.-> UIREC
    PROD --> AUDIO
    PROD --> MUX
    PROD <--> ART
    PUB --> YT
    PUB <--> DB
```

Three **roles**, not three autonomous always-on agents. The Director uses AI; Producer and Publisher are code services.

## 2.3 Pipeline and human gates

```mermaid
flowchart LR
    T[Topic or source URL] --> F[Fetch + provenance]
    F --> R[Research claims]
    R --> S[Script + scenes]
    S --> V{Schema + factual review}
    V -->|Reject| S
    V -->|Approve facts| A[Voice + animation render]
    A --> Q{Media and technical QA}
    Q -->|Repair scene| A
    Q -->|Approved artifact hash| P[Publisher]
    P -->|Explicit choice| Y[Private YouTube upload]
    P -->|Manual export| I[Instagram bundle]
    Y --> M[Analytics later]
```

No transition from draft generation to a public video bypasses human quality approval. Gate checks are in application code, not merely prompt text.

## 2.4 Producer component flow

```mermaid
flowchart TB
    VS[Validated VideoScript v1] --> SPLIT[Scene scheduler]
    SPLIT --> VA[Audio task / Kokoro]
    SPLIT --> VV[Visual task / Remotion]
    VA --> AD[Measured audio duration]
    AD --> TL[Timeline resolver]
    VV --> TL
    TL --> CAP[Caption alignment]
    TL --> ASM[FFmpeg assembly]
    CAP --> ASM
    ASM --> PROBE[ffprobe + frame / audio QC]
    PROBE --> OUT[MP4 + captions + manifest + hashes]
```

For **recorded UI scenes**, Playwright can run in a separate worker. Do not carry over the old constraint that a customer-facing video must show only live UI. Technical explainers should allow `tech-animation` in any scene position.

## 2.5 Persistent state machine

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> researching
    researching --> script_draft
    script_draft --> facts_approved: human approves sources and script
    script_draft --> needs_revision: unsupported claim
    needs_revision --> researching
    facts_approved --> rendering
    rendering --> render_failed
    render_failed --> rendering: retry affected step
    rendering --> review_ready
    review_ready --> changes_requested
    changes_requested --> rendering: affected scenes only
    review_ready --> approved: human approves exact hash
    approved --> publishing: explicit upload request
    publishing --> published_private
    publishing --> publish_failed
    publish_failed --> publishing: idempotent retry
    published_private --> [*]
```

Public scheduling is **a separate explicit action** and not implied by a successful upload.

## 2.6 Proposed module organization

**Current implementation (Phase 01):** one root TypeScript package, with `src/domain/` for Zod schemas and typed validation, `src/cli/` for local file validation/help, and `tests/` using Node's built-in test runner. `parseVideoScript(unknown)` and `parseVideoScriptJson(string)` return schema-inferred `VideoScriptV1` or throw `ScriptValidationError`. The component registry currently registers only the `BrowserRequestFlow` props schema; it has no render function. No API server, rendering, persistence or external integration is implemented. The following tree remains an eventual proposal, not the starting layout.

```text
tech-explainer-studio/
├── apps/
│   ├── cli/                     # P0, command parsing / progress
│   └── studio/                  # P2, local review UI (not needed at launch)
├── packages/
│   ├── core/                    # contracts, validation, domain errors
│   ├── director/                # source adapters, prompts, LLM adapters
│   ├── producer/                # scene registry, remotion, audio, assembly
│   ├── publisher/               # YouTube + export bundle
│   └── persistence/             # SQLite and file store
├── docs/
├── examples/
└── output/                      # ignored, local-only
```

**Implementation caution:** This is an eventual directory target; begin as one TypeScript package if a monorepo makes the P0 vertical slice slower.

## 2.7 Deployment model

MVP runs as **a local CLI** on macOS (Apple Silicon). FFmpeg/FFprobe and a supported TTS runtime execute as subprocesses; Remotion renders via its supported Node/Chromium environment. SQLite and artifact store remain local. Deploying a cloud instance requires separate architecture and security review for OAuth tokens, remote browser automation, file storage and API abuse.

## 2.8 Key boundary interfaces

- `LLMProvider.generateObject<T>(messages, schema, budget) -> validated result + usage`
- `SourceProvider.fetch(url, limits) -> SourceSnapshot`
- `ContentDirector.plan(input, sources) -> VideoScriptDraft`
- `SceneRenderer.render(scene, resolvedTimeline) -> RenderArtifact`
- `VoiceProvider.synthesize(text, voice, lexicon) -> AudioArtifact`
- `Publisher.publishApproved(releaseId, target) -> PublishResult`
- `ArtifactStore.put(bytes, metadata) -> sha256 address`

Every interface is **side-effect-explicit**, testable, and fails closed if invalid.
