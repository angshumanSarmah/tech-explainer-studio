import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  type KokoroConfig,
  type NarrationConfig,
  NarrationConfigSchema,
} from '../config/narration.ts';
import { StableIdSchema } from '../domain/visuals.ts';
import { spokenText } from './lexicon.ts';
import { type ProcessRunner, runBoundedProcess } from './process-runner.ts';
import {
  type HealthReport,
  type NarrationArtifact,
  NarrationError,
  type NarrationProvider,
  type NarrationRequest,
} from './types.ts';
import {
  checkAudioTool,
  createMockWav,
  probeWav,
  type WavProbe,
} from './wav.ts';

const sha = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
async function fileHash(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
const identityFields = {
  runtimeVersion: z.literal('0.6.1'),
  onnxRuntimeVersion: z.string().min(1),
  pythonVersion: z.string().min(1),
};
const WorkerSchema = z.union([
  z.strictObject({
    ok: z.literal(false),
    code: z.string().min(1).max(80),
    reason: z.string().min(1).max(500),
  }),
  z.strictObject({
    ok: z.literal(true),
    operation: z.literal('health'),
    ...identityFields,
    voices: z.array(z.string()).max(200),
  }),
  z.strictObject({
    ok: z.literal(true),
    operation: z.literal('synthesize'),
    ...identityFields,
    sampleRate: z.literal(24000),
    samples: z.int().positive(),
  }),
]);
const RequestSchema = z.strictObject({
  sceneId: StableIdSchema,
  text: z
    .string()
    .min(1)
    .max(10000)
    .refine((text) => Boolean(text.trim()), 'Narration must contain text'),
  outputDir: z.string().min(1),
});

export interface ProviderDependencies {
  runner?: ProcessRunner;
  probe?: WavProbe;
}

class LocalNarrationProvider implements NarrationProvider {
  readonly id: 'mock' | 'kokoro-onnx';
  private config: NarrationConfig;
  private runner: ProcessRunner;
  private probe: WavProbe;
  private ready: HealthReport | undefined;
  constructor(config: NarrationConfig, deps: ProviderDependencies) {
    this.config = config;
    this.id = config.provider;
    this.runner = deps.runner ?? runBoundedProcess;
    this.probe = deps.probe ?? probeWav;
  }

  private async worker(
    config: KokoroConfig,
    operation: 'health' | 'synthesize',
    extra?: { text: string; wavPath: string },
  ) {
    const worker = fileURLToPath(
      new URL('./kokoro-worker.py', import.meta.url),
    );
    // The executable comes only from trusted operator configuration, never scene data.
    const result = await this.runner({
      executable: resolve(config.pythonExecutable),
      args: ['-I', '-B', worker],
      input: JSON.stringify({
        operation,
        modelPath: resolve(config.modelPath),
        voicesPath: resolve(config.voicesPath),
        voiceId: config.settings.voiceId,
        rate: config.settings.rate,
        seed: config.settings.seed,
        language: config.settings.language,
        limits: config.limits,
        ...extra,
      }),
      limits: config.limits,
    });
    let response: z.infer<typeof WorkerSchema>;
    try {
      response = WorkerSchema.parse(JSON.parse(result.stdout));
    } catch {
      throw new NarrationError(
        'WORKER_PROTOCOL_ERROR',
        'Worker returned invalid JSON or an incompatible runtime identity',
      );
    }
    if (!response.ok) throw new NarrationError(response.code, response.reason);
    return response;
  }

  async health(): Promise<HealthReport> {
    const config = this.config;
    const checks: HealthReport['checks'] = [];
    const identity: HealthReport['identity'] = {
      modelId: config.provider === 'mock' ? 'mock-tone-v1' : config.modelId,
      modelSha256: null,
      voicesId: config.provider === 'mock' ? 'none' : config.voicesId,
      voicesSha256: null,
      runtimeVersion: config.provider === 'mock' ? 'mock-v1' : null,
    };
    try {
      identity.ffprobe = await checkAudioTool(config.limits);
      checks.push({
        code: 'FFPROBE_READY',
        ok: true,
        reason: 'Bundled ffprobe is available',
      });
    } catch (error) {
      checks.push({
        code: 'FFPROBE_UNAVAILABLE',
        ok: false,
        reason: error instanceof Error ? error.message : 'ffprobe unavailable',
      });
    }
    if (config.provider === 'kokoro-onnx') {
      let python = false;
      try {
        await access(resolve(config.pythonExecutable), constants.X_OK);
        python = true;
        checks.push({
          code: 'PYTHON_READY',
          ok: true,
          reason: 'Configured Python executable is available',
        });
      } catch {
        checks.push({
          code: 'PYTHON_NOT_FOUND',
          ok: false,
          reason:
            'Create .venv with Python 3.12 and install requirements-audio.lock',
        });
      }
      for (const [field, path, expected] of [
        ['model', config.modelPath, config.modelSha256],
        ['voices', config.voicesPath, config.voicesSha256],
      ] as const) {
        let actual: string;
        try {
          const info = await stat(path);
          if (!info.isFile() || !info.size) throw new Error('missing');
          actual = await fileHash(path);
        } catch {
          checks.push({
            code: field === 'model' ? 'MODEL_NOT_FOUND' : 'VOICES_NOT_FOUND',
            ok: false,
            reason: `Provide a readable nonempty local ${field} file at ${resolve(path)}; no automatic downloads occur`,
          });
          continue;
        }
        identity[field === 'model' ? 'modelSha256' : 'voicesSha256'] = actual;
        checks.push({
          code: field === 'model' ? 'MODEL_HASH' : 'VOICES_HASH',
          ok: actual === expected,
          reason:
            actual === expected
              ? 'Local asset hash matches configuration'
              : 'Asset hash differs from configuration; verify the authorized asset/source before changing the expected hash',
        });
      }
      if (python) {
        try {
          const result = await this.worker(config, 'health');
          if (result.operation !== 'health')
            throw new NarrationError(
              'WORKER_PROTOCOL_ERROR',
              'Expected runtime health response',
            );
          Object.assign(identity, {
            runtimeVersion: result.runtimeVersion,
            onnxRuntimeVersion: result.onnxRuntimeVersion,
            pythonVersion: result.pythonVersion,
          });
          checks.push({
            code: 'RUNTIME_READY',
            ok: true,
            reason: 'Pinned Kokoro runtime imports successfully',
          });
          if (identity.voicesSha256)
            checks.push({
              code: 'VOICE_ID',
              ok: result.voices.includes(config.settings.voiceId),
              reason: result.voices.includes(config.settings.voiceId)
                ? 'Configured voice exists in the bundle'
                : 'Configured voiceId is absent; select a voice from this bundle',
            });
        } catch (error) {
          checks.push({
            code:
              error instanceof NarrationError
                ? error.code
                : 'RUNTIME_UNAVAILABLE',
            ok: false,
            reason:
              error instanceof Error
                ? error.message
                : 'Kokoro runtime unavailable',
          });
        }
      }
    } else
      checks.push({
        code: 'MOCK_ONLY',
        ok: true,
        reason: 'Mock is a deterministic test tone, not spoken narration',
      });
    const report = {
      provider: this.id,
      ready: checks.every((item) => item.ok),
      checks,
      identity,
      settings: config.settings,
      limits: config.limits,
    };
    this.ready = report.ready ? report : undefined;
    return report;
  }

  async synthesize(input: NarrationRequest): Promise<NarrationArtifact> {
    const request = RequestSchema.parse(input);
    const text = spokenText(request.text);
    if (
      request.text.length > this.config.limits.maxTextChars ||
      text.length > this.config.limits.maxTextChars
    )
      throw new NarrationError(
        'TEXT_LIMIT',
        'Narration exceeds maxTextChars after pronunciation normalization',
        request.sceneId,
      );
    const health = this.ready ?? (await this.health());
    if (!health.ready) {
      const failed = health.checks.find((check) => !check.ok);
      throw new NarrationError(
        failed?.code ?? 'NOT_READY',
        failed?.reason ?? 'Narration provider is not ready',
        request.sceneId,
      );
    }
    const sceneDir = join(resolve(request.outputDir), request.sceneId);
    await mkdir(resolve(request.outputDir), { recursive: true });
    try {
      await mkdir(sceneDir);
    } catch {
      throw new NarrationError(
        'OUTPUT_EXISTS',
        'Scene output already exists or cannot be created; use a fresh output directory',
        request.sceneId,
      );
    }
    const partial = join(sceneDir, 'narration.partial.wav');
    try {
      let claimedSamples: number | undefined;
      if (this.config.provider === 'mock')
        await writeFile(partial, createMockWav(), { flag: 'wx' });
      else {
        if (
          (await fileHash(this.config.modelPath)) !== this.config.modelSha256 ||
          (await fileHash(this.config.voicesPath)) !== this.config.voicesSha256
        )
          throw new NarrationError(
            'ASSET_CHANGED',
            'Model or voice bundle changed after the health check; verify the configured assets again',
          );
        const result = await this.worker(this.config, 'synthesize', {
          text,
          wavPath: partial,
        });
        if (result.operation !== 'synthesize')
          throw new NarrationError(
            'WORKER_PROTOCOL_ERROR',
            'Expected synthesis result',
          );
        claimedSamples = result.samples;
      }
      const measured = await this.probe(partial, this.config.limits);
      if (
        !Number.isFinite(measured.durationSeconds) ||
        measured.durationSeconds <= 0 ||
        measured.durationSeconds > this.config.limits.maxAudioSeconds ||
        (claimedSamples !== undefined && claimedSamples !== measured.samples)
      )
        throw new NarrationError(
          'INVALID_DURATION',
          'Measured audio does not match the worker sample count or configured limits',
        );
      if (
        this.config.provider === 'kokoro-onnx' &&
        ((await fileHash(this.config.modelPath)) !== this.config.modelSha256 ||
          (await fileHash(this.config.voicesPath)) !== this.config.voicesSha256)
      )
        throw new NarrationError(
          'ASSET_CHANGED',
          'Model or voice bundle changed during synthesis; no artifact is accepted',
        );
      const wavPath = join(sceneDir, `${request.sceneId}.wav`);
      const metadataPath = join(sceneDir, 'narration.json');
      const artifact: NarrationArtifact = {
        schemaVersion: '1.0.0',
        provider: this.id,
        isMock: this.id === 'mock',
        sceneId: request.sceneId,
        wavPath,
        metadataPath,
        sha256: sha(await readFile(partial)),
        ...measured,
        measurement: 'ffprobe',
        originalTextSha256: sha(request.text),
        spokenTextSha256: sha(text),
        settings: this.config.settings,
        identity: health.identity,
        limits: this.config.limits,
      };
      await rename(partial, wavPath);
      await writeFile(metadataPath, `${JSON.stringify(artifact, null, 2)}\n`, {
        flag: 'wx',
      });
      return artifact;
    } catch (error) {
      const failure =
        error instanceof NarrationError
          ? new NarrationError(error.code, error.message, request.sceneId)
          : new NarrationError(
              'NARRATION_FAILED',
              'Local narration failed; inspect the configured runtime, assets and output permissions',
              request.sceneId,
            );
      await writeFile(
        join(sceneDir, 'narration-error.json'),
        `${JSON.stringify({ code: failure.code, sceneId: failure.sceneId, reason: failure.message }, null, 2)}\n`,
      );
      throw failure;
    }
  }
}

export function createNarrationProvider(
  config: unknown,
  deps: ProviderDependencies = {},
): NarrationProvider {
  return new LocalNarrationProvider(NarrationConfigSchema.parse(config), deps);
}
