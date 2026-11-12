# Phase 11C final acceptance review — 2026-11-11

**Decision: NOT ACCEPTED for completion or advancement. STOP for human review.** This is an acceptance verification of the accepted ADR-019 and current implementation, not another architecture audit. The user's Kafka review explicitly rejects production visual quality. Passing tests does not override that decision.

| Review area | Current outcome |
|---|---|
| Functional acceptance | **Partial.** Bounded execution, contracts, measured media, cache behavior and automated review gates pass the checks below. Full city pixel compatibility and Kafka encoded replay remain failed. |
| Visual-quality acceptance | **Not accepted.** Kafka was rejected by the user; ghosted transition text and misleading record motion are confirmed. Other demonstrations still require complete human playback/phone assessment. |
| Factual/source review | **Not approved.** Demo claims remain needs_human_review. Kafka has stale caching editorial metadata and unreviewed source references; rendering does not certify the explanation. |
| Release approval | **Not granted.** All demonstration render manifests are unapproved. No release candidate, human gate decision or publication was created by this verification. |

The latest instruction limits this work to verification/reporting. Application code, tests, fixtures, grammar, renderer, historical media and existing approval records were not edited. Only this report, PROJECT_STATUS, review indexes and fresh ignored verification evidence are updated. No Phase 11D/12, new dependency/provider, runtime source fetch or paid call ran.

## Twelve requested requirements

| # | Outcome | Actual evidence and limitation |
|---|---|---|
| 1 | **Partial** | All **9** repository 1.0.0/1.1.0 fixtures validate in source and compiled CLI; **5 actual saved Phase 06 Director drafts** read with their original director-1.0.0 identities. All 10 selected legacy render PNGs match committed-code baselines. Full 1113-frame HTTP comparison passes; full 489-frame city comparison fails. Compatibility is verified for these fixtures, not every possible historical input. |
| 2 | **Pass, bounded execution** | 1.2.0 uses ComposedScene with node/link/token, fixed layouts and finite cues. Actual handler code is topic-neutral; no Kafka string/handler exists under src. No arbitrary generated React/SVG/code or second renderer/timeline/registry exists in this path. This is a small initial grammar, not universal composition. |
| 3 | **Pass, execution only** | Caching/request flow, cloud file movement and queue independently render through the same ComposedScene handler/compiler. Their MP4s are linked below. Three related technical mechanisms do not establish unlimited-topic coverage; the demonstrations mainly exercise row layout and have not received full quality/factual acceptance. |
| 4 | **Verified historical experiment** | freeze.json predates the user's Kafka selection. Both successful Kafka render manifests identify frozen application SHA eeafc0d0…391f1d. Schema/catalog/prompt hashes still match. No application source changed between those renders. The subsequent documented runner metadata-only repair changed the overall current SHA; the holdout is not represented as a new test of identical whole-application bytes after that repair. |
| 5 | **Pass, runtime contract checks** | Fresh tests execute all **11 actual React renderer bindings** and verify registry/catalog IDs, strict schemas, action handlers and negative constraints. A fresh Director export matches the frozen schema/catalog. Structural JSON schema alone does not enforce all reference/cue/layout refinements; normal runtime preflight remains mandatory. No independent claim that every invalid graph is rejected by a standalone JSON-schema validator is made. |
| 6 | **Partial** | The generic file-transfer MP4 reuses original document/cloud images with existing DepthPanel, motion and gentle camera. Both portable file/record identities revalidate. Asset records explicitly identify automated-test-harness-only review; human production rights/asset-backed quality acceptance is absent. The imagery renders technically, while small framing and transition quality remain unresolved. True GPU 3D is not implemented. |
| 7 | **Fail** | Encoded frames show ghosted headings in Kafka, file transfer, mixed crossfade and matched handoff. The dedicated matched token moves once across compatible scenes, but that does not cure heading ghosting or Kafka's misleading stored-record identity. Files frame141 also carries the preceding successful-storage state under the next failure caption during overlap. No blanket “no resets/no ghosting/consistent meaning” claim is justified. |
| 8 | **Partial** | Eight final MP4s pass fresh independent ffprobe/decode, measured timeline/SRT and derived-plan/pacing reconstruction. **33 scene WAVs** match original saved input hashes/samples. Caption method remains scene-speech-span-v1 with requiresTimingReview:true; reviewed word alignment is absent. Epoch/duration integrity passes; natural listening, word/event synchronization and complete caption-quality acceptance do not. The legacy city 900ms boundary remains unresolved. |
| 9 | **Pass, real producer check** | In a new isolated job using the actual Remotion renderer and FFmpeg assembly, both visual-only revisions reuse both scene audio caches and exact saved WAV bytes. No synthetic renderer/narrator adapter is injected. Initial audio-stage misses only import supplied saved WAVs; there is no new synthesis. |
| 10 | **Pass, real producer check** | Editing the predecessor visual rerenders both affected clips; editing only the incoming visual rerenders that clip and reuses the predecessor. Final outputs for all three revisions pass independent media inspection. Existing tests additionally cover derived dependencies and incompatible boundaries. |
| 11 | **Pass, automated safeguards** | Fresh tests verify composed semantic changes with identical narration reset facts/rights/video/publish approvals; specialized predecessor crossfade meaning affects facts; exact staged asset/rights/attribution and pacing-report bindings are enforced. Synthetic test approvals remain isolated test assertions. These checks do not approve the real demonstrations or prove that every misleading visual can be detected automatically. |
| 12 | **Partial overall** | Fresh typecheck, lint (**152 files**), build and **244/244 tests** pass, with zero skips/failures. Compiled CLI validates **13** inputs. Independent checks pass for eight existing MP4s and three new cache-check outputs. Applicable all-frame city/Kafka pixel checks fail; not all rendering acceptance checks pass. |

## Actual demonstration files

All primary files below are 1080×1920@30 H.264/yuv420p with AAC narration and approvedForRelease:false. They are existing saved demonstrations, freshly rehashed/probed/decoded here; they were not rerendered or rewritten to alter the frozen holdout outcome.

| Demonstration | Actual playback | Frames / duration | Exact MP4 SHA-256 |
|---|---|---|---|
| caching | [MP4](../../output/phase11c/caching-final/video.mp4) | 408 / 13.600s | `2aa7d1fbc6e981aaab1ecacfa780fc7da6ae4bf4aa487fa9a030f8207b308f38` |
| files | [MP4](../../output/phase11c/files-final/video.mp4) | 423 / 14.100s | `6bd2dc7c91b89945ff8477e869c1d7170c843f8f20ce1f350a80bcdc11521a4c` |
| queue | [MP4](../../output/phase11c/queue-final/video.mp4) | 736 / 24.533s | `93a44bab928ee309f4fb974f110d1a2b59d4f7d2115e144d2d2448f5aeb064df` |
| boundarychain | [MP4](../../output/phase11c/boundary-chain/video.mp4) | 408 / 13.600s | `a030ade3d0b24fdc33656092af5313c2a033305b9747235fb41c130d703f2c5e` |
| kafka | [MP4](../../output/phase11c/kafka-holdout-revision-2/video.mp4) | 642 / 21.400s | `1a2b70eb9cb5557d756d0dca3f207a7e88c253297a0b27e9cc5aebae873ec190` |
| handoff | [MP4](../../output/phase11c/matched-handoff/video.mp4) | 202 / 6.733s | `5dba31bd2781a7217ae5449b8928aea293d627b8ead918585be517f1f365a572` |
| legacyhttp | [MP4](../../output/phase11c/legacy-http/video.mp4) | 1113 / 37.100s | `95905614f9683a73ca1a39a5041c46fb358b8982003f8c42148a7273cb387ee2` |
| legacycity | [MP4](../../output/phase11c/legacy-city/video.mp4) | 489 / 16.300s | `7b0049cdcc59065f9a82f597ebc9bd0f2108a6e0fef83c47b6d0a3dc73dbcac2` |

The first three are the required generic multi-topic demonstrations; boundarychain/handoff are continuity proofs; legacyhttp/legacycity are compatibility regressions. Kafka is only the previously frozen holdout, not standalone evidence of genericity or phase completion. Original scripts/WAVs, captions, timeline, compiled/pacing files, ffprobe and QC remain beside each MP4.

## Representative encoded boundary frames

Fresh frame extraction is under [acceptance-review-20261111/media](../../output/phase11c/acceptance-review-20261111/media). Every tested boundary has B−1, B, B+5, B+11 and B+12 full-size/mobile PNGs, with decoded ±1-second audio excerpts. The [boundary index](../../output/phase11c/acceptance-review-20261111/boundary-index.json) maps every frame, time and excerpt to its video.

| Case | Before / during / after | Observed result |
|---|---|---|
| Kafka first boundary B174 /5.8s | [173](../../output/phase11c/acceptance-review-20261111/media/kafka-f173-mobile.png), [179](../../output/phase11c/acceptance-review-20261111/media/kafka-f179-mobile.png), [186](../../output/phase11c/acceptance-review-20261111/media/kafka-f186-mobile.png) | Two different scene titles overlap at frame179; the shared-ID record moves away from its only stored representation. |
| File transfer B136 /4.533s | [135](../../output/phase11c/acceptance-review-20261111/media/files-f135-mobile.png), [141](../../output/phase11c/acceptance-review-20261111/media/files-f141-mobile.png), [148](../../output/phase11c/acceptance-review-20261111/media/files-f148-mobile.png) | Document/cloud assets are visible; title and prior successful-copy state ghost under the incoming failure narrative. |
| Mixed specialized→composed B202 /6.733s | [201](../../output/phase11c/acceptance-review-20261111/media/boundarychain-f201-mobile.png), [207](../../output/phase11c/acceptance-review-20261111/media/boundarychain-f207-mobile.png), [214](../../output/phase11c/acceptance-review-20261111/media/boundarychain-f214-mobile.png) | Both types execute in the shared composition, but layouts/titles overlap visibly during the fade. |
| Matched token B91 /3.033s | [90](../../output/phase11c/acceptance-review-20261111/media/handoff-f90-mobile.png), [96](../../output/phase11c/acceptance-review-20261111/media/handoff-f96-mobile.png), [103](../../output/phase11c/acceptance-review-20261111/media/handoff-f103-mobile.png) | One stable token travels cache→application and reaches its endpoint; title ghosting persists. |
| Queue second boundary B250 /8.333s | [249](../../output/phase11c/acceptance-review-20261111/media/queue-f249-mobile.png), [255](../../output/phase11c/acceptance-review-20261111/media/queue-f255-mobile.png), [262](../../output/phase11c/acceptance-review-20261111/media/queue-f262-mobile.png) | Shared generic entities execute; repeated row framing and mobile size remain quality limitations. |

Additional inspected poses include [asset-backed frame68](../../output/phase11c/acceptance-review-20261111/media/files-f68-mobile.png), [queue frame183](../../output/phase11c/acceptance-review-20261111/media/queue-f183-mobile.png), [caching frame255](../../output/phase11c/acceptance-review-20261111/media/caching-f255-mobile.png), and Kafka [reading frame247](../../output/phase11c/acceptance-review-20261111/media/kafka-f247-mobile.png)/[status frame400](../../output/phase11c/acceptance-review-20261111/media/kafka-f400-mobile.png). Agent frame/signal inspection is not human full listening or phone approval.

## Kafka feedback: authoring, general limitations and deferred vocabulary

These are classifications and possible explicit future revisions, **not changes applied in this verification**. The frozen renderer and current Kafka JSON are left intact.

| User issue | JSON-only scope using registered controls | General limit or intentionally absent capability |
|---|---|---|
| Diagram too small | A different column/grid layout and fewer relevant entities may use more vertical space. | Node dimensions, label/status font sizes and camera strength are fixed in the renderer. JSON cannot set a general diagram scale; layouts beyond the existing presets are outside the grammar. |
| Nearly identical scenes / weak disclosure | Author different finite scene snapshots; use entity appear/disappear/highlight and retain stable IDs/slots where appropriate. | Links/groups are drawn from the start of each scene; independent link reveal tracks and a rich progressive-layout system are absent. No new Kafka handler is justified. |
| Append-only log is not represented | A bounded manually authored sequence can use grouped record nodes with offset labels, keeping earlier record identities and adding a later record. It would need its own render/factual review. | There is no semantic log container, append operation, automatic offset assignment or immutable-log simulator. A generic moving token alone does not prove append-only behavior. |
| Reading moves the only record away | Represent the stored record separately and move an explicitly labeled read-copy token with a different stable ID. | There is no runtime clone/copy action. The current fixture uses only one record token, so its present visual is misleading. The compiler cannot infer or certify non-destructive consumption. |
| Ghosted headings | Intentional cuts or identical headings can mitigate specific authored boundaries; each is a new reviewed script revision. | Composition blends complete scene-local titles in the same position. Cross-layer label overlaps are excluded from the overlap checker. This is a general transition-quality defect; a JSON workaround would not fix all registered scene combinations. |
| Tiny/overlapping status | Shorten/omit status or encode an essential state in a larger entity label. | Status is hardcoded at 26 native px (about 8.7px at 360px-wide mobile); its y+112 baseline sits close to/below a 170px node. There is no JSON typography/status-placement control. Existing text-safe checks do not establish node/text clearance or visual hierarchy. |
| Weak narration-led focus | Better action sequencing, highlights and gentle-focus cues are supported. Exact phrase cues require existing reviewed WAV-bound alignment. | Focus is bounded to 1.04× with small pan; no arbitrary camera/scale path, physics or GPU3D exists. Speech activity and progress estimates are not word alignment; none may be fabricated. |
| Stale metadata/unreviewed sources | Explicit future JSON revision can replace editorial title_options:[caching], the caching summary and prior-phase provenance. | Source/claim approval cannot be granted by JSON edits. The Kafka references have no reviewed snapshot identity; the 2013 source is historical. The user left the GitHub reference out; no new ingestion or 11D workflow is performed. |

The current record coordinates verify the semantic problem: producer(242,708)→partition(502,708) in scene1, partition→consumer(762,708) in scene2, remaining at consumer in scene3, then resetting to partition in scene4 by ordinary crossfade. Stable names do not themselves imply correct persistent storage. See [exact compiled-state/metadata findings](../../output/phase11c/acceptance-review-20261111/kafka-semantic-metadata-findings.json).

## Measured timing, cache and review evidence

The shared Phase 04 timeline retains measured WAV samples and cumulative integer frames. New generic/holdout boundary inactivity gaps range from 306.667 to400ms, including WAV tail + explicit padding + incoming head; every boundary starts with unresolved editorial classification. Below-threshold gaps are not automatically “deliberate.” The unchanged city first boundary is 900ms: explicit padding 14336 samples (597.333ms), with the rest from WAV inactivity; its human pause intent is unresolved. Whole-scene speech-span captions preserve the measured epoch but do not establish individual word/event sync. No WAV trimming, rewriting, stretching, audio crossfade or fabricated word alignment occurred.

The [original WAV check](../../output/phase11c/acceptance-review-20261111/original-wav-identity.json) compares all 33 scene WAVs against their original input directories, separately from final-MP4 decode. [Fresh media reports](../../output/phase11c/acceptance-review-20261111/media/review-report.json) rebuild timeline/SRT/compiled/pacing and check decoded A/V structure. Complete human listening, caption accuracy and phone playback remain unverified here; the user's visual rejection is recorded rather than replaced with an automated pass.

[Real cache-check evidence](../../output/phase11c/acceptance-review-20261111/real-cache-check.json) contains job de123f68-e9dc-494e-a31c-6955ba6617ab in fresh isolated state, three explicit preview revisions and actual MP4 output directories. Round 0 renders two clips from saved Kokoro WAVs. A predecessor role edit renders caching-1 and caching-2; the incoming-only edit renders caching-2 and reuses caching-1. Both edited rounds hit both audio caches and every WAV remains byte-identical. Independent final media inspection passes all three outputs. These technical role edits are not new educational demonstrations or human approvals.

Fresh [asset preflight](../../output/phase11c/acceptance-review-20261111/asset-check.json) confirms two exact portable original assets; their automated-test review identity is explicit. Existing tests exercise changed/unreviewed/missing assets, rights/attribution inventory, semantic visual edits with unchanged narration, specialized predecessor semantics and exact pacing receipts. The reported human review/rights decisions remain separate from render success and from each other.

## Test and regression results

| Executed command/check | Result |
|---|---|
| npm run typecheck | PASS |
| npm run lint | PASS; 152 files; no fixes |
| npm run build | PASS |
| npm test | PASS; 244 passed, 0 failed, 0 skipped |
| Compiled CLI script validate | PASS; 9 legacy plus 4 generic inputs |
| Saved Director drafts | PASS; 5 actual saved drafts, original prompt identity preserved |
| Fresh independent saved media inspection | PASS; 8 primary MP4s plus 3 real cache-check outputs |
| Actual registry/catalog/schema/handler and review/cache negative tests | PASS in the full suite; mocked/synthetic fixtures are identified as such |
| Complete HTTP pixel comparison | PASS; 1113 frames; worst mean 0.0006814/255, changed fraction 0.000390625 |
| Complete city pixel comparison | **FAIL**; 489 frames; worst mean 14.8445/255, changed fraction 0.250829 |
| Frozen Kafka pixel replay | **FAIL**; 642 frames; worst mean 0.145981/255, changed fraction 0.031367 |

Pixel tolerances remain mean≤0.05/255 and changed fraction≤0.005 per frame; they were not widened. Selected render PNGs match, but they cannot override whole-video failures. The cause of all encoded discrepancies remains unresolved; no browser/encoder cause is asserted as proven. Full pixel diagnostics are in [pixel-results.json](../../output/phase11c/acceptance-review-20261111/pixel-results.json). Logs, fresh export, schema/freeze checks, saved-draft results and machine acceptance matrix are under [acceptance-review-20261111](../../output/phase11c/acceptance-review-20261111).

## Stop boundary

Current source SHA 0ea9a5ffce08720b4929886e63e6697ff89d95eb64b98e58c1afe043b087baed matches the start of this verification exactly. The source/fixture holdout was not modified to obtain a pass. The original audit/ADR, old scripts/media and release decisions remain unchanged.

**Phase 11C is not complete.** General transition/layout defects, misleading fixture semantics/metadata, failed encoded reproducibility, human asset-rights/factual review and complete narrated mobile/listening acceptance remain open. JSON revisions could address only part of the Kafka feedback; a general renderer repair must follow the accepted 11C process outside the frozen experiment. No 11D/12 work is started. STOP for human review.
