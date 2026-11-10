# Tech Explainer Studio

> **Phases 01–04 implemented:** script validation, silent previews, local narration and measured H.264/AAC preview assembly with captions/QC. Voice quality, caption timing and human playback review remain pending; publishing remains planned. Verified progress is recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md).
>
> **Read [EXECUTION_FLOW.md](EXECUTION_FLOW.md) first for the exact Codex build process.**

Tech Explainer Studio turns a technical topic or a public engineering reference into an **original, fact-checked, narrated, animated explainer** for YouTube Shorts and Instagram Reels. Technical topics come from system design, standards, computer-science principles and projects such as [Build Your Own X](https://github.com/codecrafters-io/build-your-own-x). The previously supplied dark-store / heatmap videos are **visual style references only**, not content requirements.

## At a glance

| Topic | Choice |
|---|---|
| Repository | New independent `tech-explainer-studio`; do not fork the entire automation-agent repository |
| Workflow | Three **logical stages**: Content Director → Video Producer → Publisher |
| AI | DeepSeek API opt-in (usage-priced); mock provider/local Ollama alternative |
| Scenes | Versioned `VideoScript` data + registered components, Zod validation, no arbitrary LLM code execution |
| Animation | Remotion + React + SVG, optional Playwright for legitimate UI walkthroughs |
| Audio/video | Local Kokoro + FFmpeg; captions aligned to actual audio timing |
| Persistence | SQLite and local artifacts (implemented in a later phase) |
| Publishing | Human approval; YouTube **private by default**, Instagram export first |
| Reference project | `phi-video-gen` is an architecture inspiration, **not** a code source unless rights permit |
| Tooling | Primarily local/free; API calls and cloud resources are optional and controlled |

## Start here

1. **[EXECUTION_FLOW.md](EXECUTION_FLOW.md)** — single authoritative setup, phase execution, review and handoff process.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — main architecture and Mermaid diagram; updated only when design changes.
3. **[AGENTS.md](AGENTS.md)** — persistent Codex engineering rules; Claude Code starts from [CLAUDE.md](CLAUDE.md).
4. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — factual phase completion log; updated after **each** phase.
5. **[CODEX_PROMPTS.md](CODEX_PROMPTS.md)** — index of the 14 copy-ready implementation phase prompts under [`codex/`](codex/).
6. **[docs/02-architecture.md](docs/02-architecture.md)**, **[docs/03-contracts.md](docs/03-contracts.md)**, **[docs/20-component-specs.md](docs/20-component-specs.md)** — detailed implementation references.
7. **[MIGRATION_FROM_PREVIOUS_ZIP.md](MIGRATION_FROM_PREVIOUS_ZIP.md)** — what changed, what old files to remove, how to preserve existing work.

## First milestone

**Phase 00–04:** render one original, mobile-readable **HTTP server** explainer from the checked-in [`examples/http-server.videoscript.json`](examples/http-server.videoscript.json) **without making a DeepSeek call**. The test should demonstrate browser → HTTP request → server → response using reusable SVG/Remotion components, measured Kokoro narration, captions, and FFmpeg assembly.

**Phase 05–06:** verify technical sources, implement the DeepSeek Content Director, and generate a strict source-backed `VideoScript`. **Phase 07–10:** recovery, approvals, private publishing and Instagram export. **Phases 11–13** add optional animation components, creator dashboard and analytics.

## Run the offline validator

Use Node 24.15.0 (`.nvmrc`) and npm 11.12.1. Dependencies are pinned in `package-lock.json`; installation needs the npm registry or a populated cache. Validation, tests and builds need no API keys or network after installation.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run studio -- --help
npm run studio -- script validate --file examples/http-server.videoscript.json
npm run typecheck
npm run lint
npm test
npm run build
node dist/cli/index.js script validate --file examples/http-server.videoscript.json
```

`npm run format` formats and applies safe Biome fixes to source, tests and configuration; it leaves the reference fixture untouched. No global CLI installation is needed. A successful validation emits JSON on stdout and exits `0`. Failures emit structured JSON on stderr: `2` for input/JSON/schema/file errors, `3` for unsupported visual types/components. Help exits `0`.

Only `title-card` and `tech-animation` with `BrowserRequestFlow` are supported. Validation stays independent of the renderer. Syntax/schema validity does not approve facts, rights, timing or a release.

## Render a silent preview

Use an existing local Chrome/Chromium installation; automatic browser downloads are disabled. On macOS the default is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; elsewhere supply `--browser <executable>`. FFmpeg and ffprobe come from the pinned Remotion platform package, not a global installation. Inter is bundled locally from `@fontsource-variable/inter` (OFL-1.1); no online fonts/assets or source URLs are fetched while rendering.

```bash
npm run studio -- render --script examples/http-server.videoscript.json --output output/phase02/review
# Optional preview overlay: add --guides
# Or use the compiled CLI after npm run build:
node dist/cli/index.js render --script examples/http-server.videoscript.json --output output/phase02/second-review
```

Choose a **new output directory** for each run; existing output is never overwritten. The unchanged fixture produces a **55-second, 1,650-frame, 1080×1920@30 silent H.264/yuv420p MP4**, six scene PNGs, two extra idle/overview gallery PNGs, gallery inputs, ffprobe results and a render manifest with input/tool/font/media hashes. Generated files stay under ignored `output/`. Estimated saved scene durations are used only for this explicitly silent preview; measured narration timing belongs to Phases 03–04.

Motion is frame-based. Unsupported cues (including phrase cues without audio alignment), hidden flow endpoints, long labels or failed media/layout checks produce an explicit error. Export labels are bounded by the current mobile guide rectangle; current-device platform overlays still require human review. Help documents exits `3` for unsupported render input and `5` for render/QC failure. Render progress goes to stderr, the result JSON to stdout. Rendering starts no LLM/provider client and grants no release approval.

The verified local artifacts are `output/phase02/render-a/` and `output/phase02/render-b/`. After reviewing the first set of PNGs and defining its local `golden-manifest.json`, compare independent renders with:

```bash
npm run test:visual -- --baseline output/phase02/render-a --candidate output/phase02/render-b
```

This checks 8 golden PNGs across both runs, probes both videos, and compares all decoded YUV frames. Golden images/hashes are local review artifacts, not Git content; changing tool/font/platform inputs requires a new explicit frame review. The initial coding-agent baseline is not human release approval. Planning, `render --job` and publishing commands remain proposals; narration and measured captioned previews are implemented below.

## Generate local narration (Phase 03)

Narration runs separately from the silent renderer. It requires no AI API subscription. The mock adapter needs only npm dependencies and produces clearly marked one-second test tones:

```bash
npm run studio -- audio doctor --config narration.mock.example.json
npm run studio -- audio narrate --config narration.mock.example.json --script examples/http-server.videoscript.json --output output/phase03/mock-review
```

For speech, use Python 3.12, install the hash-pinned `requirements-audio.lock` into a local `.venv`, and provide the model and voice files identified in `narration.config.example.json`. Setup is an explicit operator action; commands and provenance are documented in [docs/14-operations.md](docs/14-operations.md). Tests and CLI commands never download models. Paths resolve relative to the config file; the sample contains no private paths or secrets. To check installed assets and explicitly run one scene:

```bash
npm run studio -- audio doctor --config narration.config.example.json
npm run studio -- audio smoke --config narration.config.example.json --script examples/http-server.videoscript.json --scene scene-02-request --output output/phase03/voice-review --allow-local-synthesis
```

Use `audio narrate` without `--scene` to synthesize all scenes sequentially. Use a fresh output directory on every run. Each scene retains a PCM16 mono 24 kHz WAV and metadata with its SHA-256, ffprobe-measured duration, model/voice hashes, runtime identity, versioned pronunciation/voice settings and random seed. Failures identify the scene and preserve earlier outputs; there is no automatic mock fallback. Review technical pronunciation by listening before using speech in a video. Narration manifests grant no release approval.

## Render a narrated preview (Phase 04)

Generate narration once, then render from those saved WAVs without loading Kokoro or contacting an LLM:

```bash
npm run studio -- audio narrate --config narration.config.example.json --script examples/http-server.videoscript.json --output output/http-audio --allow-local-synthesis
npm run studio -- render --script examples/http-server.videoscript.json --narration output/http-audio --output output/http-narrated --allow-caption-fallback
# Saved-artifact replay after npm run build:
node dist/cli/index.js render --script examples/http-server.videoscript.json --narration output/http-audio --output output/http-narrated-replay --allow-caption-fallback
```

Every output directory must be new. Omitting `--narration` retains the Phase 02 silent command. The narrated path verifies saved text/audio hashes and independently probes every WAV. Scene duration is `ceil(max(audioSamples / 800, min_seconds * 30))` frames; starts are cumulative integers. This preserves the fixture's authored minimum holds, ignores preferred estimates and never truncates speech. Narration exceeding `max_seconds` fails by scene. Zero padding consists only of authored holds and the final fractional frame; there is no missing-scene substitution.

`--allow-caption-fallback` explicitly selects a **review-only scene speech-span fallback**. It displays the full original narration during detected audio activity for that scene, using neither equal word timings nor equal scene chapters. It does not locate individual words. The SRT/overlay use the same frame intervals, with at most three lines inside the mobile-safe rectangle. Output is marked `requiresTimingReview: true` and cannot pass strict checks. Captions need human speech/playback review. The installed INT8 voice has a reported clarity/noise issue and measured DC bias; QC flags this, and the preview does not silently filter or replace it. The default narrator remains unchanged.

For exact phrase cues and shorter timed captions, supply `--alignment reviewed-words.json` instead of the fallback flag. Its strict, WAV/text-hash-bound word/sample contract is documented in [docs/03-contracts.md](docs/03-contracts.md). The producer consumes reviewed timings; no aligner/model is downloaded. Phrase anchors without reviewed word timings, missing or ambiguous phrases, bad caption intervals, silent/clipped audio, missing scenes and failed media subprocesses fail explicitly. `--strict` rejects mock audio and unreviewed timing; it never grants release approval.

Artifacts: `video.mp4`, `captions.srt`, `timeline.json`, saved `videoscript.json`, per-scene narration/metadata, padded `narration.wav`, decoded final audio, six captioned PNGs under `visuals/`, `ffprobe.json`, `qc-report.json` and `render-manifest.json`. The manifest records scene starts, audio samples, holds/padding, cue frames, artifact/model/runtime/tool hashes and exact implementation-file hashes, including dirty source. Source revisions/hashes absent from the fixture stay explicitly unknown; this phase performs no research. QC independently checks final video frames/streams/durations and decodes AAC to inspect each scene. Failed runs retain `render-error.json` and partial artifacts, never a finalized `video.mp4`.

The current HTTP review preview is `output/phase04/http-preview-delivery/video.mp4`. Review its QC checklist and listen on a phone before accepting the milestone. No release/publication approval is implied.

## Detailed reference documentation

The [`docs/`](docs/) directory retains the complete product and engineering blueprint: product requirements, content strategy, schemas, video engine, workflow, security, testing, operations, decisions, animations and content backlog. Refer to the relevant documentation **for the current phase** rather than reading every file for every task. See [docs/25-build-phase-map.md](docs/25-build-phase-map.md).

## What is not included

The package contains script validation, silent previews, narration and measured captioned preview assembly. It does **not** contain an automatic aligner, director, database, dashboard, publisher, API credentials, model weights, third-party media, or authorized copies of workplace code. Those later application stages remain a design target; model files and generated media stay outside Git.
