import { inspectPcmWav } from '../audio/wav.ts';
import { MediaError } from './error.ts';

export const SAMPLE_RATE = 24000;
export const SAMPLES_PER_FRAME = 800;

export function pcmData(bytes: Buffer, allowSilent = false): Buffer {
  inspectPcmWav(bytes, allowSilent);
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const size = bytes.readUInt32LE(offset + 4);
    if (bytes.toString('ascii', offset, offset + 4) === 'data')
      return bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error('Validated WAV has no data');
}

export function signalReport(pcm: Buffer, sceneId: string) {
  const samples = pcm.length / 2;
  let peak = 0;
  let clipped = 0;
  let sum = 0;
  let squares = 0;
  let first = -1;
  let last = 0;
  // DC-insensitive RMS over 20ms windows. This is activity detection, not word alignment.
  for (let start = 0; start < samples; start += 480) {
    const end = Math.min(samples, start + 480);
    let windowSum = 0;
    let windowSquares = 0;
    for (let i = start; i < end; i++) {
      const v = pcm.readInt16LE(i * 2);
      peak = Math.max(peak, Math.abs(v));
      if (Math.abs(v) >= 32760) clipped++;
      windowSum += v;
      windowSquares += v * v;
    }
    const n = end - start;
    const rms = Math.sqrt(
      Math.max(0, windowSquares / n - (windowSum / n) ** 2),
    );
    if (rms > 184) {
      // Approximately -45 dBFS; reject silence and constant DC.
      if (first < 0) first = start;
      last = end;
    }
    sum += windowSum;
    squares += windowSquares;
  }
  if (first < 0)
    throw new MediaError(
      'SILENT_AUDIO',
      'audio-qc',
      sceneId,
      'No audible activity above -45 dBFS; repair the scene narration',
    );
  if (clipped)
    throw new MediaError(
      'CLIPPED_AUDIO',
      'audio-qc',
      sceneId,
      'Full-scale audio samples detected; repair narration before assembly',
    );
  return {
    samples,
    peak,
    clipped,
    dcOffset: sum / samples / 32768,
    rmsDbFS: 20 * Math.log10(Math.sqrt(squares / samples) / 32768),
    speechStartSample: first,
    speechEndSample: last,
  };
}

export function wavFromPcm(pcm: Buffer) {
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
