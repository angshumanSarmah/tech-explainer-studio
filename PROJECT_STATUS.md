# Tech Explainer Studio — Implementation status

> **Status baseline:** Phase 06 manual/automated Director and brand consolidation implemented; 176/176 regression tests pass, with a real 37.1-second narrated HTTP preview and six-frame/six-WAV baseline comparisons. Live DeepSeek is UNVERIFIED and was not authorized/called.
> **Next phase:** Review Phase 06 artifacts and narration/caption/fact/rights limitations. Phase 07 requires a new explicit request; no later phase is started and all media remains unapproved for release.
> **Last updated:** 2026-11-10 (Asia/Kolkata).

## Phase tracker

| Phase | Deliverable | Status | Evidence / notes |
|---|---|---|---|
| 00 | Repository orientation, rights and execution baseline | Done | Audit recorded below; user subsequently authorized Git setup and explicitly requested Phase 01 |
| 01 | TypeScript foundation, schema, fixture and CLI validation | Done | Verified baseline committed/pushed as `0bafa13`; user explicitly requested Phase 02 |
| 02 | Remotion vertical silent animation renderer | Done | 62/62 tests; two offline 55-second renders; 16 golden comparisons and all 1650 decoded frames match; ready for human playback/phone review |
| 03 | Local Kokoro narration adapter and pronunciation | Needs review | 82/82 tests; source/compiled seeded real Kokoro WAVs match, 4.233333 seconds; human listening pending |
| 04 | Measured timeline, subtitles, assembly and media QC | Done | User confirmed phase complete and audible playback; latest caption-clearance revision passes 93/93 tests, 37.1s H.264/AAC, reserved 42px caption band; human release review remains pending |
| 05 | Safe GitHub/docs ingestion, source snapshots and claim ledger | Needs review | Extended for multi-source bundles; 55/55 network-denied source tests, 148/148 full tests, typecheck/lint/build pass; live ingestion UNVERIFIED by user choice |
| 06 | Manual/optional AI Director, sourced storyboard and BrandProfile | Needs review | 28/28 network-denied Director/brand tests; 176/176 full tests; manual Kokoro/Remotion/FFmpeg preview verified; live DeepSeek unverified |
| 07 | SQLite job state, resumability and incremental rerendering | Not started | — |
| 08 | Human fact/media/video approval and immutable release manifest | Not started | — |
| 09 | YouTube OAuth, private upload, retries and reconciliation | Not started | — |
| 10 | Instagram Reels manual export bundle | Not started | — |
| 11 | EventQueue, B-tree, Git object graph and code traces | Not started | — |
| 12 | Optional localhost review dashboard | Not started | — |
| 13 | Optional analytics feedback, hardening and controlled launch | Not started | — |

Status vocabulary: **Not started · In progress · Blocked · Needs review · Done**. Only use `Done` when acceptance criteria have observed verification evidence.

## Phase 00 — Verified baseline (2026-11-09, before implementation)

### Repository and documentation inventory

- Working directory: `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2`.
- `git status --short --branch` failed with `fatal: not a git repository (or any of the parent directories): .git`. No branch, history, remotes or Git diff are available here. No Git state was created or changed.
- Recursive inventory, including hidden files: **55 files** — **53 Markdown documents**, **one JSON fixture**, and `.DS_Store`; no symlinks. The Markdown inventory comprises 10 root documents, 26 `docs/` references, 14 numbered phase prompts, and three shared prompts.
- No application source, tests, `package.json`, dependency lockfile, `tsconfig`, installed project dependencies, `.gitignore`, `.env`, license file, model weights or media outputs were found. No previous working implementation was present to preserve. File inventory does not establish legal provenance or constitute a secret-content audit.
- Read the root instructions/workflow, current phase, vision, PRD, both architecture documents, roadmap, migration notes and build phase map. Indexed all other documentation by filename/heading and checked its local links/JSON examples; this was not a full technical review of every future phase.

Existing design/reference inventory (all planned, not implemented):

| Area | Files |
|---|---|
| Architectural entry points | `ARCHITECTURE.md`; `docs/02-architecture.md` (context, containers, pipeline, producer, state machine, deployment and interfaces) |
| Product and contract | `docs/00-vision.md`, `01-prd.md`, `03-contracts.md` |
| Stages and storage | `docs/04-content-director.md`, `05-video-engine.md`, `07-workflow.md`, `08-publisher.md`, `09-data-and-api.md` |
| Quality, safety and operations | `docs/10-visual-system.md`, `11-security-and-legal.md`, `12-quality-and-tests.md`, `14-operations.md`, `15-adrs.md`, `17-prompts-and-evals.md` |
| Fixture, components and UI | `docs/16-example-http-server.md`, `18-studio-ux.md`, `20-component-specs.md` |
| Editorial and references | `docs/06-content-strategy.md`, `19-references.md`, `21-channel-launch.md`, `22-budget-and-metrics.md`, `23-90-day-topics.md` |
| Sequencing and migration | `docs/13-roadmap.md`, `24-migration-notes.md`, `25-build-phase-map.md`; root `CODEX_PROMPTS.md`, `EXECUTION_FLOW.md`, `MIGRATION_FROM_PREVIOUS_ZIP.md` |

### Scope and discrepancies resolved for this baseline

- **MVP confirmed:** the original HTTP server request → parse → route → response explainer in `examples/http-server.videoscript.json`. The fixture has six scenes, targets 1080×1920 at 30 fps, uses title cards and `BrowserRequestFlow`, and labels its application routing abstraction and omitted protocol layers as simplifications. Dark-store/Uber heatmap videos are style references only.
- **Planned boundaries retained:** ContentDirector is the only LLM-assisted stage; VideoProducer renders saved validated data deterministically; Publisher requires explicit human action and approval bound to final video/metadata hashes, with private upload defaults. Strict TypeScript, Zod trust-boundary validation, registered components, measured narration timing and no generated-code execution remain requirements. None is executable yet.
- **Roadmap numbering mismatch:** `docs/13-roadmap.md` Phase 0 is a broad milestone and lists initialization, a commit, provider-key choice and `studio doctor` as deliverables/exit. The current `codex/00-orientation-and-rights.md` and explicit user scope control this audit: no CLI implementation, installation, commit, external call or Git mutation. This audit substitutes manual capability checks only; it does **not** satisfy the roadmap's executable `doctor` exit. Provider choice/credentials are unnecessary for Phases 01–04. No architecture change is proposed.
- **Package layout:** the `apps/` and `packages/` tree in `docs/02-architecture.md` is an eventual proposal. The binding initial implementation is **one TypeScript package**, as required by `AGENTS.md`; no monorepo or agent framework is authorized.
- README's “Phase 00 is next” remains the starter entry instruction; this status file records that its audit now awaits review.

### Ownership and reuse boundary

- The user identifies this as a new independently owned project. No written authorization, license grant, transferable source or rights ledger for `phi-video-gen` was found in this folder. Earlier screenshots are described by the documentation; they were not supplied as local evidence for this audit. **No phi-video-gen code or assets are cleared for reuse.**
- Proceed with independent implementation from the project's requirements and synthetic fixture. Do not import workplace code, prompts, screenshots/Figma designs, internal documents, credentials, branding or media. This applies even to apparently generic workers/helpers. Reuse requires specific documented rights and preserved notices before any import.
- Public GitHub references and the MDN/RFC links are references, not a grant to copy source, scripts or media. Fixture sources are marked `link_only_no_republication`; retrieval timestamps/hashes are unset and claims still need human review. No sources were fetched or facts externally verified.
- The project license is explicitly undecided in `CONTRIBUTING.md`, and no `LICENSE` exists. Choosing a distribution license and reviewing licenses/notices for future code, fonts, voices, models and media are prerequisites for their use/distribution, not blockers to independent local Phase 01 work. No upstream license is inherited by assumption.

### Local tool availability

Observed in this shell on 2026-11-09; availability is not proof of compatibility with a future dependency set.

| Capability | Observed result | Consequence |
|---|---|---|
| Platform | macOS 27.2, build 26B123; Darwin 27.2.0, arm64 | Matches the planned Apple Silicon platform |
| Git | 2.50.1 (Apple Git-155) | Installed; this folder is not initialized |
| Node.js / npm | v24.15.0 / 11.12.1 | Available for Phase 01; exact supported versions must be pinned and tested there |
| Python | `/usr/bin/python3`, 3.9.6 | Available for audit scripts; Kokoro runtime compatibility **UNVERIFIED** |
| FFmpeg / ffprobe | Commands not found; neither binary at `/opt/homebrew/bin` or `/usr/local/bin` | Missing in checked locations; blocks later media verification until separately provisioned |
| Kokoro runtime | `kokoro` / `kokoro-onnx` commands absent; Python `kokoro`, `kokoro_onnx`, `onnxruntime`, `torch` modules absent in the checked Python interpreter | Local speech synthesis unavailable in this environment as checked |
| Kokoro weights/voices | No model files in workspace; no `.cache/kokoro`, `.cache/kokoro-onnx`, `.cache/huggingface/hub` or `Library/Caches/huggingface/hub` directories under the user home | No usable bundle identified; other locations/interpreters were not exhaustively searched |
| TypeScript / Zod / Remotion / React | No project package or installed project dependencies; `tsc` absent from PATH | Implement/install locally only in an authorized later phase; browser render compatibility **UNVERIFIED** |
| `studio` | Absent from PATH; no local CLI source | All documented `studio` invocations remain proposals |
| Optional `uv` | 0.11.1, aarch64-apple-darwin | Present; not installed or used to provision Python/models |

`docs/14-operations.md` targets a maintained Node LTS release, a Python runtime only as needed by the chosen TTS adapter, and pinned dependencies. There is currently no version/engine contract or lockfile. Node 24.15.0/npm 11.12.1 are **observed candidates**, not a verified support matrix; upstream lifecycle and package compatibility were not checked online. Select and pin one tested Kokoro runtime/model/voice source in its phase; Python 3.9.6 alone does not establish readiness.

### Verification performed and artifacts

| Actual commands/checks | Outcome |
|---|---|
| `pwd`; `git status --short --branch` | Directory reported above; Git check failed because `.git` is absent |
| `rg --files` and hidden-file inventory; Python `pathlib` recursive inventory and SHA-256 snapshot | 55 files, no app implementation or symlinks; baseline copy/hashes retained for comparison |
| `cat` on required documents/fixture; `rg -n` on scope, tool requirements, headings and proposed commands | Planned architecture distinguished from actual contents; discrepancies recorded above |
| `uname -srm`; `sw_vers`; `command -v git node npm python3 ffmpeg ffprobe tsc kokoro kokoro-onnx uv`; `command -v studio tsc kokoro kokoro-onnx ffmpeg ffprobe` | Platform/tool presence recorded above; missing commands returned no path |
| `git --version`; `node --version`; `npm --version`; `python3 --version`; `uv --version` | Versions recorded above |
| `ffmpeg -version`; `ffprobe -version` | Both failed with `command not found`; no media probe claimed |
| Final Python SHA-256 comparison, link/JSON recheck; `diff -u` against the saved status; repeated `git status --short --branch` | Only `PROJECT_STATUS.md` changed; no added/deleted files. All 101 local links and five JSON samples passed again. `diff` exit 1 confirmed the documentation edit; Git again exited 128 because this is not a repository. |
| `python3 -` with standard-library `pathlib`, `re`, `urllib.parse`, `json`, `importlib.util`, `hashlib` | Parsed all 53 Markdown files for inline local links outside fenced examples: **101 local link occurrences, zero missing targets, zero fragment links**. No reference-style definitions found. Identified 17 unique external Markdown targets; did not request them. JSON parsing passed for the fixture and all **four** fenced `json` examples (`docs/03-contracts.md`: two; `05-video-engine.md`: one; `09-data-and-api.md`: one). Checked Python module presence, model/cache locations and alternate binary paths without importing runtimes or downloading anything. |

- Deliverable: this updated `PROJECT_STATUS.md`. No application, media or model artifacts were produced.
- Temporary comparison evidence: `/var/folders/cp/ckq1r32x48g63ztcth4__4q80000gn/T/tes-phase00-n0wpj_m5/PROJECT_STATUS.before.md` and `before-sha256.json` (local temporary files, not durable project artifacts).
- **UNVERIFIED:** schema validity, claim accuracy, external URL reachability/licensing, TypeScript compilation, lint, unit/integration tests, Remotion/browser support, Kokoro speech, timing/captions, rendered frames, ffprobe output, credentials and external-service behavior. Application checks have no implementation to run. JSON parsing is syntax verification only.
- No installs, model downloads, network/API/OAuth calls, credential/config inspection, copied source, uploads, remote creation, commits or pushes were performed.

### Acceptance and handoff

| Criterion | Evidence / disposition |
|---|---|
| AC-01 | Architecture documents and supporting inventory identified; HTTP-server scope and boundaries agree. Roadmap granularity and eventual directory proposal are explicitly qualified above. |
| AC-02 | No transfer rights established; independent implementation chosen. Future import/distribution license prerequisites are explicit. |
| AC-03 | Available/missing tools, checked locations and compatibility limits recorded; local links and JSON syntax checked without application test claims. |
| AC-04 | No unresolved critical product/ownership requirement prevents independent Phase 01 work. Phase 01 must create the single-package strict TypeScript/Zod baseline, pin dependencies and validate the fixture there; no paid provider, audio or publishing prerequisite is needed. Human review remains pending. |

**Next manual action:** review this baseline and its temporary before/after comparison. Local Git initialization is now complete (see follow-up below); establish ignore rules before the first commit. Then explicitly request Phase 01. Do not begin Phase 02 or install later media dependencies as part of Phase 01.

**Later blockers:** FFmpeg/ffprobe availability (render/media phases), Kokoro runtime/weights/voice licenses and pronunciation (Phase 03), source/claim verification (Phase 05), and explicit credentials/budget/OAuth/upload authorization in their respective phases. Channel branding, platform caption policy and optional dashboard choices can wait. No architecture/interface changed, so no ADR, architecture, contract or agent-rule edit was necessary.

## Git setup follow-up — 2026-11-09

- User explicitly requested local Git initialization and supplied the GitHub remote.
- `git init -b main` succeeded after retrying with filesystem permission; the initial sandbox attempt failed with `Operation not permitted`.
- `git remote add origin https://github.com/angshumanSarmah/tech-explainer-studio.git` succeeded. `git remote -v` confirms this URL for fetch and push; `git symbolic-ref --short HEAD` reports `main`.
- `git status --short --branch` reports `No commits yet on main`; all project files remain untracked. `git diff --cached --stat` is empty: nothing staged.
- No commit, push, fetch, remote repository creation or GitHub connection test occurred. Remote existence/access and branch protections remain **UNVERIFIED**. The earlier audit's missing-Git observations describe the state before this follow-up.

## Phase 01 — TypeScript contracts and offline CLI (2026-11-10)

**Status: Done — automated acceptance checks passed; ready for human review.** The user's explicit Phase 01 request authorizes proceeding from the audited independent implementation baseline. No proprietary source/assets were imported and the HTTP fixture was not edited.

### Changes and implemented behavior

- Single root package: `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `tsconfig.build.json`, `biome.json`, `.gitignore`. Strict TypeScript also enables unchecked-index and exact-optional-property checks. Supported development range is Node `>=24.15.0 <25`, npm `>=11 <12`; verified on Node **24.15.0**, npm **11.12.1**, macOS arm64 only. The pinned package-manager version is 11.12.1.
- Exact direct dependencies: **Zod 4.6.7**, **TypeScript 7.0.2**, **Biome 2.6.6**, **@types/node 24.19.2**. Native Node test runner/type stripping avoids another test/transpilation package. npm's lockfile records transitive versions/integrities. Package is private with `UNLICENSED` metadata while distribution licensing remains undecided; no open-source license was chosen or inherited.
- `src/domain/visuals.ts`: strict nested props, a validation-only `BrowserRequestFlow` registry, discriminated title-card/tech-animation union and cue model. Unknown components/props and executable configuration fields fail. Response phases require response data; a 204 cannot depict a body. Numeric cue values are finite, progress windows normalized/ordered, targets stable identifiers, and common expression/script/command-shaped cue strings rejected. Display text stays inert, including the fixture's literal HTML body preview; no renderer/evaluator is present.
- `src/domain/videoscript.ts`: full versioned script schema, source/claim records, geometry and timing checks, unique IDs, reference integrity, caption interval bounds and uniquely resolvable phrase cues. Review/source/license strings are descriptive data, not authorization. Code traces, screen recordings and P2 components remain unsupported rather than accepting placeholder contracts.
- `src/domain/validation.ts`: `parseVideoScript(unknown)`, `parseVideoScriptJson(string)`, and `ScriptValidationError` with typed issue code, scene ID, JSON path and reason. Unknown keys point to the extra field; malformed JSON errors omit source excerpts. No values are coerced or evaluated.
- `src/cli/run.ts`, `src/cli/index.ts`: `script validate --file`, `--help`/`-h`, JSON success/errors, file/usage handling and exit codes 0/2/3. `npm run studio -- ...` runs source locally; `npm run build` supplies `dist/cli/index.js` for Node or the package bin. No global installation, API keys or network calls are required at runtime.
- `tests/validation.test.ts`, `tests/cli.test.ts`, `tests/helpers/fixture.ts`, `tests/helpers/no-network.ts`: fixture preservation, malformed input, strict runtime rejection, protocol/cue/timing/reference checks, CLI flags/files/exits, plus real subprocess tests with an empty environment and network functions blocked. The test-only guard is separately verified to reject fetch before connecting; it is not a production OS sandbox.
- `.gitignore` excludes dependency/build/cache outputs, environment files, expected local data/models/references, common weights/private keys and `.DS_Store`; it preserves the example fixture and potential `.env.example`.
- Updated `README.md`, `EXECUTION_FLOW.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/02-architecture.md`, `docs/03-contracts.md`, `docs/09-data-and-api.md`, `docs/20-component-specs.md`, and this status file to describe actual commands, interfaces, limits and supported variants. The main and detailed architecture now identify implemented validation modules separately from planned services. No major design decision changed, so no ADR was added. `AGENTS.md` and `CLAUDE.md` are unchanged.

### Actual verification commands and results

| Command/check | Actual result |
|---|---|
| Initial `git status --short --branch`; `git diff --stat`; file inventory | `No commits yet on main`; documentation/fixture untracked, no application source. Git diff is empty because nothing is tracked; temporary file hashes were captured before edits. No staging/commit/push occurred. |
| `node --version`; `npm --version`; `npm view` for all four dependencies (public npm registry, retries disabled) | Local versions above; registry versions/engine requirements checked. Initial sandbox DNS lookup failed (`ENOTFOUND`); queries succeeded with network permission. No application service or paid API was contacted. Official Zod, Node TypeScript-support and Biome documentation were also consulted. |
| `npm install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org --fetch-retries=0 --cache=/tmp/tech-explainer-npm-cache` | Exit 0, **7 packages added** locally; lockfile generated. No lifecycle scripts or global installation. |
| `npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/tmp/tech-explainer-npm-cache` | Exit 0, **7 packages added** from the populated cache. Confirms reproducible local installation from the lockfile without network after setup. |
| `npm run format` (final) | Exit 0; **Checked 13 files. No fixes applied.** Reference fixture is outside formatting scope. |
| `npm run typecheck` (final) | Exit 0; `tsc --noEmit`, **zero diagnostics**. |
| `npm run lint` (final) | Exit 0; **Checked 13 files. No fixes applied.** No lint warnings/errors. |
| `npm test` / `npm run test` (final) | Exit 0; **45 tests, 45 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**. Includes real CLI success/failure with network blocked and no API-key environment. |
| `npm run build` | Exit 0; JavaScript, declaration files and source maps emitted under ignored `dist/`. |
| `npm ls --depth=0` | Exit 0; all four exact direct versions above installed. |
| `npm run studio -- script validate --file examples/http-server.videoscript.json` | Exit 0; `{"valid":true,"script_id":"fixture-http-request-001","schema_version":"1.0.0","scene_count":6}`. |
| `node dist/cli/index.js --help` | Exit 0; documented usage and exit codes printed. |
| Source **and built** CLI: `node --import ./tests/helpers/no-network.ts <src/cli/index.ts or dist/cli/index.js> script validate --file <fixture>` in an empty environment | Original fixture exits **0**; unknown component fixture exits **3**; extra-props fixture exits **2**; malformed JSON exits **2**. Actual stdout/stderr recorded in temporary logs below. |
| `git check-ignore --no-index` on representative paths | Dependency/build/output/data/model/reference directories, `.env`, `.env.local` and `.DS_Store` ignored; `.env.example` and the HTTP fixture remain eligible for tracking. |
| Final Python hash/scope, Markdown/JSON, lockfile and ignore checks; `git status --short --branch`; `git diff --cached --stat` | **16 new files, 9 existing documents modified, no deletions** outside ignored dependencies/build artifacts. Fixture and both agent instruction files byte-identical to baseline. **103 local links resolve**, four fenced JSON examples and all project JSON files parse. Lockfile direct versions match the manifest. Git still reports no commits on `main`; staging is empty. Scope report saved as `final-scope.json` in the evidence directory. |

The first development iteration had 44 passing tests but typecheck/lint findings in the new test guard/callbacks; those were fixed without loosening strictness. Biome's deprecated `recommended` configuration was replaced with its current `preset` spelling. A final display-path command-substitution regression brought the final count to **45**, all passing. Only final results above establish acceptance.

Demonstrated invalid-fixture diagnostics (both source and compiled CLI):

| Input mutation | Exit | Issue code / scene / path / reason |
|---|---|---|
| Change scene 2 component to `UntrustedComponent` | 3 | `UNKNOWN_VISUAL_COMPONENT`; `scene-02-request`; `$["scenes"][1]["visual"]["component"]`; expected `BrowserRequestFlow` |
| Add `props.arbitraryExpression` | 2 | `INVALID_INPUT`; `scene-02-request`; `$["scenes"][1]["visual"]["props"]["arbitraryExpression"]`; `Unexpected property` |
| Truncated JSON | 2 | `MALFORMED_JSON`; scene `null`; `$`; complete syntactically valid JSON required |

### Artifacts, scope and acceptance

- Durable deliverables: source/tests/configuration/lockfile and updated documentation listed above. Original fixture SHA-256 is `d1365e6aa09c7464cdded25fef21cbadc4fe78a2bdc60c12c41b2107d0298e37`.
- Local build artifacts: ignored `dist/cli/` and `dist/domain/` (JS, declarations, source maps). No audio/video/model artifacts were generated.
- Temporary review evidence: `/var/folders/cp/ckq1r32x48g63ztcth4__4q80000gn/T/tes-phase01-t70xe_9b/` contains pre-edit hashes/document copies; `typecheck.log`, `lint.log`, `test.log`, `build.log`, `help.log`; generated `unknown-component.json`, `extra-props.json`, `malformed.json`; and `src-*.log` / `dist-*.log` with exact argv, exits, stdout/stderr. These files can be cleared by the OS and are not committed project artifacts.
- **AC-01 passed:** unchanged valid HTTP fixture accepted; invalid and malformed inputs have actionable diagnostics/nonzero exits. **AC-02 passed:** unknown components and nested/extra props rejected by runtime Zod schemas and real CLI tests. **AC-03 passed:** documented typecheck/lint/test scripts pass. **AC-04 passed:** validation succeeds without credentials and with network functions blocked; dependency setup is separate.
- **UNVERIFIED / deferred:** other Node/npm versions, other operating systems, production distribution/license selection, OS-level network sandboxing, source accuracy/rights approvals, rendering/mobile readability, TTS, media timing/captions/ffprobe, storage, AI generation, OAuth and publishing. Later-phase limitations from the baseline still apply; schema validity is not factual or release approval. No renderer accepts these props yet.
- No commit/push, GitHub fetch/access test, paid API, OAuth, upload, global install, model download or proprietary import. Existing `origin` and branch were not modified.

**Next manual review:** inspect the source, strictness/diagnostics, dependency pins and saved verification evidence. Then explicitly request Phase 02 if approved. Phase 02 will need its own renderer/browser/tool checks; no later phase was started.

## Phase 02 — Deterministic silent Remotion renderer (2026-11-10)

**Status: Done — automated/media acceptance passed; ready for human review.** Started from clean `main` at `0bafa13007194007b93b748735f7ccd6713c6912`. The original HTTP fixture, domain schemas, agent instructions and prior validation behavior are preserved. No Phase 03 work, commit or push occurred.

### Implemented and changed files

- `package.json` / lockfile: exactly pinned Remotion, renderer and bundler **4.0.542**; React/React DOM **19.3.1**; React/React DOM types **19.3.0**; local Inter variable font **5.3.0** (OFL-1.1, dependency retains its license notice). Existing TypeScript 7.0.2, Zod 4.6.7 and Biome 2.6.6 remain pinned. One package, no workspace. TS configs add strict TSX support, and `src/assets.d.ts` types local CSS imports.
- `src/renderers/remotion/theme.ts`, `plan.ts`: original Signal/Trace tokens, mobile guide rectangle, text wrapping and a contiguous integer-frame **silent-estimate** timeline. Fixture durations are `[150,300,300,270,360,270]`, total **1650 frames / 55 seconds**. Narration is not synthesized or used to guess speech timing. Unsupported profiles/targets/captions/cues, nonillustrative traces, hidden endpoints and unsafe label lengths fail preflight with scene/path/reason.
- `src/visuals/BrowserRequestFlow.tsx`, `SvgText.tsx`, `flow-state.ts`: original SVG nodes, packet envelopes, arrowheads, phase labels and pure frame interpolation. Six states: idle/request/parse/route/response/overview. Browser stays above server; request moves down the left lane, response up the right. Parse and route are distinct highlighted operations. Shared props remain validated; no generated source, random positions, online assets or arbitrary expression execution.
- `src/renderers/remotion/registry.tsx`, `Composition.tsx`, `entry.tsx`: static binding of the registered component to authored React code, 1080×1920@30 composition, font readiness, label-bound/collision checks and optional guide overlay. Domain validation stays independent of the render registry. The fixture's title-card summary remains a title card; separate validated gallery inputs exercise idle/overview without editing the source fixture.
- `src/renderers/remotion/render.ts`, `media-tools.ts`: local bundling and existing Chrome, PNGs and H.264/yuv420p output, version/hash manifest, ffprobe QC, exclusive new output directories and staging until QC passes. Failure reports name stage/scene when known; no fallback visual/media is substituted. `licenseKey: null` and no provider clients are used; rendering needs no API keys. No browser or font is fetched at render time. Bundled platform FFmpeg/ffprobe are used without a global installation.
- `src/cli/render-cli.ts` / modified `src/cli/run.ts`: lazy render path `render --script <path> [--output <new-directory>] [--browser <executable>] [--guides]`. Unsupported rendering input exits **3**; browser/output/render/QC errors **5**; validation/help preserve Phase 01 behavior. Progress is stderr, success JSON stdout. Existing output is never overwritten.
- Tests: extended `tests/cli.test.ts`; new `tests/helpers/no-renderer.ts`, `tests/visual/animation.test.ts`, `media.test.ts`, `verify.ts`. They cover timeline continuity, cue application/direction, all six states, out-of-order frame determinism, explicit unsupported cases, media failures, no renderer imports during validation, and independent real-video/golden comparisons. `test:visual` is separate from ordinary unit tests and requires existing local artifacts; it never auto-updates a baseline.
- Compatibility fix: `src/renderers/remotion/remotion-compat.d.ts` maps the undeclared `Timer` name exposed by Remotion 4.0.542's published types to the standard `setTimeout` return type. Strictness and dependency declaration checking remain enabled; no `any`/`skipLibCheck` workaround. Revisit this small adapter on Remotion upgrades.
- Updated README/execution/contribution guidance, main/detailed architecture, video-engine, visual-system, component, HTTP example and CLI references to describe the implemented slice. The old conceptual cue example and HTTP scene mapping now match the canonical contract/unchanged fixture. Architecture boundaries are implemented as planned, so no new ADR or agent-rule edit was needed.

### Actual verification commands and outcomes

| Command/check | Observed result |
|---|---|
| `git status --short --branch`; `git diff --stat`; required docs/source inspection | Clean `main...origin/main` at start. No changes staged, committed or pushed in this phase. |
| `npm view` metadata queries for Remotion/React/font/types; official Remotion API documentation | Compatible versions checked and pinned as above. Only dependency setup/documentation access, no app/provider service connection. |
| Two `npm install --save-exact ... --ignore-scripts --no-audit --no-fund` calls (types with `--save-dev`) | Exit 0: **167 + 3 packages added** to the prior package. No lifecycle scripts, global install, browser download or model weights. |
| `npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/tmp/tech-explainer-npm-cache` | Exit 0: **177 packages** installed from the populated cache/lockfile. |
| `npm run format` | Exit 0. Source/configuration formatted; fixture outside formatting scope. |
| `npm run typecheck` (final) | Exit 0; **zero TypeScript diagnostics**, including dependency declarations. |
| `npm run lint` (final) | Exit 0; **Checked 30 files. No fixes applied.** No diagnostics. |
| `npm test` (final) | Exit 0; **62 tests, 62 pass, 0 fail/cancelled/skipped/todo**. Includes all original validation tests and CLI preflight failure checks. |
| `npm run build`; `npm ls --depth=0` | Exit 0; compiled CLI/components emitted under ignored `dist/`; all 12 exact direct dependencies resolved. |
| Initial `npm run studio -- render --script examples/http-server.videoscript.json --output output/phase02/run-1` | Frames/video rendered but QC **failed**, exit **5**, stage `ffprobe`: macOS could not resolve bundled FFmpeg dylibs. No successful artifact claimed for this run; `run-1/render-error.json` retained. Adapter repaired by setting the packaged library directory for those subprocesses only. |
| OS policy test: `/usr/bin/sandbox-exec -p '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*"))' node ...` | A test socket to reserved documentation IP `203.0.113.1` was immediately denied with **EPERM**. Policy then used for both full renders. |
| Same OS policy + source CLI `node src/cli/index.ts render --script examples/http-server.videoscript.json --output output/phase02/render-a` | Exit 0. Child environment contained **only PATH**, with no DeepSeek/other API keys; external connections denied, loopback allowed for Remotion. **1650 frames**, all six source scenes. |
| Same OS policy + compiled CLI `node dist/cli/index.js render --script examples/http-server.videoscript.json --output output/phase02/render-b` | Exit 0 under the same empty-except-PATH environment and external-network denial. Second independent full render with identical input/tool/font/encoder conditions. |
| ffprobe `-count_frames -show_streams -show_format -of json` on both outputs | **1080×1920, 30/1 fps, 1650 decoded frames, 55.000 seconds, H.264, yuv420p, exactly one video stream and zero audio streams**. Both checks pass. |
| `npm run test:visual -- --baseline output/phase02/render-a --candidate output/phase02/render-b` (final) | Exit 0. **8 golden PNGs, 16 exact PNG comparisons, 1650 matching decoded YUV420p frame hashes**; **MP4 bytes identical**. PNG dimensions checked. Initial `framemd5` attempt failed because this bundled FFmpeg omits that muxer; the verifier now streams supported `image2pipe` rawvideo and hashes every fixed-size decoded frame, without writing raw movies to disk. |
| Image inspection; bundled FFmpeg extraction at video time **41 seconds** | Hook, request, parse, route, response, wrap, idle and overview frame evidence inspected. Encoded MP4 response frame also inspected: readable, correct upward return direction, literal HTML preview rendered as text, no label collisions/clipping. No physical-device/player acceptance claimed. |
| Final file/hash, Markdown/JSON, lockfile and ignore checks; `git status`; staged diff | **103 local links resolve**, all four fenced JSON examples and project JSON files parse. **17 existing files modified, 17 source/test files added**; fixture, AGENTS and CLAUDE byte-identical to HEAD. Generated media/goldens, dependencies and build output are ignored. Lockfile matches direct dependency pins, HEAD unchanged, staging empty. Evidence: `output/phase02/checks/scope.json`. |

Verification logs: ignored `output/phase02/checks/{typecheck,lint,test,build,visual}.log`. Unit/media verification uses local data only. Browsing/installation was setup; neither full render made an external connection. Browser/web-security checks were not disabled.

### Artifacts and reproducibility

- **Review video:** `output/phase02/render-b/video.mp4`; independent first output: `output/phase02/render-a/video.mp4`. Each is **849,710 bytes**, SHA-256 **`e1c704a43266c911da5c6e4622d05214495cafc39694f92694d65e84c8f2f3d8`**.
- Each output directory contains six source-scene PNGs, `gallery-idle.png`, `gallery-overview.png`, `gallery-inputs.json`, `ffprobe.json`, `render-manifest.json`, and `decoded-frame-sha256.json`. Render A also contains the initial agent-inspected `golden-manifest.json`; render B contains `verification.json`. Golden data/media are **local ignored artifacts**, not generated files added to Git or human release approvals.
- Additional QC frame: `output/phase02/encoded-response.png`. The earlier failed render report remains in `output/phase02/run-1/`. No stock/workplace assets were used.
- Recorded environment: **macOS 27.2 (26B123), arm64; Node 24.15.0; npm 11.12.1; Remotion 4.0.542; Chrome 157.0.8103.38; bundled FFmpeg/ffprobe n7.1**. Inter Latin WOFF2 SHA-256: `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62`. Original fixture SHA-256 remains `d1365e6aa09c7464cdded25fef21cbadc4fe78a2bdc60c12c41b2107d0298e37`.
- Reproducibility is observed for these pinned inputs on this machine, through source and compiled paths. Browser updates, OS/font fallback rasterization, Remotion/native encoder versions, CPU/GPU/platform differences or settings can change PNG/video bytes. Re-check tools and explicitly review new reference frames before defining another local baseline; no cross-platform bitwise guarantee or production cache/recovery is claimed.

### Acceptance and next human action

- **AC-01 passed:** actual playable/fully decoded silent portrait MP4, six expected scenes, dimensions/fps/frame count probed. **AC-02 passed locally:** bounds/collision checks plus inspected output show no overlapping labels in the chosen safe rectangle and distinct down-request/up-response lanes. **AC-03 passed:** the same registered component rendered four fixture phases plus idle/overview gallery inputs. **AC-04 passed:** both full renders succeeded with outbound networking denied and no provider environment variables.
- **UNVERIFIED / deferred:** physical phone/YouTube/Instagram overlay testing, full human playback/editorial/factual/rights approval, other browsers/OS/hardware, measured narration timing, Kokoro pronunciation, subtitles/audio, incremental scene caching/jobs, release approvals and publishing. This is an unapproved **silent estimate preview**, not the Phase 04 narrated milestone. Fonts are pinned locally; fallback glyph/OS behavior remains an environment limitation.
- **Next:** play the MP4 and review the PNGs on a phone, including request/response direction and UI clearances. Then explicitly request **Phase 03** if acceptable. Kokoro runtime/voice/weights remain unprovisioned; do not fetch them as part of Phase 02. No later phase was started.

## Phase 02 — Manual inspection rerun (2026-11-10)

- Read the Phase 02 prompt, package scripts, status and actual CLI/Remotion/visual/media code. Existing implementation and dependencies were sufficient; **no source fix or installation was needed**. Pre-existing Phase 02 working-tree changes were preserved.
- Executed `npm run studio -- render --script examples/http-server.videoscript.json --output output/phase02/manual-review-2026-11-10`, wrapped in the previously verified OS policy denying external networking and allowing loopback. The child environment contained PATH only, with no DeepSeek/provider keys. **Exit 0; no failures in this rerun.**
- **MP4 absolute path:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/phase02/manual-review-2026-11-10/video.mp4`.
- **PNG preview directory:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/phase02/manual-review-2026-11-10/previews/`. Six named PNGs: `01-opening.png` (2.967s), `02-http-request.png` (10.967s), `03-parsing.png` (20.967s), `04-routing.png` (30.367s), `05-response.png` (41.167s), `06-ending.png` (51.367s). These are byte-identical copies of this run's generated scene PNGs; `frames.json` records exact frame numbers/source names. Original scene PNGs and two gallery PNGs remain alongside the MP4.
- Re-probed the **final MP4 path** through the existing `probeSilentVideo()` adapter: ffprobe `-v error -count_frames -show_streams -show_format -of json` passed. Stream 0 is **video/H.264/yuv420p, 1080×1920, 30/1 fps, 1650 frames; format duration 55.000000 seconds; no audio stream**. Full probe result saved under this run's `checks/ffprobe.json`.
- Re-ran **`npm test`: 62/62 passed**, **`npm run typecheck`: exit 0, no diagnostics**, and **`npm run lint`: exit 0, 30 files clean**. `npm run test:visual -- --baseline output/phase02/render-a --candidate output/phase02/manual-review-2026-11-10` passed: 16 golden PNG comparisons and all 1650 decoded frames match the prior baseline; video bytes/SHA-256 are also identical. Logs are in this run's `checks/`; `verification.json` contains the visual/media comparison results. Request and ending PNGs were visually inspected again.
- Rerun from the project root with `npm run studio -- render --script examples/http-server.videoscript.json --output "output/phase02/review-$(date +%Y%m%d-%H%M%S)"`. A fresh directory is required each time; existing reviewed output is protected against overwrite. The CLI itself creates the scene PNGs in its output root; the convenience `previews/` copies above organize this manual-review handoff.
- Only this status log was edited during the rerun. All media/logs remain ignored local artifacts. No paid API, provider service, package/global installation, source/fixture change, commit/push or Phase 03 work occurred. Timing remains a saved-estimate silent preview. **Stop for the user's playback and phone review.**

## Phase 03 — Resumed local narration implementation (2026-11-10)

### Recovery audit and completed work

- The user explicitly requested recovery of the interrupted Phase 03 session. Initial `git status --short` showed the uncommitted Phase 02 implementation plus Phase 03 audio/config/tests/lock/worker files. Preserved all pre-existing work; no reset, staging, commit or push. README/architecture/status still described narration as planned even though real and mock smoke artifacts already existed under `output/phase03/`.
- Inspected required instructions, phase/references, actual code, diff, installed runtime and local assets. Existing `models/download-manifest.json` records earlier authorization/provenance; this resumed session did **not** download or install models, packages, global tools or Python. Prior-session command/approval history cannot be independently reconstructed from that manifest. Existing assets sufficed for the user-requested local smoke test.
- Retained and finished `src/audio/{types,provider,process-runner,lexicon,wav}.ts`, `src/audio/kokoro-worker.py`, `src/config/narration.ts` and `src/cli/audio-cli.ts`. `NarrationProvider` returns per-scene PCM16 mono 24 kHz WAVs, SHA-256, actual ffprobe duration/sample count and metadata identifying assets/runtime/settings/limits. Strict config rejects extra controls. The explicit mock is a deterministic test tone, never a silent fallback for failed speech.
- `audio doctor` checks local capabilities without speech generation. `audio smoke` selects one saved script scene; `audio narrate` processes all scenes sequentially. Real speech requires `--allow-local-synthesis`; existing output is protected. Failures identify the scene, keep error evidence/partial audio, and preserve completed scenes. No persistent recovery/cache, caption alignment or narrated video assembly is claimed.
- The worker receives narration as literal JSON stdin, with only fixed arguments and trusted config paths. Shell execution is disabled; environment is minimal, offline flags are set and ONNX telemetry disabled. It enforces wall timeout, combined process output, POSIX CPU/file-size limits, threads, text length and audio limits. No hard RAM cap or OS network isolation is claimed.
- Finished hash/readability diagnostics, tightened WAV byte-rate/chunk validation, corrected Python guidance to match the lock's Python 3.12 requirement, and added CLI/all-scene mock/preservation/changed-asset regressions. `requirements-audio.in`/`.lock` pin the local runtime; build packaging copies the Python worker next to compiled JS. Example configs identify model/voice paths and hashes without private paths or secrets.
- Found actual unseeded variation: the inherited smoke was **4.233333s**, while the first resumed run was **4.243333s** despite the same recorded v1 settings. Added required nonnegative `settings.seed`, seeded ONNX Runtime/NumPy before session construction and bumped real settings to **kokoro-http-v2**. Two fresh source/compiled runs with seed 0 now match byte-for-byte on this machine. Other environments remain unverified.
- `tech-en-v1` expands whole-word `HTTP` → `H T T P` and `URL` → `U R L`; server/request/response retain ordinary pronunciation. Original and spoken text hashes are recorded. No SSML or source-code evaluation occurs. Voice defaults to `af_heart`, English US, rate 1. The chosen int8 graph rejects fractional speed instead of silently rounding.

### Actual verification commands and outcomes

| Command/check | Observed result |
|---|---|
| Initial `npm run typecheck`; `npm run lint`; `npm test`; `npm run build` | All exit 0; initial inherited suite **77/77 passed**, lint 42 files. |
| `npm run format` after fixes/tests; then after seeding | Exit 0; first formatted two edited test files, final had no changes. |
| `node --test tests/audio/*.test.ts` | Exit 0; **20/20 pass** without model downloads or Python execution. Includes subprocess failures/timeouts/output caps, source text escaping, missing assets, invalid/empty audio, duration/sample validation and CLI/preservation cases. |
| Final `npm run typecheck`; `npm run lint`; `npm test`; `npm run build` | All exit 0; **82/82 tests passed**, no fail/skip; lint **43 files**, no fixes/diagnostics. Build copies the worker into `dist/audio/`. All earlier validation/visual unit tests pass. |
| `node dist/cli/index.js script validate --file examples/http-server.videoscript.json` | Exit 0; original six-scene fixture valid. |
| Source then compiled `audio doctor --config narration.config.example.json` | Exit 0; ffprobe/Python/model/voice hashes/runtime/voice ID all ready. |
| Compiled `audio doctor --config output/phase03/checks/missing-model.config.json` | Expected exit **3**, `MODEL_NOT_FOUND` with actionable local-file guidance; no fallback or download. Config deliberately points at a nonexistent local model. |
| Attempted `/usr/bin/sandbox-exec -p '(version 1)(allow default)(deny network*)' ...` for doctor and smoke | Both exit **71**, `sandbox_apply: Operation not permitted` before application launch in this restricted session. Continued with existing local assets under the execution environment's restrictions. **Independent OS-level network-denial proof is UNVERIFIED for Phase 03.** No security setting was changed. |
| `/usr/bin/env -i PATH="$PATH" node src/cli/index.ts audio smoke --config narration.config.example.json --script examples/http-server.videoscript.json --scene scene-02-request --output output/phase03/seeded-source --allow-local-synthesis` | Exit 0, actual local speech WAV. Child environment receives no provider keys. |
| Same command through `node dist/cli/index.js`, output `output/phase03/seeded-compiled` | Exit 0, actual speech via packaged worker; identical bytes/duration to source run after seeding. |
| Independent `probeWav`/PCM inspection and ffprobe `-v error -show_streams -show_format -of json` on both seeded outputs | Both pass: one **pcm_s16le, mono, 24000 Hz** audio stream; **101600 samples**, **4.233333s**, **203244 bytes**. PCM peak **10314/32768**, nonempty/non-silent and no full-scale samples. Hashes match. This establishes structural/signal validity, not intelligibility. |
| Final `git diff --check`, local Markdown links, source/fixture/ignore checks | Exit 0; checked local links resolve. Generated outputs, model assets, virtualenv and compiled worker remain ignored; AGENTS/CLAUDE/fixture byte-identical to HEAD; staging empty. Evidence: `output/phase03/checks/handoff.json`. |

Verification logs and structured command exits: `output/phase03/checks/{typecheck,lint,audio-tests,test,build,validate,doctor,missing-model}.log` and `commands.json`. Raw ffprobe reports: `seeded-source-ffprobe.json`, `seeded-compiled-ffprobe.json`; comparison/signal evidence: `audio-inspection.json`. All are ignored local artifacts. No API, OAuth, upload or later-phase operation ran.

### Review artifacts, acceptance and remaining limits

- **Listen to:** `output/phase03/seeded-compiled/scene-02-request/scene-02-request.wav`; source comparison in `output/phase03/seeded-source/scene-02-request/scene-02-request.wav`. Each output has per-scene `narration.json` and top-level `narration-manifest.json`, explicitly unapproved and non-mock. Both WAVs have SHA-256 **`d1429bfdd124d66a095c7f8370554ad0a910e4b794bb61066222b1fd2e3debd2`**.
- Preserved inherited `kokoro-smoke`/`mock-smoke` and first resumed unseeded `resumed-kokoro-smoke` evidence. Use the **seeded** artifacts for current review; their v2 settings record the reproducibility fix. No old artifact was overwritten.
- Verified runtime: **Node 24.15.0, npm 11.12.1, Python 3.12.13, kokoro-onnx 0.6.1, onnxruntime 1.31.1, numpy 2.5.4, espeakng-loader 0.2.4**, bundled ffprobe n7.1 on macOS arm64. Model SHA-256 **`ae315a79b623f244700e4afb9246c46a26066782e049ba174bf3ba433970ee9c`**, voice bundle SHA-256 **`bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`**. Weights/runtime are local; no subscription is used.
- **AC-01 observed pass:** actual saved HTTP request narration scene synthesized with installed local Kokoro. **AC-02 observed pass:** nonempty valid audio and ffprobe-measured duration; missing model fails actionably. **AC-03 observed pass:** model-free mock/CLI tests and recorded model/voice/settings identity. Phase remains **Needs review** pending human listening/pronunciation acceptance.
- **UNVERIFIED:** human intelligibility/pronunciation listening (including URL and all technical terms), physical playback acceptance, cross-platform/version reproducibility, fractional-rate alternate models, fresh environment installation and model/license redistribution clearance. The single real scene and all-scene mock tests do not prove real narration for every possible scene. Phase 02 MP4 was not rerendered because this phase changes only narration; its unit regressions passed. Measured video timeline, captions and muxing remain unimplemented.
- Documentation updated: README/execution entry, main/detailed architecture, video engine, quality guide, operations/setup, HTTP example, this status log and **ADR-011**. No VideoScript contract or durable agent convention changed; AGENTS/CLAUDE remain untouched.
- **Next human action:** play the current seeded WAV, review pronunciation and the Phase 03 diff. If accepted, explicitly request **Phase 04** for measured timeline/captions/assembly. Stop here; no later phase was started.

## Phase 03 — Four-voice listening comparison (2026-11-10)

- User requested separate 20–30-second technical WAVs for `af_heart`, `af_bella`, `am_michael` and `am_fenrir`, with no default narrator change. Generated the same original **68-word** passage about URL/HTTP requests, routing, responses, caching, timeouts and retries using the existing local `createNarrationProvider()` API. Each voice uses **rate 1, seed 0, en-us, tech-en-v1**, comparison settings version `voice-compare-v1`. No time stretching, padding, trimming or loudness normalization was applied.
- Final artifacts: `output/phase03/voice-comparison-final-QjEiZm/{voice-id}/{voice-id}.wav`. Actual ffprobe durations: **af_heart 24.968s; af_bella 25.332s; am_michael 27.214667s; am_fenrir 20.154625s**. All four pass the provider's PCM16 mono 24 kHz validation, non-silent sample checks and ffprobe/sample-count duration agreement; all are within the requested interval.
- The output directory also contains `narration.txt`, normalized `spoken-text.txt`, a linked `README.md`, per-voice `narration.json`, combined `comparison.json` with artifact hashes/runtime identity, and `verification.json`. The default config's before/after SHA-256 is identical, and its narrator remains **af_heart**. Voice overrides exist only in generated comparison metadata/in-memory config; the default settings file was not edited.
- First attempt used a common 63-word passage: Fenrir finished in **19.486s**, below the requested minimum. Preserved that attempt in ignored `output/phase03/voice-comparison-ZMGZLb/`, then extended the shared text by five words and regenerated **all four** in the final directory. The first attempt correctly failed the requested-duration check; the final attempt passed.
- Commands: two local `node --input-type=module` synthesis invocations using the existing provider and installed models; final range/default-config verification passed. No source code or architecture changed, so unit tests/typecheck/lint/build were **not rerun** for this artifact-only comparison. No download, paid API, upload, narrator selection or later-phase implementation occurred. Next action is the user's listening comparison and voice choice; naturalness/pronunciation acceptance remains unverified until that review.

## Phase 03 — Reported noise and experimental cleanup (2026-11-10)

- User listening feedback: the four voices lack clarity/crispness and appear noisy. **Audio quality acceptance remains unresolved** despite passing format/duration tests; those checks do not measure intelligibility or naturalness.
- Inspected the worker/config and measured all four original comparison WAVs using Python/NumPy. No clipped samples; mean waveform offsets were **af_heart +0.02013, af_bella +0.02186, am_michael +0.01848, am_fenrir +0.02523** on a normalized full-scale range. These establish a consistent positive DC bias, not its audible cause. Full signal measurements are saved in `output/phase03/voice-comparison-final-QjEiZm/signal-diagnostics.json`. No listening ability or confirmed denoising result is claimed.
- Created **experimental comparison copies** in `output/phase03/voice-comparison-dc-cleaned/{voice-id}.wav` using a 60 Hz second-order Butterworth high-pass and constant gain per file (active-frame RMS target -20 dBFS, capped at sample peak -3 dBFS). This removes DC/low-frequency rumble and adjusts level; it is **not** noise reduction or proof that model artifacts are fixed. No time stretching, trimming, resampling or voice replacement. DC magnitude after processing is below `3e-8`; zero clipped samples. Existing originals were preserved.
- All four cleaned files passed `probeWav()`/PCM checks and actual ffprobe measurement, preserving exact source sample counts and durations (**24.968, 25.332, 27.214667, 20.154625 seconds**). Processing settings, source/output hashes, signal metrics and fixed gains are in `processing-manifest.json`; `verification.json` records the media checks. Default config SHA-256 was checked before/after and remains unchanged; **af_heart** is still the default. Only local generated artifacts and this status entry changed; no production filter or source code change was made, so source tests/typecheck/build were not rerun.
- Consulted primary upstream Kokoro release documentation: `https://github.com/thewh1teagle/kokoro-onnx/releases` lists a roughly **326 MB full-precision kokoro-v1.0.onnx**, versus the installed INT8 variant. Quantization is a possible artifact contributor, **not a confirmed cause**. A same-text/same-voice full-precision comparison would isolate model precision more directly than filtering. It requires a new large-model download, so it has **not** been run without explicit user authorization. No package/model downloads or paid calls occurred. Next: compare the experimental copies; obtain explicit approval before downloading the upstream full-precision model and regenerating all four without changing the default narrator.

## Phase 04 — Measured narrated HTTP preview (2026-11-10)

### Scope, implemented components and decisions

- User explicitly advanced to Phase 04 while Phase 03 listening acceptance remained unresolved. Read the required instructions, current architecture/status, Phase 04 prompt and referenced contracts/video/workflow/test/HTTP/roadmap/phase-map docs, actual code and Git diff. The working tree already contained the uncommitted Phase 02/03 implementation. Preserved that work; no staging, commit, push, dependency installation, model download, provider/API call, OAuth, upload or later-phase implementation occurred. The earlier full-precision download question remains **unapproved**.
- Added `src/timing/timeline.ts`: strict reviewed-alignment/presentation/caption schemas, integer-frame timeline, SRT, exact phrase-anchor resolution, measured bounds/ambiguity diagnostics and preview fallback. Scene duration is **ceil(max(audioSamples / 800, authored min_seconds × 30))**, at least two frames; starts sum integer durations. Preferred estimates are ignored. Speech exceeding the authored maximum fails; no speech trimming/time stretching. End padding contains only fractional-frame slack plus authored minimum holds. Manifest cue windows use integer local frames; authored progress cues retain their scene-relative meaning.
- Added `src/media/{pcm,error,qc,pipeline}.ts`: strict saved narration/text/WAV identity, byte/total-duration limits before audio loading, independent per-scene ffprobe measurement, DC-insensitive activity/clipping checks, exact PCM padding/concatenation, bounded FFmpeg AAC mux, final stream/frame probing and independent AAC decode/per-scene checks. `video.partial.mp4` becomes `video.mp4` only after QC. Failure reports retain stage, scene and affected-scene IDs plus partial evidence; good narration copies are preserved. Existing output directories are never overwritten.
- Added `src/render-manifest/manifest.ts`: strict Phase 03 artifact schema and source/compiled implementation inventory. Final manifests record exact audio samples/starts/holds/padding/cue frames, original script/source records, actual narration/model/runtime/settings identity, media/font/tool hashes and implementation-file SHA-256s. Unknown fixture source revisions/content hashes remain unknown; no research or fact approval is inferred.
- Added `src/cli/narrated-cli.ts` and `render --narration <saved-directory>`, optional `--alignment`, `--allow-caption-fallback` and `--strict`. The render-only path never imports/starts a narration or LLM provider; it consumes already-saved WAVs. Missing or empty narration paths cannot silently select narrated operation. Omitting the narration option retains the Phase 02 silent path. CLI help/README document the two-step narration → render and saved-artifact replay.
- Extended the existing Remotion `Composition.tsx`, `entry.tsx`, `render.ts`, theme and `BrowserRequestFlow.tsx` for a validated measured presentation and reserved caption band. Final captions use **42 px bold, up to three 34-character lines**, sharing the same intervals/line breaks as SRT. Captions participate in per-frame font/bounds/collision checks. Narrated flow details become a compact line above captions; silent layout remains unchanged. No arbitrary component/code execution or new visual asset source is added.
- The selected fallback is **scene-speech-span-v1**, explicitly selected by `--allow-caption-fallback`. The full original scene narration is displayed over DC-insensitive 20 ms RMS-detected activity, not guessed word positions or equal-duration chapters. It is marked **requiresTimingReview=true**. Reviewed word timings are bound to exact original-text/WAV hashes, cover all tokens and support real phrase-cue resolution/grouped captions; none were fabricated for the actual preview. Overrides remain unreviewed. `--strict` rejects mock tones and unreviewed timing before rendering. All output still has **approvedForRelease=false**; Phase 08 human approval gates are not implemented here.
- Small supporting changes: export the existing settings schema for artifact validation; permit structural parsing of a silent *decoded final* WAV only long enough for scene-level QC to name/reject the silent scene (ordinary narration validation still rejects silence); add integration tests to `npm test`. No dependency versions/lockfile changes were needed in this phase.
- The prior user-reported noise/clarity issue is **not resolved or concealed**. The preview uses the installed INT8 model and unchanged **af_heart** default, with no automatic filtering, voice replacement or new model. All six scenes' DC-bias flags are in QC; human voice/pronunciation approval remains a blocker. No quality claim follows from valid PCM or detectable audio activity.

### Actual verification commands and outcomes

| Command/check | Observed result |
|---|---|
| Initial Git/source/doc inspection | Pre-existing Phase 02/03 modifications preserved; original fixture and agent instructions unchanged. |
| `npm run format`, incremental `npm run typecheck`/targeted tests | Corrected initial erasable-TypeScript constructor/type errors. Initial synthetic integration test exposed the bundled FFmpeg's omitted `color` source; switched the explicit test adapter to an authored PNG, retaining real FFmpeg encoding/mux/decode. No extra/global FFmpeg installation. |
| Final `npm run typecheck`; `npm run lint`; `npm test`; `npm run build` | All exit **0**; zero TypeScript diagnostics; **52 files** clean in lint; **92/92 tests pass**, zero fail/skip. Build packages the worker as before. Logs in `output/phase04/checks/`. |
| `node --import ./tests/helpers/no-network.ts --test tests/integration/media.test.ts tests/integration/timing.test.ts` | Exit 0, **10/10 pass** with Node networking blocked. Tests use mock PCM and real bundled FFmpeg/ffprobe, not Python, weights or a browser. |
| Deliberate bad caption timing, silent/DC-only/clipped samples, muted final AAC, stale/missing/ambiguous word alignment, wrong final streams/geometry/frame count/duration, FFmpeg/ffprobe failures | Negative tests pass. Muted final AAC fails **SILENT_AUDIO** for `scene-01-hook` and never finalizes `video.mp4`. Caption bounds use measured WAV duration, not only saved estimates. |
| Compiled CLI: strict fallback preview; override ending at 7000 ms on the 3.234667s hook; phrase trigger without reviewed alignment | Expected exit **5** respectively: **REVIEW_REQUIRED**, **CAPTION_RANGE / scene-01-hook**, **CUE_ALIGNMENT_REQUIRED / scene-02-request**. All three retain diagnostics without finalized video. Commands/results in `checks/negative-cli.json` and corresponding logs. |
| `node src/cli/index.ts audio narrate --config narration.config.example.json --script examples/http-server.videoscript.json --output output/phase04/http-narration --allow-local-synthesis` | Exit 0; synthesized all **six real local scenes** with existing assets. ffprobe durations: 3.234667, 4.233333, 5.006667, 3.021333, 5.014000 and 5.823292 seconds. Saved WAVs/metadata retained. |
| First source CLI narrated render, output `http-preview-a` | Measured inputs/planning succeeded; exit **5**, browser stage: sandbox prevented Chrome launch. Error preserved; no successful preview claimed for this directory. |
| Compiled CLI with installed Chrome outside the execution sandbox and an environment containing PATH only, output `http-preview-b` | Exit 0; actual 1113-frame H.264/AAC movie, first 34px caption version. No provider-key environment. |
| Same saved fixture/WAVs, compiled CLI under OS outbound-network denial allowing only loopback, output `http-preview-offline` | Exit 0; video SHA-256 **fdb692b06a8c2b71a80c32b797c49ee6544830c79ce5b8f8ce59ccca72c6b7ed** matches `http-preview-b`. Replay performed no synthesis or DeepSeek call. |
| Caption enlargement and final compiled render under the same external-network denial, outputs `http-preview-final` then **`http-preview-delivery`** | Both exit 0. Final build includes input byte/duration bounds and empty-path guards. The two **42px** movies match byte-for-byte: SHA-256 **fd4cc3e18a1aca0345fcf763d48aff975b50f3f8b8e3511f7b2089d3bb8b35bc**. Old attempts preserved. |
| Final ffprobe `-count_frames -show_streams -show_format -of json`, then FFmpeg AAC → PCM and per-scene signal checks | Pass: **1080×1920, 30 fps, H.264/yuv420p + mono 24kHz AAC, exactly 2 streams, 1113 decoded video frames, 37.1 seconds**. All six decoded narration spans have activity and no near-full-scale samples. Duration tolerance: one video frame plus one AAC packet, **0.076s**. Detailed reports retained. |
| OS-network-restricted compiled silent render to `output/phase04/silent-regression`; `npm run test:visual -- --baseline output/phase02/render-a --candidate output/phase04/silent-regression` | Both exit 0. Prior Phase 02 preserved: **8 golden PNGs / 16 comparisons**, all **1650 decoded YUV frames** match, **MP4 bytes identical** at 55 seconds. SHA-256 remains **e1c704a43266c911da5c6e4622d05214495cafc39694f92694d65e84c8f2f3d8**. Log: `checks/silent-visual-regression.log`. |
| Rendered frame/encoded video inspection | Inspected hook, request, response and wrap frames, then extracted the encoded response at **25s**. Captions visible, separate from diagram/detail text, literal body preview intact and upward response lane clear. All frames also passed browser label bounds/collision checks. Physical phone listening/playback remains unverified. |
| `git diff --check`, saved artifact/implementation hashes, original fixture/instructions/default config/staging checks | Pass; **127 implementation files**, six narration hashes, six captioned PNG hashes and all listed root artifact hashes match the delivery manifest. Default config is byte-identical to the earlier voice comparison baseline; `af_heart` remains default. AGENTS/CLAUDE/fixture match HEAD; staging empty. Evidence: `checks/handoff.json`. |

The network-restricted full renders used `/usr/bin/sandbox-exec -p '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*"))' /usr/bin/env -i PATH="$PATH" node dist/cli/index.js render --script examples/http-server.videoscript.json --narration output/phase04/http-narration --output <fresh-directory> --allow-caption-fallback`. Browser launch required the execution tool's reviewed sandbox escalation; browser web security/certificate checks were not disabled. No publishing or source fetch was part of any render.

Final check logs: `output/phase04/checks/{typecheck,lint,test,build,integration-offline,silent-visual-regression}.log` and `commands.json`. Negative CLI logs, `media-summary.json`, encoded frame and `handoff.json` are alongside them. Final local-link verification checked **40 Markdown links**, all resolve; final `git diff --check` passes.

### Exact timeline and review deliverables

| Scene | Start frame | Frames | Audio samples | Full hold frames | End padding samples |
|---|---:|---:|---:|---:|---:|
| Hook | 0 | 98 | 77632 | 0 | 768 |
| Request | 98 | 210 | 101600 | 83 | 66400 |
| Parse | 308 | 210 | 120160 | 59 | 47840 |
| Route | 518 | 180 | 72512 | 89 | 71488 |
| Response | 698 | 240 | 120336 | 89 | 71664 |
| Wrap | 938 | 175 | 139759 | 0 | 241 |

Measured narration totals **26.333292s**; padding/holds total **10.766708s**, exactly **37.1s** at the output sample/frame boundaries. These are the fixture's authored minimum holds plus fractional-frame slack, not missing scenes or synthesized silent substitutes. Captions end with each detected speech span; the hold is intentionally caption-free. Review pacing before changing the fixture or voice settings.

- **Preview:** `output/phase04/http-preview-delivery/video.mp4`.
- **Captions/timeline:** sibling `captions.srt` and `timeline.json`.
- **QC/review checklist:** sibling `qc-report.json`; independent raw probe in `ffprobe.json`; decoded AAC evidence in `decoded-audio.wav`.
- **Manifest:** sibling `render-manifest.json`, SHA-256 **a597688f16dfc0988e03ad10d3c2e796eac97c4d3dcaff79a1f47a7fc58561ea**. Video hash as above. Captioned scene PNGs and silent visual intermediate live in sibling `visuals/`; copied narration in `narration/`. All are ignored local outputs.
- Environment: Node **24.15.0**, npm **11.12.1**, Remotion **4.0.542**, installed Chrome **157.0.8103.38**, bundled FFmpeg/ffprobe **n7.1**, macOS arm64; narration retains the Phase 03 model/runtime/settings identity. No new installation or model assets.
- **AC-01 observed:** actual narrated MP4, SRT and exact measured timeline/manifest. **AC-02 automated/frame evidence:** six complete rendered/measured scenes, bounded captions and no silent final narration segments; exact caption sync/physical phone readability remain pending human acceptance. **AC-03 observed:** saved-artifact rerenders under OS external-network denial with no provider keys; byte identity under recorded conditions. **AC-04 observed:** typed per-scene input/timing errors and global media-stage errors with affected-scene lists, including deliberate muted AAC and bad timing. These establish an unapproved review preview, not a release-ready milestone.
- **UNVERIFIED / remaining:** full human listening and phone/player playback, resolution of reported voice noise/DC bias, acceptance of coarse scene-span captions, actual production word-alignment input/phrase playback (only synthetic contract tests so far), alternate OS/browser/runtime behavior, source/fact/rights clearance and any release/publication approval. No automatic aligner or full-precision model was downloaded; those need separate decisions/authorization as appropriate.
- Docs updated only for actual behavior/interfaces: README/execution flow, main/detailed architecture, contracts, video engine, workflow, testing, operations, HTTP example and **ADR-012**. AGENTS/CLAUDE unchanged.
- **Next human action:** play the delivery MP4 with its QC checklist on a phone; review pronunciation/noise, caption onset/offset, minimum holds and visual direction. The phase is **Needs review**, and the default voice stays unchanged. Address that review before explicitly requesting **Phase 05** (safe source ingestion/claims). Stop here; no later phase has begun.

## Phase 04 — Fresh full-pipeline fixture run and single rerun command (2026-11-10)

- User confirmed Phase 04 complete and requested a new complete local run from the existing HTTP fixture. Inspected actual package scripts, CLI parsers, narration config, producer, FFmpeg/QC and repository state. Baseline was clean at committed/pushed **b32efce**. The pipeline already supported every media stage but required separate narration/render commands; added only `scripts/render-http-fixture.mjs`, the **`npm run render:http`** package script and README instructions to provide one repeatable command. No renderer, timing policy, fixture, default narrator, model or architecture boundary changed.
- The runner invokes the existing `audio narrate` command with explicit local synthesis and then `render --narration ... --allow-caption-fallback`. Each call creates a new ignored `output/http-full-<suffix>/` containing original per-scene WAVs in `narration/` and complete movie/SRT/QC artifacts in `render/`. `full-run.json` records exact commands, exits, fixture/config/runner SHA-256s and paths; errors retain partial outputs. Child environments contain PATH only. This is an offline local render operation, with no model/package download, paid API, OAuth or publishing. The runner selects the existing flagged scene speech-span fallback; it does not fabricate word alignment or grant release approval.
- **Actual full command:** `npm run render:http`, executed under the prior OS policy denying outbound networking except localhost, with the existing Chrome launched through the execution tool's reviewed sandbox escalation. **Exit 0**; both recorded child stages exit 0. Kokoro freshly synthesized all six scenes; Remotion rendered **1113 frames**, FFmpeg assembled H.264/AAC and existing QC independently decoded/checked each scene. No old narration was substituted. Default settings are unchanged: **af_heart / kokoro-http-v2 / en-us / rate 1 / seed 0 / tech-en-v1**. Config hash remains identical before/after the run.
- **Fresh run directory:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/http-full-YVbn8d/`.
- **MP4:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/http-full-YVbn8d/render/video.mp4`. SHA-256 **fd4cc3e18a1aca0345fcf763d48aff975b50f3f8b8e3511f7b2089d3bb8b35bc**, matching the earlier seeded 42px preview.
- **SRT:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/http-full-YVbn8d/render/captions.srt`.
- **Original six scene WAVs:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/http-full-YVbn8d/narration/<scene-id>/<scene-id>.wav`, with metadata and a narration manifest. The producer also preserves its copied WAVs under `render/narration/` plus padded `render/narration.wav` and independently decoded `render/decoded-audio.wav`.
- Independently re-probed the **final MP4 path** with ffprobe `-v error -count_frames -show_streams -show_format -of json`: exactly **one H.264/yuv420p video and one AAC audio stream**, **1080×1920, 30/1 FPS, 1113 video frames, 37.1s**; audio is **mono 24kHz AAC**. Video and audio **start_time=0.000000**; both stream durations are **37.100000s**, so start and end differences are **0 seconds**. Raw results: `independent-ffprobe.json` in the run root; pipeline QC/manifest remain in `render/`.
- Additional content synchronization check: `verify-sync.py` in the ignored run root compares every freshly synthesized scene WAV against the corresponding decoded AAC segment, searching ±100ms using FFT cross-correlation. **All six peak lags are 0 samples / 0ms**; normalized correlations **0.999911–0.999954**. Verified all six SRT texts/intervals against the actual overlay timeline and video duration. Caption onset/end difference against detected decoded speech activity is at most **46.667ms** (within one frame plus the 20ms detection window). Report: `synchronization-report.json`. This verifies scene-level placement/encoding; it does **not** establish word-level phonetic accuracy or perceived voice quality.
- Created **six previews extracted from the combined encoded MP4**, not only browser source stills: `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/http-full-YVbn8d/previews/`. `frames.json` records their exact frame numbers/times. Inspected hook, request, parse, route, response and wrap previews: full 42px caption text is visible without clipping/diagram overlap. Existing browser checks also verified all rendered frame label bounds/collisions. No physical phone or human listening acceptance is inferred.
- Verification after the small runner addition: **`npm run format` exit 0**, **`npm run typecheck` exit 0**, **`npm run lint` exit 0 (53 files clean)**, **`npm test` 92/92 pass**, **`npm run build` exit 0**. The full real-media run exercises the orchestration directly; no implementation-mirroring unit test was added. No dependencies were installed. Default config and original fixture remain unchanged.
- **UNVERIFIED / unchanged limitations:** human intelligibility/noise and physical playback review; word-level subtitle/phrase alignment. The saved output clearly retains `requiresTimingReview=true` and `approvedForRelease=false`. Earlier reported INT8 voice clarity/DC issues were not silently filtered, resolved or replaced. No Phase 05 work, Git commit or push was performed in this run. This log records technical phase completion per the user's instruction, separately from human release/publication approval.

## Phase 04 — Caption clearance and non-obstructing layout (2026-11-10)

- User confirmed audio is audible in the browser/chat preview and requested captions that do not obstruct the animation. Preserved the existing full-run helper/documentation work and original `http-full-7WfO93` artifacts. No audio codec/volume/voice change was made, and no new synthesis, download, provider call or publishing ran.
- Updated narrated layout to **separate-caption-band-v2**. The 42px caption text retains its size but is vertically centered in a padded, borderless lower band at **y=1372–1524**. Narrated title-card summaries reflow upward; the server group lifts **70px**, its packet/arrow endpoints follow, and compact details/disclaimer sit above the captions. Diagram text is not scaled down. Silent rendering retains its original geometry.
- Added a browser check on full scene graphics bounds, requiring **at least 48px** above the caption band whenever a caption is active, alongside the existing per-frame label bounds/collision checks. Added a meaningful motion regression covering request/response direction and clearance from the raised server over all 301 test frames. The caption layout version is recorded in the visual manifest.
- Changed `src/renderers/remotion/{Composition,theme,render}.tsx/.ts`, `src/visuals/{BrowserRequestFlow,flow-state}.tsx/.ts`, `tests/visual/animation.test.ts`, README caption guidance and the layout detail in `docs/03-contracts.md`. No VideoScript/domain contract or main architecture boundary changed. Existing fixture/default config stay unchanged. Future `npm run render:http` runs automatically use this layout.
- Verification: `npm run format`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all exit **0**; final suite **93/93 tests pass**, zero fail/skip; lint **53 files**, clean. Reused the user's saved WAVs with compiled `render --script examples/http-server.videoscript.json --narration output/http-full-7WfO93/narration --output output/captions-clear-pjqbbfuq/render --allow-caption-fallback`, under the existing outbound-network-denial policy/installed Chrome. Exit **0**; all frame clearance checks passed.
- **Revised complete MP4:** `/Users/angshumansarmah/Projects/Brainstorming/tech-explainer-video-generator/tech-explainer-studio 2/output/captions-clear-pjqbbfuq/render/video.mp4`. SHA-256 **d96fd5da2e467c4b39060054a875bd107a79273f5101050eac29c48d9261eea0**. Independent ffprobe confirms **1080×1920@30, H.264/yuv420p + mono 24kHz AAC, 2 streams, 1113 frames, 37.1 seconds**; final decoded per-scene audio QC passes. SRT, padded narration WAV and decoded AAC WAV are each **byte-identical** to the user's original run, so this is a visual layout change only.
- Created six encoded MP4 frame previews in `output/captions-clear-pjqbbfuq/previews/`, with exact frame/time mapping. Inspected request/wrap source stills plus hook/parse/response encoded previews: caption text has visible padding and no diagram/card obstruction or clipping. `verification.json`, independent probe JSON, original-style QC report and versioned render manifest are preserved in the new directory. A full silent golden-video rerender was not repeated for this conditional narrated layout; existing silent behavior tests pass.
- Original movie/SRT/WAVs remain intact. Human phone/platform-overlay and final release approval remain separate; caption timing retains the existing explicit scene-span review flag. No later phase, commit or push was started.

## Documentation update policy

- Update **this file after every phase**.
- Update `ARCHITECTURE.md` and the detailed design docs **only when the actual architecture changes**.
- Update `AGENTS.md` or `CLAUDE.md` only when there is a durable rule that future agents need to follow.
- Do not overwrite proposed diagrams with implementation claims until they have been tested.


## Phase 05 — Bounded public sources and manual claim review (2026-11-10)

### Observed scope and result

Implemented and verified against original synthetic local fixtures. **Needs review**, with live public HTTP retrieval **UNVERIFIED**: the user explicitly selected “Use mock fixtures only; skip the live fetch.” No live document, linked tutorial, private repository, Jira, token, paid model, OAuth flow or publisher was accessed. No global install, model download, commit or push ran. Phase 06 is not started. The pre-existing Phase 04 caption-layout/full-runner changes were preserved; no audio/default-voice settings or fixture content changed in this phase.

### Files and behavior

- New `src/sources/policy.ts`, `transport.ts`, `safety.ts`, `snapshot.ts`, `ingest.ts`: one explicitly confirmed public URL; strict HTTP(S)/default-port/credential-and-query-free policy; conservative private/special IP and hostname filtering; all-answer DNS validation, pinned lookup/peer check, fresh unauthenticated connections, native TLS verification; bounded approved-host redirects with no downgrade; total deadline and streaming/declared byte bounds; identity-encoded UTF-8 text only.
- Minimal strict snapshots: canonical/requested URL, origin/retrieval date, raw-body SHA-256/bytes/type, public IP, redirect trail, exact URL commit where available, hashed ETag/valid Last-Modified, unverified license mentions and ≤1200-character excerpt. No raw page/archive stored. Known injection/command/secret/hidden-control patterns quarantine the entire document with no excerpt. Every snapshot stays untrusted/context-blocked; reuse permission is never inferred.
- New `src/claims/ledger.ts`: strict drafts start `needs_review`; all five statuses supported. Missing sources remain flagged. Supported reviews require exact quoted evidence from every cited clean snapshot; illustrative claims require explicit reviewer action. A separate local fact approval binds ledger revision, snapshots and review/approval metadata. Stale/unresolved claims block context export. Context is inert reference JSON with no tool permissions; no model consumes it here.
- New `src/cli/evidence-cli.ts`, updated lazy dispatch/help in `src/cli/run.ts`, source-test glob in `package.json`: explicit ingestion plus JSON init/review/approve/check/context workflow, bounded JSON inputs, new-file-only writes and safe errors. Source commands do not run during script validation or rendering. Existing VideoScript v1 is unchanged.
- New `tests/sources/{helpers,ingest.test,transport.test,claims.test,cli.test}.ts` and three authored fixture documents. No downloaded documents/code/media were incorporated.
- Updated README, both architecture entry points, contracts, Director/security/evaluation references and ADR-013 to distinguish implemented behavior, limitations and planned provider/release integration. AGENTS.md and CLAUDE.md were not changed.

### Commands executed and actual results

| Command/check | Observed outcome |
|---|---|
| `git status --short`, inspected current diff/phase/docs/CLI | Existing Phase 04 dirty work identified and preserved; no Git mutations |
| `npm run format` | Initial fixture HTML language attribute/style issues corrected; final pass checks 68 files with no outstanding changes/errors |
| `npm run typecheck` | Initial test Buffer generic annotation corrected; final PASS |
| `npm run lint` | PASS; 68 files checked |
| `node --import ./tests/helpers/no-network.ts --test tests/sources/*.test.ts` | Initial 26/28 pass exposed a schema key-order/hash mismatch; fixed canonical evidence hashing and bound approval metadata. Final **32/32 pass**, 0 skipped, with real network denied |
| `npm test` | **125/125 pass**, 0 skipped, including all 93 pre-existing tests and the FFmpeg/mock-narration integration |
| `npm run build` | PASS; compiled CLI and packaged audio worker produced locally |
| `node --import ./tests/helpers/no-network.ts dist/cli/index.js script validate --file examples/http-server.videoscript.json` | PASS; valid six-scene original fixture |
| `node --import ./tests/helpers/no-network.ts dist/cli/index.js source --help` | PASS; compiled evidence CLI help |
| `node --import ./tests/helpers/no-network.ts output/phase05/create-fixture-evidence.mjs` | PASS; mock clean/quarantine snapshots and unreviewed JSON ledger persisted, no real network permitted |
| Compiled `claims check --ledger output/phase05/fixture-Wby1k5/ledger-unreviewed.json` under network denial | Expected `needs_review` / exit 4; no fact approval |
| Local evidence-report hash audit; `git diff --check` | All six artifact SHA-256 values match; diff whitespace check PASS |

The tests exercise obfuscated/local IP URLs, private/special IPv4/IPv6, mixed DNS answers, address pinning/peer mismatch, redirects including approved-host private DNS, streamed/declared size, truncation/compression/UTF-8/MIME errors, stalled DNS/body deadline, encoded/Unicode injection, synthetic secrets, schema overrides, exact quote/missing-source failures, manual statuses, stale hashes, CLI protected revisions and network-independent validation. This is application-boundary verification, not an LLM jailbreak or complete secret-detection proof.

### Local artifacts and manual review

Ignored evidence root: `output/phase05/`. Logs: `source-tests.log`, `tests.log`, `typecheck.log`, `lint.log`, `build.log`, `fixture-run.log`. The local fixture driver is `create-fixture-evidence.mjs` (run under the network-denying preload; each invocation creates a new directory).

Observed fixture bundle: `output/phase05/fixture-Wby1k5/`:

- `clean/snapshot.json`: clean minimized original test reference.
- `quarantine/snapshot.json`: malicious fixture hash/provenance only; no unsafe excerpt or synthetic credential retained.
- `draft.json`, `ledger-unreviewed.json`, `decision-template.json`: manual-review starter; deliberately **needs_review**, not human fact approval.
- `README.txt`, `evidence-report.json`: synthetic-only labeling, derived gate state and exact file SHA-256 values.

No new media render is needed for this source-only phase; media regression tests pass, and prior narrated MP4/WAV/SRT artifacts remain unchanged.

### Limits, blockers and recommendation

- Live HTTP/DNS/TLS/site compatibility is **UNVERIFIED** by user choice. Mock native streams verify transport limits without opening sockets. A future explicit live request may encounter unsupported compression, login/anti-bot responses or conservative URL/address rejection; never silently bypass these policies.
- Pattern screening is heuristic and can both miss novel attacks/secrets and quarantine legitimate code examples. All text remains untrusted. Human review must check context, technical scope and freshness; excerpt matching alone does not prove a claim.
- Hashes are integrity/staleness checks, not authenticated signatures; local reviewer names are assertions. License mentions do not establish reuse rights. Phase 08 release/rights approval remains separate. No source/claim linkage is yet enforced by VideoScript rendering; that integration belongs to later approved work.
- The OS DNS operation may outlive the deadline, but cannot trigger a later request. No network sandbox, broad crawler, model adapter, job database or publishing work was added.
- Next human action: inspect the Phase 05 diff, clean/quarantined snapshots and unreviewed ledger; use README's explicit JSON review workflow if desired. Accept the mock-only evidence scope or separately authorize a live public-document check. Recommend Phase 06 only after review and a new request. **Stop after Phase 05.**


### Phase 05 extension — Multiple research sources per video (2026-11-10)

**Observed status: Needs review.** Extended the existing Phase 05 implementation after inspecting the working tree, CLI, source/claim contracts and current tests. No fetcher rewrite, later phase, dependency installation or live source request. The user's mock-only verification preference still applies. All pre-existing Phase 04/05 working changes remain intact.

**Implemented changes:**

- New `src/sources/bundle.ts`: strict research input/output contracts; separate `instructions` for topic, target audience, emphasized/excluded concepts; individually confirmed URL/GitHub/pasted-text inputs; optional literal selected sections and unverified per-input license notes. All declared approvals/URL policies validate before I/O.
- New `src/sources/research-source.ts`: typed 1.1.0 sources with explicit source kind, independent content hash/timestamp, original/canonical URL when applicable, selected sections and provenance. Original request URLs omit fragments; pasted notes have null URL/IP/revision rather than fabricated remote provenance. Existing GitHub exact URL commits, hashed HTTP validators and unverified license signals are retained. Pasted text receives the same screening/quarantine/minimization policy; quarantined sources retain neither excerpt nor selected-section text.
- Updated `src/sources/ingest.ts` only to accept literal section lists, share license-signal extraction and honor an outer abort signal. Updated `transport.ts` with bounded streamed-byte accounting callback; all earlier SSRF/DNS/IP/TLS/redirect controls remain in force.
- Bundle limits: default 20 input entries / 4 MiB consumed document and pasted UTF-8 bytes / 30-second total ingestion deadline / 60 HTTP requests including redirects; hard ceilings 50 / 8 MiB / 120 seconds / 300 requests. Existing per-source 512 KiB / 10-second / three-redirect defaults remain; per-entry limits can only narrow bundle per-source caps. Any source/budget failure stops later work; no completed bundle is persisted. Errors identify the safe input ID for source policy failures.
- Deduplication uses canonical URL or exact pasted-byte hash plus selections, redirect approvals and effective limits; it never merges allowlists or broadens permissions. Different sections/policies may fetch separately. Redirect-convergent snapshots share a source ID while every original input mapping/title/license note remains in `assignments`; actual consumed bytes/requests remain charged. Matching content at unrelated URLs is not treated as interchangeable provenance.
- Updated `src/claims/ledger.ts`: existing multiple-claim/multiple-source support reused, with `createLedgerFromBundle`; new 1.1.0 ledger/context binds bundle ID/hash and the editorial brief. Original 1.0.0 snapshot schemas/digests and ledger approval behavior remain compatible. Explicit `CLAIM_CONTRADICTED`, `CLAIM_INSUFFICIENT`, `CLAIM_UNSUPPORTED` and missing-source issues block approval. Semantic contradiction discovery remains human review; no text pattern is treated as a factual decision.
- Updated CLI dispatch/evidence CLI: `research ingest --file <input.json> --output <new-directory>` writes `research-bundle.json`; `claims init --bundle <bundle.json> --claims <draft.json> --output <new-ledger.json>` initializes all claims unreviewed. It cannot combine `--bundle` with independent `--source` files. Existing single-URL/repeated-source commands and protected revision writes are preserved. The JSON input cap remains 2 MiB.
- New `tests/sources/bundle.test.ts` and authored `fixtures/research-bundle.json`; extended native stream tests. README, both architecture references, contracts, Director/security/evaluation references and ADR-013 updated for actual interface changes. No AGENTS.md/CLAUDE.md changes. No DeepSeek, autonomous research, dashboard, recursive repository traversal or publisher.

**Commands and actual outcomes:**

| Verification | Observed result |
|---|---|
| `npm run format` | PASS; 72 files checked |
| `npm run typecheck` / `npm run lint` | PASS |
| `node --import ./tests/helpers/no-network.ts --test tests/sources/*.test.ts` | **50/50 PASS**, zero skipped, no live network |
| `npm test` | **143/143 PASS**, zero skipped, including existing media integration and all earlier phase tests |
| `npm run build` | PASS |
| `node --import ./tests/helpers/no-network.ts dist/cli/index.js research --help` | PASS; compiled command dispatch/help |
| `node --import ./tests/helpers/no-network.ts output/phase05/create-bundle-evidence.mjs` | PASS; mixed URL/GitHub/paste fixture bundle and unreviewed multi-claim ledger, HTTP fully mocked |
| Compiled CLI `research ingest --file <local-paste-input> --output <new-directory>` under network-denying preload | PASS; two pasted sources, 66 bytes, **zero HTTP requests** |
| Compiled original fixture validation / original 1.0.0 ledger check under network denial | PASS valid six-scene script / expected `needs_review` exit 4 |
| Mixed-bundle artifact hash audit / `git diff --check` | All five artifact hashes match; whitespace check PASS |

The initial mixed-claim test correctly rejected a quote from an uncited source (48/49 tests passed). The fixture was corrected to cite both conflicting references; the evidence guard was preserved. Final tests additionally cover duplicate URLs/notes, independent section selections, aggregate count/byte/stream/request/deadline limits, cancellation before DNS, redirect/private-host rejection, dedup policy isolation, conflicting/insufficient/missing-source claims, multi-source reviewed context, brief/hash staleness, source metadata integrity, legacy digests and CLI writes. No human fact approval was manufactured for the delivered evidence.

**Artifacts (ignored):**

- `output/phase05/bundle-3jmm6o/research/research-bundle.json`: three independent synthetic sources, two mocked HTTP requests, 795 consumed bytes, exact bundle/source provenance hashes.
- `output/phase05/bundle-3jmm6o/{input.json,draft.json,ledger-unreviewed.json,README.txt,evidence-report.json}`: multi-source review starter; three claims, including one deliberately missing source. State remains **needs_review** and export/approval is blocked.
- `output/phase05/compiled-paste-ZEoNEi/`: compiled CLI two-note input/output smoke, network denied.
- `output/phase05/bundle-{format,typecheck,lint,build,tests,regression-tests}.log`, `bundle-fixture-run.log`, `bundle-audit.json`, fixture driver `create-bundle-evidence.mjs`.

**Limits and next review:** Live public-site compatibility is still **UNVERIFIED**, explicitly skipped. Quarantine remains heuristic; pasted notes are references, not independent fact proof; license notes/signals confer no reuse permission. Local JSON reviewers are unauthenticated assertions. Multi-source disagreements require a human decision and exact evidence; no automatic semantic conflict resolution or fact approval exists. The bundle/brief contract is ready for planned Phase 06 consumption, but provider and VideoScript integration are not started. Review the mixed bundle's provenance/mappings/brief and unreviewed claims using README's workflow. **Stop after Phase 05; await review.**


### Phase 05 review fixes — URL credentials and partial limits (2026-11-10)

Both review findings are fixed within Phase 05:

- `src/sources/safety.ts` now shares one normalized credential pattern with URL screening in `policy.ts`. Decoded URL paths containing known Bearer/authorization/client-secret/key patterns fail with safe `URL_SECRET` errors before DNS or requests. Existing conservative URL guards are retained. Redirect targets and persisted snapshot URLs use the same policy, and errors do not echo synthetic credential text.
- `policy.ts` adds a strict, bounded `FetchLimitOverridesSchema` with defaults removed from optional fields. `bundle.ts` uses it for per-entry overrides. A byte-only override inherits configured timeout/redirect values; empty/equivalent overrides preserve deduplication. Supplied values still clamp to bundle caps, and invalid/unknown limit fields fail validation.
- Five regressions added across `tests/sources/{ingest,bundle,cli}.test.ts`: normalized/encoded credential rejection before I/O; redirect/saved-snapshot rejection; safe CLI errors; four-redirect success with a byte-only override; inherited limits/deduplication and invalid-bound checks. All five failed before the fixes (50/55 source tests passed), then passed afterward.
- README, contract and security references clarify actual behavior. No architectural boundary, saved contract version, default narrator, media layout or agent instructions changed in this fix.

Actual verification: `npm run format`, `npm run typecheck`, `npm run lint`, `npm run build` all PASS; network-denied source tests **55/55 PASS**, full `npm test` **148/148 PASS**, zero skipped. Logs: ignored `output/phase05/review-fixes-before.log`, `review-fixes-source-tests.log`, `review-fixes-tests.log`. Live fetching remains UNVERIFIED/skipped by the user's mock-only instruction. Phase 05 remains ready for human review; no later phase was started.


## Phase 06 — Unified Director and preserved brand (2026-11-10)

### Observed result and boundaries

**Implemented; Needs review.** The pasted extended Phase 06 request controls this work, including first-class manual external-AI import and mandatory brand consolidation. Initial Git state was `main` synced at `324e1c1`, with only the user-provided untracked `codex/06-deepseek-content-director-iteration-2.md`; that file was preserved. No commit/push, paid provider request, OAuth, upload, publishing, package installation, large download, dashboard, broad research or Phase 07 work ran. Official DeepSeek API/JSON/pricing documentation was read to implement the adapter; no live research ingestion or model generation occurred.

### Implemented components and changed files

- `src/director/{contracts,prompts,core}.ts`: Zod-derived current/legacy schemas, registered prop/cue catalog plus actual executable restrictions, valid example, small versioned research/audit/narration/storyboard/repair templates, bounded approved research context, strict manual/provider import, exact claim/source bindings and hash-bound local narration/storyboard review. Every result remains an unapproved draft with human/timing review requirements. Manual import without provenance is explicit missing-evidence preview material; it never invents sources or trusts script-declared approvals. Automated planning requires an already human-approved ledger bound to the exact Phase 05 bundle; no generated factual approval.
- `src/cli/director-cli.ts`, dispatch/help in `src/cli/run.ts`: `director export/import/validate/review`, `plan` mock/dry-run/explicit paid modes, protected new-directory outputs and safe field diagnostics. Existing source/claim commands and render-only paths remain independent. Exports include machine-readable schema/catalog/brand/example/request and external-AI prompt fragments, with hashes. Inputs and provider responses are bounded; decoded JSON strings/property names are screened before diagnostics and persistence.
- `src/llm/{provider,transport,deepseek}.ts`: provider-independent request/cancellation/accounting interface (future adapter IDs do not require Producer changes), explicit local response mock and optional DeepSeek adapter. Environment key only, explicit paid opt-in and lowered CLI budget cap, configurable HTTPS model/endpoint, public DNS pinning/native TLS/no redirects, fixed JSON-output roles/no tools/thinking, bounded output/response/input/attempts/timeouts/retries and one JSON repair. Successful usage records actual reported model, token estimates, rate policy and request/prompt identity; ambiguous attempts retain full reserved cost. Estimates are not exact provider billing. Encoded credential echoes and unsafe output are rejected without raw response/key logs.
- `src/branding/{profile,identity}.ts`, `src/config/voice-settings.ts`, narration config/schema: one approved immutable versioned profile consolidates existing palette/Inter sizes/weights/captions/safe area/entrance motion and `af_heart`, rate 1, en-us, seed0, `kokoro-http-v2`, lexicon `tech-en-v1`. `narration.config.example.json` references the brand rather than duplicating settings; explicit existing per-video settings still win. Model/voice files, hashes, CPU/time/thread limits and audio execution remain in existing modules. Brand audit: `docs/26-brand-profile.md`.
- Remotion theme/Composition, BrowserRequestFlow/SvgText, silent and narrated manifests, audio CLI: consume the shared profile and record ID/version/configuration SHA-256; actual per-scene voice/model metadata remains intact. Geometry, wrap bounds/node layout, packet causal timing and sample/frame arithmetic stay renderer/service concerns. No palette, font, logo, narrator, waveform filtering or animation redesign.
- `src/domain/{videoscript,validation}.ts`: preserve exact legacy 1.0.0 schema; add 1.1.0 optional registered brand ref and explicit null URL only for pasted sources. General `VideoScript` covers accepted versions; `VideoScriptV1` remains the legacy type. Producers use the general type; test fixture helper narrows the original fixture explicitly. Existing fixture JSON is unchanged.
- New Director/provider/brand tests and synthetic helper fixtures; `deepseek.config.example.json`; `scripts/manual-http-preview.mjs`; package test globs and `demo:manual-http`. README, both architecture docs, affected contract/Director/security/component/evaluation references and ADR-014 updated. AGENTS.md and CLAUDE.md unchanged.

### Actual verification commands and outcomes

| Command / check | Actual outcome |
|---|---|
| `npm run format` | PASS; 88 files checked, no final outstanding issues |
| `npm run typecheck` / `npm run lint` | PASS |
| `node --import ./tests/helpers/no-network.ts --test tests/director/*.test.ts tests/branding/*.test.ts` | **26/26 PASS**, zero skipped; no network permitted |
| `npm test` | **174/174 PASS**, zero skipped, including all 148 earlier phase tests and FFmpeg/mock-narration integration |
| `npm run build` | PASS; compiled CLI/modules and audio worker packaged |
| Compiled `director export`, `director import`, `director validate` under network-denying preload | PASS; complete contract, keyless original fixture draft, valid script and explicit missing-provenance/human-review flags |
| `node --import ./tests/helpers/no-network.ts output/phase06/synthetic-mock-demo.mjs` | PASS; fixture-only multi-source mock plan, bound contract export and unapproved draft; no real source/model request |
| `node src/cli/index.ts audio doctor --config narration.config.example.json` | Ready; installed model/voice hashes and local runtime verified |
| `node scripts/manual-http-preview.mjs` | Export/import/validate and all six real Kokoro WAVs succeeded. Initial Remotion stage FAILED at Chrome launch inside sandbox; failure journal retained |
| Existing `render --script .../draft/videoscript.json --narration .../narration --output .../render-retry --allow-caption-fallback`, with authorized local execution outside sandbox | PASS; 1113 measured frames, complete H.264/AAC MP4/SRT/manifest/QC, no source/model call |
| Independent ffprobe audit via existing `executeMedia` wrapper | PASS; exactly two streams, H.264/yuv420p 1080×1920@30, AAC, both 37.100000s. An initial direct bundled ffprobe invocation failed to locate its dylib; using the existing wrapper's required library environment resolved it |
| Six saved PNG / six scene WAV SHA-256 comparisons against `output/captions-clear-pjqbbfuq/render` | **All six representative PNGs and all six WAVs byte-identical**, same sampled frame indices. Not a comparison of every decoded video frame or cross-platform guarantee |
| Visual inspection | Viewed hook, parse and response PNGs. Captions fit the reserved lower band and do not overlap diagram nodes; per-frame browser collision/bounds checks completed during rendering |

Intermediate refactor/type/schema/repair-test failures were fixed before the final passing validation; no skipped command is counted as passed. Director tests cover all requested invalid-input/evidence/provider/budget/repair/brand/default-override cases, including escaped JSON instructions/secrets and a future provider interface stub. Prompt evaluations are deterministic contract/safety tests, **not** live model technical-quality scores.

### Artifacts and manual demonstration

All generated artifacts are ignored under `output/phase06/`:

- Final compiled schema/catalog/prompt/example export: `contract-final/` (`contract.json`, `videoscript.schema.json`, `animation-catalog.json`, `example.videoscript.json`, `external-director.md`, `request.json`, five prompt fragments and export manifest).
- Final keyless imported original HTTP draft: `import-final/{draft.json,videoscript.json}`. No actual external ChatGPT conversation or factual approval is claimed; the existing fixture demonstrates the same structured JSON import path.
- Fixture-only bound mock planning/export: `synthetic-mock/` with explicit TEST-ONLY reviewer/notes labels and README; this is not real factual approval or live model output. Tests also exercise dry-run and paid gates with network denied.
- Successful full manual preview: `manual-http-OLvVjn/render-retry/video.mp4`; matching `captions.srt`, `render-manifest.json`, `qc-report.json`, `timeline.json`, `ffprobe.json`, decoded AAC evidence and `visuals/*.png`. MP4 SHA-256: `d96fd5da2e467c4b39060054a875bd107a79273f5101050eac29c48d9261eea0`.
- Preserved local speech: `manual-http-OLvVjn/narration/<scene_id>/<scene_id>.wav` and narration metadata/manifest, imported `draft/` and contract export. Initial failed `render/` and `manual-run.json` are intentionally retained; `recovery.json` records the successful retry.
- `media-audit.json`, independent `ffprobe.json`, `audio-health.json`, `manual-preview.log`, `render-retry.log`, `director-tests.log`, `tests.log`, `mock-demo.log` and local audit drivers.

Measured output: **37.1s**, 1113 frames, 1080×1920, 30fps, H.264/AAC. Media QC reports `mediaChecksPassed: true`, `releaseApproved: false`, `requiresTimingReview: true`. Speech-span fallback remains coarse; no alignment was fabricated. The default voice remains `af_heart`/rate1; the existing voice clarity/DC-bias concern is preserved for human listening rather than silently filtered. Brand identity: `tech-explainer@1.0.0`, configuration SHA-256 `8403ee5e251a953ad270c75426cc2a1ac00a288539cf7ccec75737f0492ab7a1`.

Manual workflow: export the contract; give its template/schema/catalog/brief and optional approved research to an external AI yourself; save its JSON; `director import` then `director validate`; perform human narration/storyboard review with `director review`; send the saved `videoscript.json` through existing `audio narrate` and `render --narration`. README has exact flags. `npm run demo:manual-http` reruns export/import/real local speech/render into a new directory; `-- --file <external.json>` selects another supported input. Chrome requires normal local execution permission; no unsafe browser flags were introduced.

### Final audit and concurrent workspace changes

`git diff --check` scoped to this phase's architecture/status/README/reference docs, config/package, source and existing test-helper changes PASS. A global check also sees whitespace in independently changed `codex/06-*.md` / `codex/12-*.md` prompt files. Late in this run, additional prompt/amendment assets appeared (`codex/06–14`, `docs-amendments/`, `FILE_MANIFEST.json`, `tests/apply-phase-prompts.sh`); they were left untouched and their scripts were not executed. No later-phase implementation is attributed to this phase. Final export hash, current brand hash and saved media audit agree (`output/phase06/final-audit.json`). Final typecheck/lint/build logs are saved alongside the passing test logs.

### Limits, risks and next human action

- **UNVERIFIED:** live DeepSeek API compatibility, real-model prompt quality and exact provider billing. No live paid smoke was authorized or run. Adapter/mock tests do not establish factual accuracy or jailbreak immunity. Check current official model/rates and inspect dry-run before separately authorizing a capped real call.
- Only the existing HTTP-specific visuals/title-card decorations and one approved brand are implemented; other topics need explicit unsupported-visual findings or future component work. No Claude/Ollama integration, autonomous research or dashboard was added.
- Local fact/preview review identities are assertions, not authenticated signatures. Approved claims do not prove generated narration/visual scope; human semantic, rights, source-freshness and final release review remain essential. Missing-provenance manual previews remain visibly unapproved; no fake URL or silent evidence approval is used.
- Caption timing/voice naturalness/phone playback remain human checks. Preview review cannot override `requiresTimingReview` or confer publication approval. No later-phase database, cache, publisher or release system is implemented.
- Review the code diff, exported contract/brand audit, representative frames and full MP4 with sound. Confirm the preserved style/default narrator and human fact/rights/timing decisions. Recommend Phase 07 only after review and a new explicit request. **Stop after Phase 06.**


### Phase 06 follow-up — Missing manual input diagnostics (2026-11-10)

The user ran the illustrative `external.videoscript.json` commands before creating that external-AI output file. Verified that file is absent; the later validation/demo failures followed from the failed import. The included `examples/http-server.videoscript.json` remains available and imports/validates successfully under network denial.

- `src/cli/director-cli.ts`: file reads now distinguish `INPUT_NOT_FOUND` and `INPUT_READ_FAILED` from schema/JSON errors, without echoing input contents or sensitive paths. Missing input guidance points to the working included demonstration.
- `scripts/manual-http-preview.mjs`: validate input before making output directories/exporting contracts or invoking Kokoro/Remotion. Expected stage failures now end with a concise message rather than an uncaught child-process stack trace.
- `tests/director/director.test.ts`: regressions verify specific missing-file diagnostics, no draft creation, and early demo exit before exports/narration/rendering. README now leads with `npm run demo:manual-http` and explicitly labels external filenames as user-created placeholders.
- Actual final checks: format, typecheck, lint, build PASS; **28/28** network-denied Director/brand tests and **176/176** full tests PASS. Included-fixture import and validation PASS under network denial. Existing media remains unchanged; no new media render is needed for these input/preflight changes. No paid API, publishing, commit/push or later-phase work occurred.
