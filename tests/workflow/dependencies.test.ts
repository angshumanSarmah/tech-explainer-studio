import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  audioKey,
  evidenceKey,
  fingerprint,
  narratorConfig,
  sceneKey,
  visualBrand,
} from '../../src/workflow/dependencies.ts';
import { snapshot } from './helpers.ts';

test('dependency matrix separates speech, visual brand, captions, dimensions, waveform and evidence', () => {
  const input = snapshot();
  const scene = input.script.scenes[0];
  assert.ok(scene);
  assert.ok(input.config);
  const brand = visualBrand(input.script);
  const narrator = narratorConfig(input.config);
  const timing = {
    from: 0,
    durationFrames: 30,
    totalFrames: 60,
    captions: [{ text: scene.narration, startFrame: 0, endFrame: 30 }],
  };
  const speech = audioKey(scene, narrator, 'audio-implementation-v1');
  const visual = sceneKey(scene, timing, brand, 'visual-implementation-v1');
  for (const changed of [
    { ...brand, colors: { ...brand.colors, flow: '#FF0000' } },
    {
      ...brand,
      typography: { ...brand.typography, font: 'Another installed font' },
    },
    { ...brand, captions: { ...brand.captions, fontSize: 40 } },
  ]) {
    assert.notEqual(
      sceneKey(scene, timing, changed, 'visual-implementation-v1'),
      visual,
    );
    assert.equal(audioKey(scene, narrator, 'audio-implementation-v1'), speech);
  }
  const voice = {
    ...narrator,
    settings: { ...input.config.settings, voiceId: 'af_bella' },
  };
  const lexicon = {
    ...narrator,
    settings: { ...input.config.settings, lexiconVersion: 'another-lexicon' },
  };
  for (const changed of [voice, lexicon]) {
    assert.notEqual(
      audioKey(scene, changed, 'audio-implementation-v1'),
      speech,
    );
    assert.equal(
      sceneKey(scene, timing, brand, 'visual-implementation-v1'),
      visual,
    ); // same measured pixels, independent waveform
  }
  assert.notEqual(
    sceneKey(
      scene,
      { ...timing, totalFrames: 61 },
      brand,
      'visual-implementation-v1',
    ),
    visual,
  );
  assert.notEqual(
    sceneKey(
      scene,
      { ...timing, captions: [] },
      brand,
      'visual-implementation-v1',
    ),
    visual,
  );
  assert.notEqual(
    sceneKey(scene, timing, brand, 'visual-implementation-v2'),
    visual,
  );
  assert.notEqual(
    sceneKey(scene, timing, brand, 'visual-implementation-v1', {
      width: 720,
      height: 1280,
      fps: 30,
    }),
    visual,
  );
  assert.notEqual(audioKey(scene, narrator, 'audio-implementation-v2'), speech);
  const changed = structuredClone(input);
  const claim = changed.script.claims[0];
  assert.ok(claim);
  claim.text = 'Revised source assertion';
  assert.notEqual(evidenceKey(changed), evidenceKey(input));
  assert.equal(audioKey(scene, narrator, 'audio-implementation-v1'), speech);
  assert.equal(
    sceneKey(scene, timing, brand, 'visual-implementation-v1'),
    visual,
  );
  assert.notEqual(
    fingerprint({ waveform: 'a', visual }),
    fingerprint({ waveform: 'b', visual }),
  );
});
