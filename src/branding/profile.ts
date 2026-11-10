import { z } from 'zod';
import { SettingsSchema } from '../config/voice-settings.ts';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const size = z.number().positive().max(120);
export const BrandSelectionSchema = z.strictObject({
  id: z.literal('tech-explainer'),
  version: z.literal('1.0.0'),
});
export const BrandProfileSchema = z.strictObject({
  ...BrandSelectionSchema.shape,
  colors: z.strictObject({
    bg: color,
    surface: color,
    text: color,
    muted: color,
    flow: color,
    highlight: color,
    success: color,
    grid: color,
    warning: color,
    error: color,
  }),
  typography: z.strictObject({
    font: z.literal('Inter Variable, sans-serif'),
    lineHeight: z.literal(1.22),
    fontLoad: z.literal('600 48px "Inter Variable"'),
    sizes: z.strictObject({
      s23: size,
      s24: size,
      s26: size,
      s28: size,
      s30: size,
      s32: size,
      s34: size,
      s36: size,
      s42: size,
      s44: size,
      s46: size,
      s68: size,
      s76: size,
    }),
    weights: z.strictObject({
      body: z.literal(500),
      strong: z.literal(650),
      heading: z.literal(700),
    }),
  }),
  captions: z.strictObject({
    layoutVersion: z.literal('separate-caption-band-v2'),
    columns: z.literal(34),
    maxLines: z.literal(3),
    fontSize: z.literal(42),
    lineGap: z.literal(42),
    bandTop: z.literal(1372),
    bandHeight: z.literal(152),
    firstBaseline: z.literal(1420),
    text: color,
    background: color,
    highlight: color,
    emphasis: z.literal('none'),
  }),
  safe: z.strictObject({
    left: z.literal(80),
    right: z.literal(920),
    top: z.literal(180),
    bottom: z.literal(1540),
  }),
  motion: z.strictObject({
    appearFrames: z.literal(12),
    initialOpacity: z.literal(0.85),
    easing: z.literal('linear'),
    intensity: z.literal('subtle'),
  }),
  assets: z.strictObject({
    logo: z.null(),
    watermark: z.null(),
    intro: z.literal('authored-title-card'),
    outro: z.literal('authored-title-card'),
  }),
  narration: SettingsSchema,
});
// Consolidation of the existing production tokens; no palette/font/voice redesign.
export const BRAND = BrandProfileSchema.parse({
  id: 'tech-explainer',
  version: '1.0.0',
  colors: {
    bg: '#101826',
    surface: '#192A3A',
    text: '#EDF4FA',
    muted: '#B0C3D1',
    flow: '#45B8D8',
    highlight: '#F6C56B',
    success: '#5FC8A4',
    grid: '#25384A',
    warning: '#F6C56B',
    error: '#F6C56B',
  },
  typography: {
    font: 'Inter Variable, sans-serif',
    lineHeight: 1.22,
    fontLoad: '600 48px "Inter Variable"',
    sizes: {
      s23: 23,
      s24: 24,
      s26: 26,
      s28: 28,
      s30: 30,
      s32: 32,
      s34: 34,
      s36: 36,
      s42: 42,
      s44: 44,
      s46: 46,
      s68: 68,
      s76: 76,
    },
    weights: { body: 500, strong: 650, heading: 700 },
  },
  captions: {
    layoutVersion: 'separate-caption-band-v2',
    columns: 34,
    maxLines: 3,
    fontSize: 42,
    lineGap: 42,
    bandTop: 1372,
    bandHeight: 152,
    firstBaseline: 1420,
    text: '#EDF4FA',
    background: '#101826',
    highlight: '#F6C56B',
    emphasis: 'none',
  },
  safe: { left: 80, right: 920, top: 180, bottom: 1540 },
  motion: {
    appearFrames: 12,
    initialOpacity: 0.85,
    easing: 'linear',
    intensity: 'subtle',
  },
  assets: {
    logo: null,
    watermark: null,
    intro: 'authored-title-card',
    outro: 'authored-title-card',
  },
  narration: {
    version: 'kokoro-http-v2',
    voiceId: 'af_heart',
    language: 'en-us',
    rate: 1,
    seed: 0,
    lexiconVersion: 'tech-en-v1',
  },
});
function deepFreeze(value: object) {
  for (const item of Object.values(value))
    if (item && typeof item === 'object') deepFreeze(item);
  Object.freeze(value);
}
deepFreeze(BRAND);
export function resolveBrand(selection: unknown = undefined) {
  if (selection !== undefined) BrandSelectionSchema.parse(selection);
  return BRAND;
}
