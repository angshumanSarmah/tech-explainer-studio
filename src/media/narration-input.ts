import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { probeWav } from '../audio/wav.ts';
import { hash, NarrationArtifactSchema } from '../render-manifest/manifest.ts';
import { assessText, hasUnsafeJson } from '../sources/safety.ts';
import { MediaError } from './error.ts';
import { pcmData, signalReport } from './pcm.ts';

/** Validate fixed local filenames, never paths supplied by metadata. Shared with the job importer. */
export async function loadNarrationAsset(
  scene: { scene_id: string; narration: string },
  folder: string,
) {
  const sceneId = scene.scene_id;
  const metaPath = join(folder, 'narration.json');
  const metaInfo = await lstat(metaPath);
  if (!metaInfo.isFile() || metaInfo.size > 65536)
    throw new MediaError(
      'NARRATION_METADATA',
      'narration',
      sceneId,
      'Saved narration metadata must be a regular JSON file of at most 64 KiB',
    );
  const raw: unknown = JSON.parse(await readFile(metaPath, 'utf8'));
  if (hasUnsafeJson(raw) || assessText(JSON.stringify(raw)).length)
    throw new MediaError(
      'UNSAFE_METADATA',
      'narration',
      sceneId,
      'Saved metadata contains known instructions or credential-like text',
    );
  const metadata = NarrationArtifactSchema.parse(raw);
  const wavPath = join(folder, `${sceneId}.wav`);
  const info = await lstat(wavPath);
  if (!info.isFile() || info.size > metadata.limits.maxWavBytes)
    throw new MediaError(
      'AUDIO_LIMIT',
      'narration',
      sceneId,
      'Saved WAV exceeds its byte limit or is not a regular file',
    );
  const bytes = await readFile(wavPath);
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
      'Scene/text/WAV hash differs from saved narration; regenerate this scene explicitly',
    );
  const measured = await probeWav(wavPath, metadata.limits);
  if (
    measured.samples !== metadata.samples ||
    Math.abs(measured.durationSeconds - metadata.durationSeconds) > 1 / 24000
  )
    throw new MediaError(
      'NARRATION_MEASUREMENT',
      'narration',
      sceneId,
      'Saved duration/sample count differs from independent ffprobe measurement',
    );
  const pcm = pcmData(bytes);
  if (pcm.length / 2 !== measured.samples)
    throw new MediaError(
      'NARRATION_MEASUREMENT',
      'narration',
      sceneId,
      'Validated PCM bytes differ from measured sample count',
    );
  const signal = signalReport(pcm, sceneId);
  return {
    sceneId,
    sha256: metadata.sha256,
    textSha256: metadata.originalTextSha256,
    ...measured,
    ...signal,
    metadata,
    wavPath,
    pcm,
    wavBytes: bytes,
  };
}
