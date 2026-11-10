import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { BRAND, BrandSelectionSchema } from '../branding/profile.ts';
import { SettingsSchema } from './voice-settings.ts';

export { SettingsSchema } from './voice-settings.ts';

export const LimitsSchema = z.strictObject({
  timeoutMs: z.int().min(100).max(600000),
  cpuSeconds: z.int().min(1).max(600),
  threads: z.int().min(1).max(4),
  maxTextChars: z.int().min(1).max(10000),
  maxProcessOutputBytes: z.int().min(256).max(1048576),
  maxWavBytes: z.int().min(1024).max(67108864),
  maxAudioSeconds: z.number().positive().max(600),
});
const path = z.string().min(1).max(4096);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const base = {
  schemaVersion: z.literal('1.0.0'),
  brand: BrandSelectionSchema.optional(),
  settings: SettingsSchema.prefault(BRAND.narration),
  limits: LimitsSchema,
};
export const NarrationConfigSchema = z.discriminatedUnion('provider', [
  z.strictObject({ ...base, provider: z.literal('mock') }),
  z.strictObject({
    ...base,
    provider: z.literal('kokoro-onnx'),
    pythonExecutable: path,
    modelPath: path,
    modelId: z.string().min(1).max(100),
    modelSha256: sha,
    voicesPath: path,
    voicesId: z.string().min(1).max(100),
    voicesSha256: sha,
  }),
]);
export type NarrationConfig = z.infer<typeof NarrationConfigSchema>;
export type KokoroConfig = Extract<
  NarrationConfig,
  { provider: 'kokoro-onnx' }
>;
export type VoiceSettings = NarrationConfig['settings'];
export type ResourceLimits = NarrationConfig['limits'];

export async function loadNarrationConfig(
  file: string,
): Promise<NarrationConfig> {
  const config = NarrationConfigSchema.parse(
    JSON.parse(await readFile(file, 'utf8')),
  );
  if (config.provider === 'mock') return config;
  const base = dirname(resolve(file));
  return {
    ...config,
    pythonExecutable: resolve(base, config.pythonExecutable),
    modelPath: resolve(base, config.modelPath),
    voicesPath: resolve(base, config.voicesPath),
  };
}
