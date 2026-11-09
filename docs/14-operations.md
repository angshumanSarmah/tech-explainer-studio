# 14 — Local development, operations, and troubleshooting

> These are target operational requirements. The repository supplied with this pack is **documentation only**; commands prefixed `studio` describe the CLI to implement, not an executable already included here.

## Target platform

macOS on Apple Silicon, with Node.js (a maintained LTS release), Python runtime only where needed for the local TTS implementation, Chromium dependencies required by supported Remotion tooling, and FFmpeg/FFprobe. Use a pinned lockfile and recorded tool versions. Avoid committing voice weights or any nonredistributable assets.

## Tool and environment checklist

```text
[ ] node --version / npm --version
[ ] ffmpeg -version / ffprobe -version
[ ] Python runtime and a local Kokoro adapter smoke test
[ ] Remotion can render a simple 1080×1920 composition
[ ] SQLite migrations can create a local test DB
[ ] DeepSeek key configured only for AI-assisted runs (not render-only)
[ ] Optional Ollama installed and confirmed on local endpoint
[ ] YouTube OAuth configured only when P1 publishing begins
```

Do not assume Kokoro ONNX packages/voice bundles share identical APIs or licenses; pin one tested runtime and model download source before writing the adapter.

## Proposed configuration (`.env.example` — variable names are a design contract)

```dotenv
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-flash
OLLAMA_BASE_URL=http://127.0.0.1:11434
MAX_EPISODE_API_USD=0.50
PUBLISHING_ENABLED=false
YOUTUBE_DEFAULT_PRIVACY=private
LOCAL_DB_PATH=./data/studio.sqlite
OUTPUT_ROOT=./output
RENDER_FPS=30
RENDER_WIDTH=1080
RENDER_HEIGHT=1920
KOKORO_MODEL_PATH=
KOKORO_VOICE=
```

Keep `.env` gitignored. `PUBLISHING_ENABLED=false` is the recommended new-install default. The values above are an illustrative contract; actual key names must match the implementation and model/provider availability must be verified at setup.

## Operational commands to implement

`studio doctor`: check each dependency and report the actual version/status; no paid API calls unless `--probe-api` is explicitly supplied.

`studio plan`: source fetch, token budget estimate, draft script.

`studio render`: validate script, render clips, synthesize audio, assemble and QA.

`studio jobs inspect`: show step completion and last failure with asset hashes.

`studio jobs resume`: resume from durable checkpoint.

`studio review`: open output plus claims/caption report.

`studio publish`: require approved checksum and explicit destination/private setting.

## Debug playbook

| Symptom | Inspect | Response |
|---|---|---|
| DeepSeek yields empty JSON | Model response/finish reason, token limit | Retry once with scoped prompt; do not accept empty object |
| Source returns HTML requiring login | URL accessibility and policy | Flag inaccessible; do not bypass authentication |
| TTS silent/unintelligible | PCM sample rate, phonemes, selected voice | Fix lexicon/runtime and rerender scene audio |
| Video scene blank | Composition props, asset paths, render logs | Fail QC; inspect sampled frames |
| Captions late | audio alignment, scene start frames | Recompute based on measured audio; rerun QC |
| Memory pressure | concurrent render tasks, bitmap sizes | Reduce concurrency, cap scene resolution/particle count |
| YouTube 401 | OAuth grant/expired token | Reauthorize interactively |
| Upload uncertain after timeout | outbox, YouTube account/video list | Reconcile before retry; never post duplicate blindly |
| Playback corrupted | ffprobe, MP4 moov atom/codec mismatch | Rerender assembly with known encoder preset |

## Performance measurements

Record per scene: rendering wall time, peak memory if practical, asset sizes, voice generation duration, retries, and percentage of reused scene assets. Benchmark on the actual Mac before setting monthly content capacity.

## Backups and disaster recovery

- Backup `studio.sqlite`, immutable script revisions, manifests and approvals, plus unique source/asset metadata.
- Large cached renders may be regenerated if manifests and source assets are preserved; rendered public releases should be preserved at least until publishing reconciliation is complete.
- Simulate interrupted process and migration rollback before enabling recurring jobs.

## Maintenance cadence

Weekly during development: test source link health and dependency status, review failed jobs and unnecessary spend; monthly: verify API policies and model pricing against official docs, refresh Goldens after intended visual changes, test backup restore, and check YouTube OAuth permissions if connected.
