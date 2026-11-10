import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { LEXICON, spokenText } from '../../src/audio/lexicon.ts';
import type { ProcessRunner } from '../../src/audio/process-runner.ts';
import { createNarrationProvider } from '../../src/audio/provider.ts';
import { NarrationError } from '../../src/audio/types.ts';
import {
  createMockWav,
  durationFromProbe,
  inspectPcmWav,
} from '../../src/audio/wav.ts';
import {
  type KokoroConfig,
  NarrationConfigSchema,
} from '../../src/config/narration.ts';

const folder = await mkdtemp(join(tmpdir(), 'studio-audio-test-'));
after(async () => {
  await rm(folder, { recursive: true, force: true });
});
const mock = NarrationConfigSchema.parse(
  JSON.parse(
    await readFile(
      new URL('../../narration.mock.example.json', import.meta.url),
      'utf8',
    ),
  ),
);
const hash = (bytes: Buffer | string) =>
  createHash('sha256').update(bytes).digest('hex');
const runtime = {
  runtimeVersion: '0.6.1',
  onnxRuntimeVersion: 'test-runtime',
  pythonVersion: '3.12-test',
};
const health = {
  ok: true,
  operation: 'health',
  ...runtime,
  voices: ['af_heart'],
};
async function config(name: string): Promise<KokoroConfig> {
  const modelPath = join(folder, `${name}.onnx`);
  const voicesPath = join(folder, `${name}.bin`);
  await writeFile(modelPath, 'synthetic-model');
  await writeFile(voicesPath, 'synthetic-voices');
  return {
    ...mock,
    provider: 'kokoro-onnx',
    pythonExecutable: process.execPath,
    modelPath,
    modelId: 'test-only-model',
    modelSha256: hash('synthetic-model'),
    voicesPath,
    voicesId: 'test-only-voices',
    voicesSha256: hash('synthetic-voices'),
    settings: { ...mock.settings, voiceId: 'af_heart' },
  };
}
function runner(
  makeWav: () => Buffer = createMockWav,
  onText?: (text: string, args: string[]) => void,
): ProcessRunner {
  return async (job) => {
    const input: { operation: string; text?: string; wavPath?: string } =
      JSON.parse(job.input);
    assert.equal(JSON.parse(job.input).seed, 0);
    if (input.operation === 'health') return { stdout: JSON.stringify(health) };
    assert.ok(input.text && input.wavPath);
    onText?.(input.text, job.args);
    await writeFile(input.wavPath, makeWav());
    return {
      stdout: JSON.stringify({
        ok: true,
        operation: 'synthesize',
        ...runtime,
        sampleRate: 24000,
        samples: 24000,
      }),
    };
  };
}

test('lexicon expands acronyms and preserves whole-word boundaries and literal source text', () => {
  assert.equal(LEXICON.version, 'tech-en-v1');
  assert.equal(
    spokenText('HTTP URL server request response'),
    'H T T P U R L server request response',
  );
  assert.equal(
    spokenText('HTTPS HTTP_SERVER URLencoded'),
    'HTTPS HTTP_SERVER URLencoded',
  );
  assert.equal(
    spokenText('" ; $(touch never) `echo no` <script>not code</script>'),
    '" ; $(touch never) `echo no` <script>not code</script>',
  );
});

test('mock adapter returns clearly marked test tone with real ffprobe duration/checksum and preserves files', async () => {
  const provider = createNarrationProvider(mock);
  assert.equal((await provider.health()).ready, true);
  const artifact = await provider.synthesize({
    sceneId: 'mock-scene',
    text: 'HTTP request',
    outputDir: folder,
  });
  assert.equal(artifact.isMock, true);
  assert.equal(artifact.provider, 'mock');
  assert.equal(artifact.durationSeconds, 1);
  assert.equal(artifact.measurement, 'ffprobe');
  assert.equal(artifact.sha256, hash(await readFile(artifact.wavPath)));
  const metadata = JSON.parse(await readFile(artifact.metadataPath, 'utf8'));
  assert.equal(metadata.settings.version, 'mock-tone-v1');
  assert.equal(metadata.identity.modelId, 'mock-tone-v1');
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'mock-scene',
        text: 'Changed text',
        outputDir: folder,
      }),
    (e: unknown) => e instanceof NarrationError && e.code === 'OUTPUT_EXISTS',
  );
  assert.equal(hash(await readFile(artifact.wavPath)), artifact.sha256);
});

test('missing model/voice files report actionable health and never fall back to mock', async () => {
  const input = await config('missing');
  await rm(input.modelPath);
  await rm(input.voicesPath);
  const provider = createNarrationProvider(input, { runner: runner() });
  const report = await provider.health();
  assert.equal(report.ready, false);
  assert.ok(report.checks.some((c) => c.code === 'MODEL_NOT_FOUND' && !c.ok));
  assert.ok(report.checks.some((c) => c.code === 'VOICES_NOT_FOUND' && !c.ok));
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'missing-scene',
        text: 'HTTP',
        outputDir: folder,
      }),
    (e: unknown) => e instanceof NarrationError && e.code === 'MODEL_NOT_FOUND',
  );
});

test('asset hash and voice ID are checked before accepting narration', async () => {
  const input = await config('bad-hash');
  input.modelSha256 = '0'.repeat(64);
  assert.equal(
    (await createNarrationProvider(input, { runner: runner() }).health()).ready,
    false,
  );
  const valid = await config('bad-voice');
  const provider = createNarrationProvider(valid, {
    runner: async () => ({
      stdout: JSON.stringify({ ...health, voices: ['bf_other'] }),
    }),
  });
  const report = await provider.health();
  assert.equal(report.ready, false);
  assert.ok(report.checks.some((c) => c.code === 'VOICE_ID' && !c.ok));
});

test('Kokoro bridge sends normalized narration only over JSON stdin, never in command arguments', async () => {
  const input = await config('escaping');
  let received = '';
  const text = 'HTTP "quotes"; $(touch NEVER) `echo nope`\\\nURL request';
  const provider = createNarrationProvider(input, {
    runner: runner(createMockWav, (value, args) => {
      received = value;
      assert.deepEqual(args.slice(0, 2), ['-I', '-B']);
      assert.ok(
        !args.some((arg) => arg.includes('NEVER') || arg.includes('HTTP')),
      );
    }),
  });
  const artifact = await provider.synthesize({
    sceneId: 'escaped',
    text,
    outputDir: folder,
  });
  assert.equal(received, spokenText(text));
  assert.equal(artifact.spokenTextSha256, hash(received));
  assert.equal(artifact.identity.runtimeVersion, '0.6.1');
  assert.equal(artifact.identity.modelSha256, input.modelSha256);
});

test('worker failure reports scene and keeps a failure record without a successful WAV artifact', async () => {
  const input = await config('failure');
  const provider = createNarrationProvider(input, {
    runner: async (job) =>
      JSON.parse(job.input).operation === 'health'
        ? { stdout: JSON.stringify(health) }
        : Promise.reject(
            new NarrationError('PROCESS_FAILED', 'Synthetic process failure'),
          ),
  });
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'failed-scene',
        text: 'HTTP',
        outputDir: folder,
      }),
    (e: unknown) =>
      e instanceof NarrationError &&
      e.code === 'PROCESS_FAILED' &&
      e.sceneId === 'failed-scene',
  );
  assert.equal(
    JSON.parse(
      await readFile(join(folder, 'failed-scene/narration-error.json'), 'utf8'),
    ).code,
    'PROCESS_FAILED',
  );
});

for (const [name, makeWav] of [
  ['empty', () => Buffer.alloc(0)],
  [
    'silent',
    () => {
      const wav = createMockWav();
      wav.fill(0, 44);
      return wav;
    },
  ],
  ['truncated', () => createMockWav().subarray(0, 200)],
] as const) {
  test(`rejects ${name} WAV output`, async () => {
    const input = await config(name);
    const provider = createNarrationProvider(input, {
      runner: runner(makeWav),
    });
    await assert.rejects(
      () =>
        provider.synthesize({
          sceneId: `wav-${name}`,
          text: 'HTTP',
          outputDir: folder,
        }),
      NarrationError,
    );
  });
}

test('ffprobe durations must be finite, positive, within limits and agree with real samples', () => {
  const raw = {
    streams: [
      {
        codec_type: 'audio',
        codec_name: 'pcm_s16le',
        sample_rate: '24000',
        channels: 1,
      },
    ],
    format: { duration: '1' },
  };
  assert.equal(durationFromProbe(raw, 24000, mock.limits), 1);
  for (const duration of ['NaN', 'Infinity', '0', '-1', '2', 'N/A'])
    assert.throws(
      () =>
        durationFromProbe({ ...raw, format: { duration } }, 24000, mock.limits),
      NarrationError,
    );
  assert.throws(
    () =>
      durationFromProbe(
        { ...raw, streams: [...raw.streams, { codec_type: 'video' }] },
        24000,
        mock.limits,
      ),
    NarrationError,
  );
  assert.equal(inspectPcmWav(createMockWav()).samples, 24000);
});

test('strict config and input limits reject unknown controls, executable scene IDs and excessive text', async () => {
  assert.equal(
    NarrationConfigSchema.safeParse({
      ...mock,
      apiKey: 'not-a-supported-setting',
    }).success,
    false,
  );
  assert.equal(
    NarrationConfigSchema.safeParse({
      ...mock,
      settings: { ...mock.settings, rate: 0 },
    }).success,
    false,
  );
  const provider = createNarrationProvider(mock);
  await assert.rejects(() =>
    provider.synthesize({
      sceneId: '../escape',
      text: 'HTTP',
      outputDir: folder,
    }),
  );
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'too-long',
        text: 'x'.repeat(2001),
        outputDir: folder,
      }),
    (e: unknown) => e instanceof NarrationError && e.code === 'TEXT_LIMIT',
  );
});

test('worker protocol errors and contradictory sample counts fail explicitly', async () => {
  const input = await config('protocol');
  const invalid = createNarrationProvider(input, {
    runner: async () => ({ stdout: 'not-json' }),
  });
  assert.equal((await invalid.health()).ready, false);
  const provider = createNarrationProvider(input, {
    runner: async (job) => {
      const result = await runner()(job);
      const value = JSON.parse(result.stdout);
      if (value.operation === 'synthesize') value.samples = 1;
      return { stdout: JSON.stringify(value) };
    },
  });
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'contradictory',
        text: 'HTTP',
        outputDir: folder,
      }),
    (e: unknown) =>
      e instanceof NarrationError && e.code === 'INVALID_DURATION',
  );
});

test('asset edits after health invalidate synthesis without overwriting earlier scenes', async () => {
  const input = await config('changed-asset');
  const provider = createNarrationProvider(input, { runner: runner() });
  const artifact = await provider.synthesize({
    sceneId: 'before-change',
    text: 'HTTP request',
    outputDir: folder,
  });
  await writeFile(input.modelPath, 'changed-model');
  await assert.rejects(
    () =>
      provider.synthesize({
        sceneId: 'after-change',
        text: 'HTTP response',
        outputDir: folder,
      }),
    (error: unknown) =>
      error instanceof NarrationError &&
      error.code === 'ASSET_CHANGED' &&
      error.sceneId === 'after-change',
  );
  assert.equal(hash(await readFile(artifact.wavPath)), artifact.sha256);
});

test('WAV validation rejects inconsistent byte rates and incomplete trailing chunks', () => {
  const badRate = createMockWav();
  badRate.writeUInt32LE(1, 28);
  assert.throws(() => inspectPcmWav(badRate), NarrationError);
  const trailing = Buffer.concat([createMockWav(), Buffer.from([0])]);
  trailing.writeUInt32LE(trailing.length - 8, 4);
  assert.throws(() => inspectPcmWav(trailing), NarrationError);
});
