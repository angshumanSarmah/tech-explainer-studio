import { readFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import type { ResourceLimits } from '../config/narration.ts';
import { executeFile, mediaBinary } from '../renderers/remotion/media-tools.ts';
import { NarrationError } from './types.ts';

export function inspectPcmWav(bytes: Buffer, allowSilent = false) {
  if (!bytes.length)
    throw new NarrationError('EMPTY_WAV', 'Worker produced an empty WAV file');
  if (
    bytes.length < 44 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE' ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    throw new NarrationError(
      'INVALID_WAV',
      'Expected a complete RIFF/WAVE file',
    );
  let format: { channels: number; rate: number; align: number } | undefined;
  let data: Buffer | undefined;
  for (let offset = 12; offset < bytes.length; ) {
    if (offset + 8 > bytes.length)
      throw new NarrationError('INVALID_WAV', 'Incomplete WAV chunk header');
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end + (size % 2) > bytes.length)
      throw new NarrationError('INVALID_WAV', 'Truncated WAV chunk');
    const kind = bytes.toString('ascii', offset, offset + 4);
    if (kind === 'fmt ') {
      if (
        format ||
        size < 16 ||
        bytes.readUInt16LE(offset + 8) !== 1 ||
        bytes.readUInt32LE(offset + 16) !== 48000 ||
        bytes.readUInt16LE(offset + 22) !== 16
      )
        throw new NarrationError('INVALID_WAV', 'Expected 16-bit PCM WAV');
      format = {
        channels: bytes.readUInt16LE(offset + 10),
        rate: bytes.readUInt32LE(offset + 12),
        align: bytes.readUInt16LE(offset + 20),
      };
    }
    if (kind === 'data') {
      if (data)
        throw new NarrationError(
          'INVALID_WAV',
          'Multiple data chunks are unsupported',
        );
      data = bytes.subarray(offset + 8, end);
    }
    offset = end + (size % 2);
  }
  if (
    format?.channels !== 1 ||
    format.rate !== 24000 ||
    format.align !== 2 ||
    !data ||
    !data.length ||
    data.length % 2 !== 0
  )
    throw new NarrationError(
      'EMPTY_WAV',
      'Expected nonempty mono 24 kHz PCM16 audio',
    );
  let peak = 0;
  for (let i = 0; i < data.length; i += 2)
    peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
  if (!peak && !allowSilent)
    throw new NarrationError('EMPTY_WAV', 'Audio samples are entirely silent');
  return { samples: data.length / 2, sampleRate: format.rate, peak };
}

export function createMockWav() {
  const samples = 24000;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 440) / 24000) * 6000),
      44 + i * 2,
    );
  return bytes;
}

const AudioProbeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string(),
      sample_rate: z.string(),
      channels: z.number(),
    }),
  ),
  format: z.object({ duration: z.string() }),
});
export function durationFromProbe(
  raw: unknown,
  samples: number,
  limits: ResourceLimits,
) {
  const result = AudioProbeSchema.safeParse(raw);
  if (!result.success)
    throw new NarrationError(
      'INVALID_DURATION',
      'ffprobe returned incomplete audio metadata',
    );
  const stream = result.data.streams[0];
  const duration = Number(result.data.format.duration);
  if (
    result.data.streams.length !== 1 ||
    stream?.codec_type !== 'audio' ||
    stream.codec_name !== 'pcm_s16le' ||
    stream.sample_rate !== '24000' ||
    stream.channels !== 1 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > limits.maxAudioSeconds ||
    Math.abs(duration - samples / 24000) > 1 / 24000 + 0.000001
  )
    throw new NarrationError(
      'INVALID_DURATION',
      'Expected one PCM16 mono stream with a positive measured duration matching its samples and configured limits',
    );
  return duration;
}

export async function checkAudioTool(limits: ResourceLimits) {
  const executable = mediaBinary('ffprobe');
  try {
    const { stdout } = await executeFile(executable, ['-version'], {
      timeout: Math.min(limits.timeoutMs, 15000),
      maxBuffer: limits.maxProcessOutputBytes,
      env: { DYLD_LIBRARY_PATH: dirname(executable) },
    });
    return stdout.split('\n')[0] ?? 'ffprobe';
  } catch {
    throw new NarrationError(
      'FFPROBE_UNAVAILABLE',
      'Install the pinned npm dependencies so the bundled ffprobe is available',
    );
  }
}

export type WavProbe = (
  file: string,
  limits: ResourceLimits,
) => Promise<{
  durationSeconds: number;
  samples: number;
  sampleRate: number;
  bytes: number;
}>;
export const probeWav: WavProbe = async (file, limits) => {
  const info = await stat(file);
  if (!info.isFile() || info.size > limits.maxWavBytes)
    throw new NarrationError(
      'AUDIO_LIMIT',
      'WAV exceeds the configured byte limit or is not a regular file',
    );
  const bytes = await readFile(file);
  const pcm = inspectPcmWav(bytes);
  const executable = mediaBinary('ffprobe');
  let raw: unknown;
  try {
    const { stdout } = await executeFile(
      executable,
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file],
      {
        timeout: Math.min(limits.timeoutMs, 15000),
        killSignal: 'SIGKILL',
        maxBuffer: limits.maxProcessOutputBytes,
        env: { DYLD_LIBRARY_PATH: dirname(executable) },
      },
    );
    raw = JSON.parse(stdout);
  } catch {
    throw new NarrationError(
      'AUDIO_PROBE_FAILED',
      'ffprobe could not measure this WAV within the configured resource limits',
    );
  }
  return {
    durationSeconds: durationFromProbe(raw, pcm.samples, limits),
    samples: pcm.samples,
    sampleRate: pcm.sampleRate,
    bytes: bytes.length,
  };
};
