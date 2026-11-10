import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { executeFile, mediaBinary } from '../renderers/remotion/media-tools.ts';
import {
  type Caption,
  type Timeline,
  validateCaptions,
} from '../timing/timeline.ts';
import { MediaError } from './error.ts';
import { pcmData, signalReport } from './pcm.ts';

export type MediaRunner = (
  type: 'ffmpeg' | 'ffprobe',
  args: string[],
) => Promise<{ stdout: string }>;
export const runMedia: MediaRunner = async (type, args) => {
  const executable = mediaBinary(type);
  return executeFile(executable, args, {
    env: { DYLD_LIBRARY_PATH: dirname(executable) },
    timeout: 120000,
    killSignal: 'SIGKILL',
    maxBuffer: 4 * 1024 * 1024,
  });
};
const ProbeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      pix_fmt: z.string().optional(),
      avg_frame_rate: z.string().optional(),
      r_frame_rate: z.string().optional(),
      nb_read_frames: z.string().optional(),
      duration: z.string().optional(),
      sample_rate: z.string().optional(),
      channels: z.number().optional(),
    }),
  ),
  format: z.object({ duration: z.string() }),
});
export function assertNarratedProbe(raw: unknown, frames: number) {
  const result = ProbeSchema.safeParse(raw);
  if (!result.success)
    throw new MediaError(
      'MEDIA_PROBE_INVALID',
      'ffprobe',
      null,
      'ffprobe metadata is incomplete',
    );
  const probe = result.data;
  const video = probe.streams.filter((s) => s.codec_type === 'video');
  const audio = probe.streams.filter((s) => s.codec_type === 'audio');
  const v = video[0];
  const a = audio[0];
  const expected = frames / 30;
  const durations = [
    Number(probe.format.duration),
    Number(v?.duration),
    Number(a?.duration),
  ];
  if (
    !Number.isSafeInteger(frames) ||
    frames < 2 ||
    probe.streams.length !== 2 ||
    video.length !== 1 ||
    audio.length !== 1 ||
    v?.codec_name !== 'h264' ||
    v.width !== 1080 ||
    v.height !== 1920 ||
    v.pix_fmt !== 'yuv420p' ||
    v.avg_frame_rate !== '30/1' ||
    v.r_frame_rate !== '30/1' ||
    Number(v.nb_read_frames) !== frames ||
    a?.codec_name !== 'aac' ||
    a.sample_rate !== '24000' ||
    a.channels !== 1 ||
    durations.some(
      (d) =>
        !Number.isFinite(d) ||
        d <= 0 ||
        Math.abs(d - expected) > 1 / 30 + 1024 / 24000,
    )
  )
    throw new MediaError(
      'MEDIA_QC_FAILED',
      'ffprobe',
      null,
      'Expected one 1080x1920@30 H.264/yuv420p video and one mono 24kHz AAC stream, exact video frames and durations within one frame plus one AAC packet',
    );
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    frames,
    durationSeconds: Number(probe.format.duration),
    videoCodec: 'h264',
    audioCodec: 'aac',
    streams: 2,
    toleranceSeconds: 1 / 30 + 1024 / 24000,
  };
}
export function checkTiming(
  timeline: Timeline,
  captions: Caption[],
  strict: boolean,
  isMock: boolean,
) {
  validateCaptions(captions, timeline.scenes, timeline.durationFrames);
  if (strict && (timeline.requiresTimingReview || isMock))
    throw new MediaError(
      'REVIEW_REQUIRED',
      'release-check',
      null,
      'Strict media checks reject mock audio and unreviewed scene-span/override captions; supply real narration and reviewed word alignment',
    );
}
export async function muxNarration(
  video: string,
  wav: string,
  output: string,
  runner: MediaRunner = runMedia,
) {
  try {
    await runner('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      video,
      '-i',
      wav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '24000',
      '-ac',
      '1',
      '-movflags',
      '+faststart',
      output,
    ]);
  } catch {
    throw new MediaError(
      'FFMPEG_FAILED',
      'mux',
      null,
      'FFmpeg could not mux the measured scene sequence; inspect narration/video artifacts and local codec support',
    );
  }
}
export async function probeNarratedVideo(
  file: string,
  frames: number,
  runner: MediaRunner = runMedia,
) {
  let raw: unknown;
  try {
    raw = JSON.parse(
      (
        await runner('ffprobe', [
          '-v',
          'error',
          '-count_frames',
          '-show_streams',
          '-show_format',
          '-of',
          'json',
          file,
        ])
      ).stdout,
    );
  } catch {
    throw new MediaError(
      'FFPROBE_FAILED',
      'ffprobe',
      null,
      'ffprobe could not independently inspect the assembled video',
    );
  }
  return { raw, summary: assertNarratedProbe(raw, frames) };
}
export async function inspectDecodedAudio(
  file: string,
  output: string,
  timeline: Timeline,
  runner: MediaRunner = runMedia,
) {
  try {
    await runner('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      file,
      '-map',
      '0:a:0',
      '-c:a',
      'pcm_s16le',
      '-ar',
      '24000',
      '-ac',
      '1',
      output,
    ]);
  } catch {
    throw new MediaError(
      'AUDIO_DECODE_FAILED',
      'decoded-audio-qc',
      null,
      'Cannot decode the final AAC track to independently check every scene',
    );
  }
  // Structural parse permits silence here only so the scene-level check can name it.
  // Every source WAV still uses the default silence-rejecting validator.
  const pcm = pcmData(await readFile(output), true);
  const reports = timeline.scenes.map((item) => {
    const start = item.from * 800 * 2;
    const end = start + item.audioSamples * 2;
    if (end > pcm.length)
      throw new MediaError(
        'AUDIO_TRUNCATED',
        'decoded-audio-qc',
        item.scene.scene_id,
        'Final AAC track does not cover this scene',
      );
    return {
      sceneId: item.scene.scene_id,
      ...signalReport(pcm.subarray(start, end), item.scene.scene_id),
    };
  });
  return reports;
}
