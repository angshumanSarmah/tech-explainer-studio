import { z } from 'zod';
export const SettingsSchema = z.strictObject({
  version: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  voiceId: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  language: z.enum(['en-us', 'en-gb']),
  rate: z.number().min(0.5).max(2),
  seed: z.int().min(0).max(2147483647),
  lexiconVersion: z.literal('tech-en-v1'),
});
