import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { brandIdentity } from '../branding/identity.ts';
import { VideoScriptSchema } from '../domain/videoscript.ts';
import { loadNarrationAsset } from '../media/narration-input.ts';
import {
  inspectDecodedAudio,
  type MediaRunner,
  probeNarratedVideo,
  runMedia,
} from '../media/qc.ts';
import { hash, NarrationArtifactSchema } from '../render-manifest/manifest.ts';
import { canonical, compileVisualPlan } from '../renderers/remotion/compile.ts';
import { boundaryPacing } from '../timing/pacing.ts';
import {
  AlignmentSchema,
  planNarratedRender,
  srt,
} from '../timing/timeline.ts';
import { readJson } from '../workflow/import.ts';
import { Sha } from '../workflow/model.ts';
import { block } from './model.ts';

// An unapproved local file must never make ffprobe/FFmpeg follow a remote playlist.
export const localReleaseMedia: MediaRunner = (type, args) =>
  runMedia(type, ['-protocol_whitelist', 'file,pipe', ...args]);

// Existing preview manifests contain additional provenance/tool fields. Their entire bytes are hash-bound.
export const PreviewSchema = z.object({
  kind: z.literal('narrated-preview'),
  scriptSha256: Sha,
  videoSha256: Sha,
  scriptRevision: z.int().positive(),
  isMock: z.boolean(),
  width: z.literal(1080),
  height: z.literal(1920),
  fps: z.literal(30),
  durationFrames: z.int().min(2).max(108000),
  requiresTimingReview: z.boolean(),
  brand: z.object({ id: z.string(), version: z.string(), sha256: Sha }),
  visuals: z.object({ tools: z.object({ fontSha256: Sha }) }),
});
export async function inspectReleaseMedia(dir: string) {
  const preview = PreviewSchema.parse(
    await readJson(join(dir, 'render-manifest.json')),
  );
  const script = VideoScriptSchema.parse(
    await readJson(join(dir, 'videoscript.json')),
  );
  if (
    hash(JSON.stringify(script)) !== preview.scriptSha256 ||
    script.revision !== preview.scriptRevision ||
    JSON.stringify(
      brandIdentity('brand' in script ? script.brand : undefined),
    ) !== JSON.stringify(preview.brand)
  )
    block(
      'RENDER_BINDING_INVALID',
      'Rendered script revision or resolved BrandProfile does not match the preview',
    );
  const assets = await Promise.all(
    script.scenes.map((scene) =>
      loadNarrationAsset(scene, join(dir, 'narration', scene.scene_id)),
    ),
  );
  const recorded = z
    .object({
      narration: z.array(z.object({ metadata: NarrationArtifactSchema })),
    })
    .parse(await readJson(join(dir, 'render-manifest.json')));
  if (
    recorded.narration.length !== assets.length ||
    assets.some(
      (asset, index) =>
        JSON.stringify(asset.metadata) !==
        JSON.stringify(recorded.narration[index]?.metadata),
    )
  )
    block(
      'NARRATION_BINDING_INVALID',
      'Narrator/model/settings metadata differs from the final render record',
    );
  if (preview.isMock || assets.some((a) => a.metadata.isMock))
    block('MOCK_NARRATION', 'Mock tones cannot receive release eligibility');
  for (const asset of assets)
    if (
      !Sha.safeParse(asset.metadata.identity.modelSha256).success ||
      !Sha.safeParse(asset.metadata.identity.voicesSha256).success
    )
      block(
        'NARRATOR_IDENTITY_MISSING',
        'Narration must identify exact model and voice-library hashes',
      );
  // A reviewed aligner file must actually exist for a nonfallback timeline.
  const alignment = preview.requiresTimingReview
    ? undefined
    : AlignmentSchema.parse(await readJson(join(dir, 'alignment.json')));
  const timeline = planNarratedRender(script, assets, {
    allowFallback: true,
    ...(alignment ? { alignment } : {}),
  });
  if (script.schema_version === '1.2.0') {
    const compiled = compileVisualPlan(script, timeline.scenes);
    const recorded = await readJson(join(dir, 'compiled-visual-plan.json'));
    const presentation = {
      scenes: timeline.scenes.map(({ from, durationFrames }) => ({
        from,
        durationFrames,
      })),
      captions: timeline.captions,
    };
    if (
      canonical(recorded) !==
        canonical({
          ...compiled,
          inputSha256: hash(canonical({ script, presentation })),
          sha256: hash(canonical(compiled)),
        }) ||
      canonical(await readJson(join(dir, 'boundary-pacing.json'))) !==
        canonical(boundaryPacing(timeline, assets, script.scenes))
    )
      block(
        'COMPILED_BINDING_INVALID',
        'Compiled plan or pacing diagnostics differ from measured inputs',
      );
  }
  if (
    JSON.stringify(await readJson(join(dir, 'timeline.json'))) !==
      JSON.stringify(timeline) ||
    timeline.durationFrames !== preview.durationFrames ||
    timeline.requiresTimingReview !== preview.requiresTimingReview ||
    (await readFile(join(dir, 'captions.srt'), 'utf8')) !==
      srt(timeline.captions)
  )
    block(
      'TIMING_BINDING_INVALID',
      'Timeline/SRT must match measured per-scene WAVs and the exact script',
    );
  const temp = await mkdtemp(join(tmpdir(), 'studio-release-audio-'));
  try {
    const probe = await probeNarratedVideo(
      join(dir, 'video.mp4'),
      timeline.durationFrames,
      localReleaseMedia,
    );
    const decodedAudio = await inspectDecodedAudio(
      join(dir, 'video.mp4'),
      join(temp, 'decoded.wav'),
      timeline,
      localReleaseMedia,
    );
    return {
      preview,
      script,
      assets,
      timeline,
      probe: probe.summary,
      decodedAudio,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
export type MediaInspection = Awaited<ReturnType<typeof inspectReleaseMedia>>;
