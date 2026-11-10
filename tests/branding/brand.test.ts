import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { brandIdentity } from '../../src/branding/identity.ts';
import {
  BRAND,
  BrandProfileSchema,
  resolveBrand,
} from '../../src/branding/profile.ts';
import {
  loadNarrationConfig,
  NarrationConfigSchema,
} from '../../src/config/narration.ts';
import { importDraft } from '../../src/director/core.ts';
import {
  CAPTION,
  MOTION,
  SAFE,
  THEME,
} from '../../src/renderers/remotion/theme.ts';
import { fixtureText } from '../helpers/fixture.ts';

test('consolidated default preserves the production palette, typography, caption geometry and motion', () => {
  assert.equal(THEME.bg, '#101826');
  assert.equal(THEME.flow, '#45B8D8');
  assert.equal(THEME.font, 'Inter Variable, sans-serif');
  assert.equal(BRAND.typography.weights.body, 500);
  assert.equal(BRAND.typography.sizes.s76, 76);
  assert.equal(CAPTION.fontSize, 42);
  assert.equal(CAPTION.bandTop, 1372);
  assert.equal(CAPTION.bandHeight, 152);
  assert.equal(CAPTION.serverLift, 70);
  assert.equal(MOTION.appearFrames, 12);
  assert.equal(MOTION.initialOpacity, 0.85);
  assert.deepEqual(SAFE, { left: 80, right: 920, top: 180, bottom: 1540 });
  assert.equal(BRAND.assets.logo, null);
  assert.equal(BRAND.captions.emphasis, 'none');
});
test('narrator defaults are brand-owned and legacy explicit per-video settings take precedence', async () => {
  const config = await loadNarrationConfig('narration.config.example.json');
  assert.equal(config.settings.voiceId, 'af_heart');
  assert.equal(config.settings.version, 'kokoro-http-v2');
  assert.equal(config.settings.rate, 1);
  assert.equal(config.settings.seed, 0);
  const legacy = JSON.parse(
    await readFile('narration.mock.example.json', 'utf8'),
  );
  const original = { ...legacy.settings, voiceId: 'am_michael', rate: 1.2 };
  const overridden = NarrationConfigSchema.parse({
    ...legacy,
    settings: original,
  });
  assert.deepEqual(overridden.settings, original);
  assert.equal(
    NarrationConfigSchema.parse({ ...legacy, settings: undefined }).settings
      .voiceId,
    'af_heart',
  );
});
test('invalid branding is rejected and all scripts share the same immutable versioned identity', () => {
  assert.throws(() => resolveBrand({ id: 'other', version: '1.0.0' }));
  assert.throws(() =>
    BrandProfileSchema.parse({
      ...BRAND,
      typography: { ...BRAND.typography, font: 'Remote Font' },
    }),
  );
  assert.throws(() =>
    BrandProfileSchema.parse({
      ...BRAND,
      colors: { ...BRAND.colors, bg: 'url(secret)' },
    }),
  );
  assert.throws(() => {
    BRAND.colors.bg = '#000000';
  });
  const first = importDraft(fixtureText);
  const second = importDraft(
    fixtureText.replace('fixture-http-request-001', 'another-script'),
  );
  assert.deepEqual(first.brand, second.brand);
  assert.deepEqual(first.brand, brandIdentity());
});
