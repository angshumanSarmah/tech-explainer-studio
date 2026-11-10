# 14 — Local development, operations, and troubleshooting

> Implemented: script validation, silent Remotion previews, local narration and measured captioned preview assembly (Phases 01–04). Job management, general `studio doctor`, Director and publishing commands remain targets. See the root README and PROJECT_STATUS for actual commands and evidence.

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

## Local narration setup and commands (Phase 03)

The tested runtime is **Python 3.12.13 on macOS arm64**, `kokoro-onnx==0.6.1`, `onnxruntime==1.31.1`, `numpy==2.5.4` and `espeakng-loader==0.2.4`. `requirements-audio.in` identifies the direct dependency; `requirements-audio.lock` pins transitive packages and allowed distribution hashes. Use Python 3.12 for this lock; other Python/platform combinations are unverified. Espeak's library/data come from the local dependency. Installed dependency license notices must be retained; model/voice redistribution rights need separate review.

For a fresh setup, using an **already installed** Python 3.12, an operator can create the local environment and install the lock (requires package access or a populated cache; these are setup actions, never test hooks):

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements-audio.lock
```

An existing uv-managed environment without pip can instead use an already installed `uv pip sync --python .venv/bin/python --require-hashes requirements-audio.lock`. No global installation is required. Do not recreate an existing environment blindly.

Provide authorized local copies of `kokoro-v1.0.int8.onnx` (**114,119,327 bytes**) and `voices-v1.0.bin` (**28,214,398 bytes**) under ignored `models/`. The pre-existing local `models/download-manifest.json` records their upstream `thewh1teagle/kokoro-onnx` **model-files-v1.1** release provenance and hashes. The checked-in sample config pins those exact hashes; no model or voice binary is part of Git. Obtain weights only through explicit operator setup; CLI/tests never download them. Alternate assets require an intentional config/hash update after source and compatibility review.

`narration.config.example.json` is the non-secret Kokoro configuration. Paths resolve relative to its file. It identifies the Python executable, model/voice IDs and SHA-256 hashes, voice `af_heart`, language, rate, seed, `kokoro-http-v2` settings version and `tech-en-v1` lexicon. The mock example emits a test tone and is explicitly identified as mock throughout. Neither config reads API keys or `.env`. The proposed `KOKORO_*` env vars below are not implemented.

```bash
npm run studio -- audio doctor --config narration.config.example.json
npm run studio -- audio smoke --config narration.config.example.json --script examples/http-server.videoscript.json --scene scene-02-request --output output/phase03/voice-review --allow-local-synthesis
npm run studio -- audio narrate --config narration.mock.example.json --script examples/http-server.videoscript.json --output output/phase03/mock-review
```

The health command checks ffprobe, Python, asset hashes, runtime imports and the selected voice. It does not synthesize or prove every model graph is compatible; the smoke command does that. Real speech requires the explicit local-synthesis flag. `narrate` processes all scenes sequentially; use a new directory and retain earlier good scenes after failure. There is no automatic retry/resume or fallback to mock. Exit codes: **0** success, **2** usage/config/script, **3** not ready, **5** synthesis/output/QC, **6** missing local-synthesis opt-in. Doctor emits its full report on stdout, including failed checks.

Limits cover per-worker wall time, CPU seconds, ONNX/BLAS thread count, source/normalized text length, combined stdout/stderr bytes, WAV bytes and measured audio duration. The Python worker applies POSIX CPU/file-size limits; no hard RAM cap is claimed. It accepts only bounded JSON stdin and writes exclusive PCM16 mono 24 kHz WAV files. The executable and fixed worker arguments never contain narration. Its minimal environment excludes API keys; offline package flags are set and telemetry disabled. This is trusted local model execution, not an OS network sandbox. Windows resource behavior is unverified.

The selected int8 graph has an integer speed input; use rate **1** or **2**. Fractional rates fail explicitly rather than being rounded silently. The settings schema allows 0.5–2 for other compatible graphs. Changing rate, seed, voice or lexicon requires a new settings version for review. Seeded repeats matched on this machine; exact WAV bytes across runtime/CPU/platform upgrades are unverified. Each artifact records settings and actual model/runtime identity.

Inspect `<output>/<scene-id>/narration.json` and play the sibling WAV. SHA-256 and actual ffprobe duration are recorded there. Pronunciation substitutions are whole-word literal replacements (`HTTP` → `H T T P`, `URL` → `U R L`); server/request/response deliberately retain normal speech. No SSML/code is evaluated. Human listening remains necessary; nonempty samples alone do not establish intelligibility. Phase 04 now supports saved-audio muxing, captions with explicit review-only fallback or reviewed word timings, and independent media QC; see the root README for render-only commands.

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
