import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { RenderInternals } from '@remotion/renderer';
import { z } from 'zod';
import { VIDEO } from './theme.ts';

export const executeFile = promisify(execFile);

// Isolate the version-pinned Remotion binary locator; never downloads or invokes a shell.
export function mediaBinary(type: 'ffmpeg' | 'ffprobe') {
  return RenderInternals.getExecutablePath({
    type,
    indent: false,
    logLevel: 'error',
    binariesDirectory: null,
  });
}

export function executeMedia(type: 'ffmpeg' | 'ffprobe', args: string[]) {
  const binary = mediaBinary(type);
  return executeFile(binary, args, {
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
  });
}

const ProbeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      pix_fmt: z.string().optional(),
      r_frame_rate: z.string().optional(),
      avg_frame_rate: z.string().optional(),
      nb_read_frames: z.string().optional(),
    }),
  ),
  format: z.object({ duration: z.string() }),
});

export async function probeSilentVideo(file: string, frames: number) {
  const { stdout } = await executeMedia('ffprobe', [
    '-v',
    'error',
    '-count_frames',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    file,
  ]);
  const raw: unknown = JSON.parse(stdout);
  return { raw, summary: assertSilentProbe(raw, frames) };
}

export function assertSilentProbe(raw: unknown, frames: number) {
  const probe = ProbeSchema.parse(raw);
  const video = probe.streams[0];
  const duration = Number(probe.format.duration);
  if (
    probe.streams.length !== 1 ||
    video?.codec_type !== 'video' ||
    video.codec_name !== 'h264' ||
    video.width !== VIDEO.width ||
    video.height !== VIDEO.height ||
    video.pix_fmt !== 'yuv420p' ||
    video.r_frame_rate !== '30/1' ||
    video.avg_frame_rate !== '30/1' ||
    Number(video.nb_read_frames) !== frames ||
    !Number.isFinite(duration) ||
    Math.abs(duration - frames / VIDEO.fps) > 1 / VIDEO.fps
  ) {
    throw new Error(
      'Media QC failed: expected one silent H.264/yuv420p 1080x1920@30 stream with the planned frame count/duration',
    );
  }
  return {
    width: video.width,
    height: video.height,
    fps: video.avg_frame_rate,
    frames: Number(video.nb_read_frames),
    duration,
    codec: video.codec_name,
    audioStreams: 0,
  };
}
