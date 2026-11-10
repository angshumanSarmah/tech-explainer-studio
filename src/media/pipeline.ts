import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { NarrationError } from '../audio/types.ts';
import { probeWav } from '../audio/wav.ts';
import { brandIdentity } from '../branding/identity.ts';
import { parseVideoScript } from '../domain/validation.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import {
  hash,
  NarrationArtifactSchema,
  sourceInventory,
} from '../render-manifest/manifest.ts';
import { RenderInputError } from '../renderers/remotion/plan.ts';
import {
  type RenderOptions,
  RenderStageError,
  renderSilentPreview,
} from '../renderers/remotion/render.ts';
import {
  AlignmentSchema,
  planNarratedRender,
  srt,
} from '../timing/timeline.ts';
import { MediaError } from './error.ts';
import { pcmData, signalReport, wavFromPcm } from './pcm.ts';
import {
  checkTiming,
  inspectDecodedAudio,
  type MediaRunner,
  muxNarration,
  probeNarratedVideo,
  runMedia,
} from './qc.ts';

export interface NarratedOptions {
  outputDir: string;
  narrationDir: string;
  browserExecutable: string;
  allowFallback: boolean;
  strict: boolean;
  alignment?: unknown;
  onProgress?: (text: string) => void;
}
export interface PipelineDependencies {
  runner?: MediaRunner;
  renderVisuals?: (
    script: VideoScript,
    options: RenderOptions,
  ) => Promise<{ outputDir: string; manifest: unknown }>;
}
type AudioAsset = Awaited<ReturnType<typeof probeWav>> &
  ReturnType<typeof signalReport> & {
    sceneId: string;
    sha256: string;
    textSha256: string;
    metadata: z.infer<typeof NarrationArtifactSchema>;
    wavPath: string;
    pcm: Buffer;
  };
export async function renderNarratedPreview(
  input: VideoScript,
  options: NarratedOptions,
  deps: PipelineDependencies = {},
) {
  const script = parseVideoScript(input);
  const output = resolve(options.outputDir);
  try {
    await mkdir(dirname(output), { recursive: true });
    await mkdir(output);
  } catch {
    throw new MediaError(
      'OUTPUT_EXISTS',
      'output',
      null,
      'Choose a fresh writable output directory; reviewed files are never overwritten',
    );
  }
  let stage = 'narration';
  let sceneId: string | null = null;
  const runner = deps.runner ?? runMedia;
  try {
    const alignment =
      options.alignment === undefined
        ? undefined
        : AlignmentSchema.parse(options.alignment);
    const assets: AudioAsset[] = [];
    let totalSamples = 0;
    for (const scene of script.scenes) {
      sceneId = scene.scene_id;
      options.onProgress?.(`Validating narration ${sceneId}`);
      const source = join(resolve(options.narrationDir), sceneId);
      const raw = JSON.parse(
        await readFile(join(source, 'narration.json'), 'utf8'),
      );
      const metadata = NarrationArtifactSchema.parse(raw);
      const sourceWav = join(source, `${sceneId}.wav`);
      const info = await stat(sourceWav);
      totalSamples += metadata.samples;
      if (
        !info.isFile() ||
        info.size > metadata.limits.maxWavBytes ||
        totalSamples > 108000 * 800
      )
        throw new MediaError(
          'AUDIO_LIMIT',
          'narration',
          sceneId,
          'Saved narration exceeds the configured byte limit or one-hour total; repair inputs before loading audio',
        );
      const bytes = await readFile(sourceWav);
      if (
        metadata.sceneId !== sceneId ||
        metadata.originalTextSha256 !== hash(scene.narration) ||
        metadata.sha256 !== hash(bytes) ||
        metadata.bytes !== bytes.length
      )
        throw new MediaError(
          'NARRATION_IDENTITY',
          'narration',
          sceneId,
          'Scene/text/WAV hash differs from saved narration metadata; regenerate this scene explicitly',
        );
      const folder = join(output, 'narration', sceneId);
      await mkdir(folder, { recursive: true });
      const wavPath = join(folder, `${sceneId}.wav`);
      await writeFile(wavPath, bytes, { flag: 'wx' });
      const measured = await probeWav(wavPath, metadata.limits);
      if (
        measured.samples !== metadata.samples ||
        Math.abs(measured.durationSeconds - metadata.durationSeconds) >
          1 / 24000
      )
        throw new MediaError(
          'NARRATION_MEASUREMENT',
          'narration',
          sceneId,
          'Saved duration/sample count differs from independent ffprobe measurement',
        );
      const pcm = pcmData(bytes);
      const signal = signalReport(pcm, sceneId);
      await writeFile(
        join(folder, 'narration.json'),
        `${JSON.stringify({ ...metadata, wavPath, metadataPath: join(folder, 'narration.json') }, null, 2)}\n`,
        { flag: 'wx' },
      );
      assets.push({
        sceneId,
        sha256: metadata.sha256,
        textSha256: metadata.originalTextSha256,
        ...measured,
        ...signal,
        metadata,
        wavPath,
        pcm,
      });
    }
    sceneId = null;
    stage = 'timing';
    const timeline = planNarratedRender(script, assets, {
      allowFallback: options.allowFallback,
      ...(alignment ? { alignment } : {}),
    });
    const isMock = assets.some((a) => a.metadata.isMock);
    checkTiming(timeline, timeline.captions, options.strict, isMock);
    const presentation = {
      scenes: timeline.scenes.map(({ from, durationFrames }) => ({
        from,
        durationFrames,
      })),
      captions: timeline.captions,
    };
    await writeFile(
      join(output, 'videoscript.json'),
      `${JSON.stringify(script, null, 2)}\n`,
      { flag: 'wx' },
    );
    await writeFile(
      join(output, 'timeline.json'),
      `${JSON.stringify(timeline, null, 2)}\n`,
      { flag: 'wx' },
    );
    await writeFile(join(output, 'captions.srt'), srt(timeline.captions), {
      flag: 'wx',
    });
    if (alignment)
      await writeFile(
        join(output, 'alignment.json'),
        `${JSON.stringify(alignment, null, 2)}\n`,
        { flag: 'wx' },
      );
    const segments = timeline.scenes.map((item) => {
      const audio = assets.find((a) => a.sceneId === item.scene.scene_id);
      if (!audio)
        throw new MediaError(
          'AUDIO_MISSING',
          'assembly',
          item.scene.scene_id,
          'Measured narration disappeared',
        );
      return Buffer.concat([
        audio.pcm,
        Buffer.alloc(item.endPaddingSamples * 2),
      ]);
    });
    const wav = join(output, 'narration.wav');
    await writeFile(wav, wavFromPcm(Buffer.concat(segments)), { flag: 'wx' });
    stage = 'visuals';
    options.onProgress?.(
      `Rendering ${timeline.durationFrames} measured frames with captions`,
    );
    const renderScript = {
      ...script,
      scenes: timeline.scenes.map((item) => item.scene),
    };
    const visual = await (deps.renderVisuals ?? renderSilentPreview)(
      renderScript,
      {
        outputDir: join(output, 'visuals'),
        browserExecutable: options.browserExecutable,
        presentation,
        ...(options.onProgress ? { onProgress: options.onProgress } : {}),
      },
    );
    stage = 'mux';
    const partial = join(output, 'video.partial.mp4');
    await muxNarration(
      join(visual.outputDir, 'video.mp4'),
      wav,
      partial,
      runner,
    );
    stage = 'ffprobe';
    const qc = await probeNarratedVideo(
      partial,
      timeline.durationFrames,
      runner,
    );
    await writeFile(
      join(output, 'ffprobe.json'),
      `${JSON.stringify(qc.raw, null, 2)}\n`,
    );
    stage = 'decoded-audio-qc';
    const decoded = await inspectDecodedAudio(
      partial,
      join(output, 'decoded-audio.wav'),
      timeline,
      runner,
    );
    stage = 'manifest';
    const blockers = [
      ...(isMock ? ['Mock tone is not narration'] : []),
      ...(timeline.requiresTimingReview
        ? ['Caption timing requires human review']
        : []),
      'Human voice quality, pronunciation, phone playback, factual and rights reviews are pending',
    ];
    const report = {
      schemaVersion: '1.0.0',
      mediaChecksPassed: true,
      releaseApproved: false,
      releaseChecksPassed: false,
      releaseBlockers: blockers,
      video: qc.summary,
      captionMethod: timeline.captionMethod,
      requiresTimingReview: timeline.requiresTimingReview,
      scenes: assets.map(({ pcm: _pcm, metadata: _metadata, ...asset }) => ({
        ...asset,
        dcBiasFlag: Math.abs(asset.dcOffset) > 0.01,
      })),
      decodedAudio: decoded,
      manualPlaybackChecklist: [
        'Listen for noise, naturalness and technical pronunciation in all six scenes',
        'Check captions against speech; scene-span fallback is not word alignment',
        'Check request down / response up and every scene boundary',
        'Check caption readability on a phone with platform UI overlays',
        'Review authored holds, facts, source provenance and rights before release',
      ],
    };
    await writeFile(
      join(output, 'qc-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      { flag: 'wx' },
    );
    const { stdout: ffmpeg } = await runner('ffmpeg', ['-version']);
    const { stdout: ffprobe } = await runner('ffprobe', ['-version']);
    const files = [
      'videoscript.json',
      'captions.srt',
      'timeline.json',
      'narration.wav',
      'qc-report.json',
      'ffprobe.json',
      ...(alignment ? ['alignment.json'] : []),
    ];
    const artifacts = await Promise.all(
      files.map(async (file) => ({
        file,
        sha256: hash(await readFile(join(output, file))),
      })),
    );
    const manifest = {
      schemaVersion: '1.0.0',
      kind: 'narrated-preview',
      brand: brandIdentity('brand' in script ? script.brand : undefined),
      approvedForRelease: false,
      isMock,
      scriptId: script.script_id,
      scriptRevision: script.revision,
      scriptSha256: hash(JSON.stringify(script)),
      videoSha256: hash(await readFile(partial)),
      width: 1080,
      height: 1920,
      fps: 30,
      durationFrames: timeline.durationFrames,
      roundingPolicy: timeline.roundingPolicy,
      captionMethod: timeline.captionMethod,
      requiresTimingReview: timeline.requiresTimingReview,
      scenes: timeline.scenes.map(({ scene, ...time }) => ({
        ...time,
        sceneId: scene.scene_id,
        resolvedVisual: scene.visual,
      })),
      narration: assets.map(({ pcm: _pcm, ...asset }) => asset),
      sourceVersions: script.sources,
      implementation: await sourceInventory(),
      visuals: visual.manifest,
      tools: {
        node: process.version,
        ffmpeg: ffmpeg.split('\n')[0],
        ffprobe: ffprobe.split('\n')[0],
      },
      artifacts,
      releaseBlockers: blockers,
    };
    await writeFile(
      join(output, 'render-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: 'wx' },
    );
    await rename(partial, join(output, 'video.mp4'));
    return { outputDir: output, manifest, report, timeline };
  } catch (error) {
    const failure =
      error instanceof MediaError
        ? error
        : error instanceof NarrationError
          ? new MediaError(error.code, stage, sceneId, error.message)
          : error instanceof RenderInputError
            ? new MediaError(
                error.code,
                'visual-preflight',
                error.scene_id,
                error.message,
              )
            : error instanceof RenderStageError
              ? new MediaError(
                  error.code,
                  error.stage,
                  error.scene_id,
                  error.message,
                )
              : new MediaError(
                  'NARRATED_RENDER_FAILED',
                  stage,
                  sceneId,
                  error instanceof z.ZodError
                    ? 'Invalid saved metadata or reviewed timing schema'
                    : `Local ${stage} failed; inspect scene files, runtime and output permissions`,
                );
    const record = {
      code: failure.code,
      stage: failure.stage,
      sceneId: failure.sceneId,
      affectedSceneIds: failure.sceneId
        ? [failure.sceneId]
        : script.scenes.map((s) => s.scene_id),
      reason: failure.message,
    };
    await writeFile(
      join(output, 'render-error.json'),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    throw failure;
  }
}
