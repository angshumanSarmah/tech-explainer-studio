# 05 — Agent 2: Video Producer and animation engine

## Mission

Turn an approved `VideoScript` revision into synchronized narration, animated scenes, captions, metadata and a validated MP4. **No LLM calls are necessary** after a VideoScript is locked. The producer is a deterministic service within pinned render conditions, not a creative agent that improvises unknown visuals.

## Scene rendering architecture

**Phase 02 implemented slice:** `render --script` validates a local script, resolves saved preferred durations into integer frames, renders one portrait Remotion composition, saves PNG references, and probes the silent MP4. It supports only title cards and registered `BrowserRequestFlow`; this render path has no audio. Caption alignment, per-scene media cache and release approval remain planned. This is explicitly a **silent preview using estimates**, not an exception to measured-audio timing for narrated output. Other arrows/components below remain planned except the separate Phase 03 narration slice.

```mermaid
flowchart LR
    Script[VideoScript] --> Validate[Profile + component schema validation]
    Validate --> Dispatch{Visual type}
    Dispatch -->|tech-animation| Remotion[Remotion + SVG/Canvas]
    Dispatch -->|code-trace| Code[Code trace renderer]
    Dispatch -->|title-card| Card[Brand title-card]
    Dispatch -.->|optional UI demo| Playwright[Playwright recorder]
    Remotion --> Clip[Scene clip]
    Code --> Clip
    Card --> Clip
    Playwright --> Clip
    Script --> Voice[Kokoro audio]
    Voice --> Timing[Speech timing / alignment]
    Timing --> Timeline[Frame-accurate sequence]
    Clip --> Timeline
    Timeline --> FFmpeg[FFmpeg assembly]
    FFmpeg --> QC[ffprobe + media QC]
```

**Phase 03 implemented slice:** separate `audio` commands generate per-scene local Kokoro WAVs or explicitly labeled mock tones. Duration comes from ffprobe and is checked against PCM samples. Phase 04 now consumes these saved artifacts through a separate narrated render path; the original silent command is retained.

**Phase 04 implemented slice:** `render --narration` validates saved WAV/text identity and measures each scene again, resolves actual samples plus authored minimum holds, renders registered visuals/captions, muxes H.264/AAC and independently checks final video/audio. Reviewed word timings support phrase cues and grouped captions; an explicit full-scene speech-span fallback is preview-only and flagged for timing review. No automatic aligner, LLM, package/model download, caching or publisher runs. See document 03 for exact rounding/alignment contracts and the root README for executable commands.

## Visual component catalog: MVP

| Component | Inputs | Suitable topics | Safety/invariants |
|---|---|---|---|
| `BrowserRequestFlow` | browser, server, method, path, status, cue sequence | HTTP, API, proxies | Request before response; no misleading protocol labels |
| `NetworkPacket` | packet label, route, send/receive cues | TCP, DNS, queues | Clear transport/protocol distinction |
| `EventQueue` | bounded events, producer/consumer, delay, capacity | queues, Kafka concepts | Queuing policy/ordering explicitly labeled |
| `CodeTrace` | reviewed code lines, execution states, highlights | parsers, compilers, Git internals | Code runs in an isolated test harness |
| `BTreeLookup` | small tree fixture, lookup key, step path | DB indexing | Valid node structure and reproducible path |
| `HashObjectGraph` | nodes, parent edges, object type | Git | Hash labels marked illustrative unless computed |
| `TimelineCompare` | stages / durations / categories | latency, cache vs no cache | Numerical data labeled measured or illustrative |
| `DecisionTradeoff` | two designs, pros and limitations | architecture choices | Claims supported; no false universality |

Future: thread scheduler, CPU pipeline, cache hierarchy, distributed leader election, packets through NAT/load balancers, AST/compiler transforms, memory allocator, deterministic 3D hardware scenes.

## Camera and coordinates

- Composition defaults `1080 × 1920 @ 30fps` (9:16). Composition metadata is centralized, not hardcoded inside each component.
- Use a normalized virtual design area; separate **content-safe rectangle** from platform UI overlay exclusion regions.
- A scene may define `focusTarget`, `cameraPan`, `zoom` and transition cues, but only from an approved finite enum/typed value range.
- Prefer SVG/React for basic shapes and animation; Canvas for thousands of moving particles; Three.js only when 3D meaningfully improves comprehension.
- All animated positions must be seeded/deterministic (no `Math.random()` in render components without a fixed seed).
- Add `prefersReducedMotion` only to future interactive player; video itself should avoid excessive strobing/flash.

## Real narration-first timing

1. Normalize text (`HTTP` vs `H-T-T-P`, names), record a pronunciation lexicon.
2. Synthesize **each scene** to WAV using local Kokoro with explicit voice/rate settings.
3. Probe actual audio length (`ffprobe`) and detect silence/noise.
4. Align token/word spans using forced alignment or local transcription as a validation step; do not assume every word lasts equally long.
5. Derive an exact integer-frame timeline. Add holds only within approved scene duration constraints.
6. Bind visual cues to text anchors/normalized progress: e.g. `request leaves client` near narration `sends a request`.
7. Render scene; mux audio, scene clip and captions; mix effects/music only from approved licensed assets.
8. Re-probe final output for dimensions, duration, audio streams, codec and clipping.

### Example cue semantics

```json
{
  "cue_id": "request_in_flight",
  "trigger": { "kind": "phrase", "text": "sends an HTTP request" },
  "action": { "kind": "move", "target": "http-request" }
}
```

A missing/ambiguous anchor is an explicit validation error or requires reviewer repair; never silently fire all cues at frame zero.

This uses document 20's canonical data contract. Phase 04 resolves phrase triggers only from reviewed word timings bound to the exact audio/text. The silent renderer still accepts the fixture's progress windows and rejects phrase triggers. The old conceptual `animate_packet`/`minimum_hold_ms` fields are not part of VideoScript v1.

## Output artifacts

```text
output/<job_id>/
├── source-snapshots/               # hashes, metadata, minimal excerpts
├── revisions/<n>/videoscript.json
├── scene-assets/<scene-id>/<hash>/
│   ├── narration.wav
│   ├── scene.mp4
│   └── timing.json
├── final/video-vertical.mp4
├── final/captions.srt
├── final/thumbnail.png
├── final/render-manifest.json
├── review/report.json
└── publication/                     # only after explicit approval
```

Phase 03 currently uses `<output>/<scene-id>/<scene-id>.wav` with sibling `narration.json` and a top-level `narration-manifest.json`. A failed scene retains `narration-error.json` and any partial WAV for diagnosis. Successful scenes are preserved and existing directories are never overwritten. This is not yet a content-addressed cache or resume implementation.

## Render cache and partial replay

Phase 04 preview output currently contains `video.mp4`, `captions.srt`, `timeline.json`, `videoscript.json`, copied per-scene narration/metadata, padded `narration.wav`, `decoded-audio.wav`, captioned frame evidence plus a silent intermediate in `visuals/`, `ffprobe.json`, `qc-report.json` and `render-manifest.json`. The video is finalized only after stream/frame checks and per-scene decoded AAC checks. Error reports identify affected scenes; partial output is retained for diagnosis, and existing output directories are protected. The cache/resume rules below remain planned.

QC checks one 1080×1920, 30 fps H.264/yuv420p stream and one mono 24 kHz AAC stream, exact decoded video frames and audio/video/format duration within one frame plus one AAC packet (0.076 seconds). Every source/decoded scene must have AC audio activity above -45 dBFS and no near-full-scale samples. Structural WAV parsing permits final silence only long enough to identify the failing scene; it never passes QC. DC bias is reported for voice-quality review. Format/activity checks do not establish intelligibility, perfect captions or rights. Mock/fallback outputs and pending human checks never confer release approval.

- Scene render key includes normalized scene JSON, narration hash, theme version, code version, fps, resolution, fonts/assets, tool versions.
- Render file is written to temp path then atomically moved into cache after media QC.
- A scene edit dirties only that scene **unless** it changes global layout/theme, narrative timing dependencies or transitions.
- A narration edit dirties that scene's audio, alignment and video, plus any affected cross-scene timing/assembly.
- Publishing is never rerun as part of render retry.

## Error strategy

| Failure | Response |
|---|---|
| Missing component / unsupported props | Fail validation before expensive rendering |
| TTS pronunciation fails | Offer lexicon/voice edit; rerender audio only |
| Remotion render fails | Save logs/scene ID; retry same scene bounded times |
| Nonexistent visual source | Do not replace with deceptive image; request review |
| Captions out of range | Block release |
| Render too short / blank / silent when audio is required | Block release; the Phase 02 silent preview is explicitly marked unapproved and has no audio by design |
| Invalid audio/video codecs | Retry assembly under alternate safe encoder preset |

## Rendering contract

```ts
interface SceneRenderer<TValidatedProps> {
  id: string;
  version: string;
  validate(props: unknown): TValidatedProps;
  render(input: {
    sceneId: string;
    props: TValidatedProps;
    durationFrames: number;
    fps: number;
    dimensions: { width: number; height: number };
    themeId: string;
    outputPath: string;
  }): Promise<{ outputPath: string; sha256: string; durationFrames: number }>;
}
```

Rendering code should not use network fetching, privileged commands or arbitrary expression execution inside props. Assets must be pre-approved and resolved before invoking the renderer.

## Implemented silent renderer (Phase 02)

- The source fixture remains byte-identical. Its preferred durations resolve to 150, 300, 300, 270, 360 and 270 frames (55 seconds total). Scene boundaries are contiguous, rounded once per saved scene estimate. The manifest records `timingMode: silent-preview-estimates`, `measuredAudio: false`, and `approvedForRelease: false`.
- Static domain and render registries are separate. The latter binds `BrowserRequestFlow` to original React/SVG code; no component name becomes a dynamic import/evaluated expression. All six states are implemented; the unchanged movie uses request/parse/route/response, while separate validated gallery inputs exercise idle/overview.
- The renderer supports technology-explainer at 1080×1920, 30 fps. It rejects unsupported cues rather than guessing: only progress/move cues targeting the request in the request phase or response in the response phase are supported. Overview uses an authored request→processing→response schedule with no custom cues. Phrase triggers await actual narration alignment. Captions are unsupported in this slice.
- A pinned local Inter font is bundled from `@fontsource-variable/inter` 5.3.0 (OFL-1.1; license notice remains in that dependency). No browser is downloaded. Local Chrome/Chromium must exist; supply `--browser` outside the macOS default path. Remotion's pinned platform binaries provide FFmpeg/ffprobe, with their library directory supplied only to those subprocesses. No global installation/configuration is changed.
- Render output is an exclusive new directory. The composition checks text bounding rectangles for collisions and safe-region overflow; failures name the scene. Failed renders leave `render-error.json`, and incomplete scratch output is removed. Successful artifacts are moved from scratch only after ffprobe confirms one H.264/yuv420p stream, 1080×1920, 30 fps, exact decoded frame count/duration and no audio.
- Artifacts: `video.mp4`, six scene PNGs, two idle/overview PNGs, `gallery-inputs.json`, `ffprobe.json`, `render-manifest.json`. The manifest records script/video/still/font hashes, scene/frame mapping, theme, browser, Node, Remotion, encoder and platform. It grants no publishing rights. All generated artifacts remain ignored.
- Visual verification uses an explicitly reviewed local `golden-manifest.json` plus independent output, exact PNG hashes and per-decoded-frame YUV420p SHA-256. The bundled FFmpeg omits `framemd5`/rawvideo muxers; the verifier streams fixed-size rawvideo packets through its supported `image2pipe` muxer. It also reports MP4 byte identity. Neither pixel nor file hashes are promised across browser/font/encoder/OS changes; changing a baseline needs a new review. No future job recovery/cache or release manifest is implied.
