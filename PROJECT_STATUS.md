# Tech Explainer Studio — Implementation status

> **Status baseline:** Phase 01 implemented and verified; ready for human review. Offline validation only; rendering and integrations remain planned.  
> **Next phase:** 02 — Remotion vertical silent animation renderer, only after review and an explicit request. Phase 02 has not started.  
> **Last updated:** 2026-11-10 (Asia/Kolkata).

## Phase tracker

| Phase | Deliverable | Status | Evidence / notes |
|---|---|---|---|
| 00 | Repository orientation, rights and execution baseline | Done | Audit recorded below; user subsequently authorized Git setup and explicitly requested Phase 01 |
| 01 | TypeScript foundation, schema, fixture and CLI validation | Done | 45/45 tests; typecheck, lint, build and offline CLI demonstrations passed; awaiting human review before Phase 02 |
| 02 | Remotion vertical silent animation renderer | Not started | — |
| 03 | Local Kokoro narration adapter and pronunciation | Not started | — |
| 04 | Measured timeline, subtitles, assembly and media QC | Not started | — |
| 05 | Safe GitHub/docs ingestion, source snapshots and claim ledger | Not started | — |
| 06 | DeepSeek Director: sourced script and animation storyboard | Not started | — |
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

## Documentation update policy

- Update **this file after every phase**.
- Update `ARCHITECTURE.md` and the detailed design docs **only when the actual architecture changes**.
- Update `AGENTS.md` or `CLAUDE.md` only when there is a durable rule that future agents need to follow.
- Do not overwrite proposed diagrams with implementation claims until they have been tested.
