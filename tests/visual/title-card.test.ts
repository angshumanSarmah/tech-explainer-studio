import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  directorContract,
  validateStoryboard,
} from '../../src/director/contracts.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { titleCardCopy } from '../../src/visuals/title-card.ts';
import { fixture } from '../helpers/fixture.ts';

const content = {
  label: 'CACHING / CACHE-ASIDE',
  rows: [
    'APP → CACHE: look up product',
    'MISS → DATABASE: fetch product',
    'CACHE ← result; APP ← result',
  ],
  footnote: 'Illustrative cache-aside read path',
} as const;
test('legacy HTTP decorations remain exact; authored cards do not inherit HTTP claims', () => {
  const script = fixture();
  const hook = script.scenes[0]?.visual;
  assert.ok(hook?.type === 'title-card');
  assert.equal(titleCardCopy(hook).label, 'HTTP / ONE REQUEST');
  assert.deepEqual(titleCardCopy(hook).rows, [
    '01   A browser asks',
    '02   A server processes',
    '03   A response returns',
  ]);
  const final = script.scenes.at(-1)?.visual;
  assert.ok(final?.type === 'title-card');
  assert.equal(titleCardCopy(final).rows[0], 'Request: what do you want?');
  const custom = {
    ...hook,
    content: {
      ...content,
      rows: [...content.rows] as [string, string, string],
    },
  };
  assert.deepEqual(titleCardCopy(custom), content);
  assert.equal(JSON.stringify(titleCardCopy(custom)).includes('HTTP'), false);
});
test('authored card data requires v1.1, stays bounded, and exports through the existing Director', () => {
  const legacy = fixture();
  legacy.scenes = legacy.scenes.slice(0, 1);
  const hook = legacy.scenes[0];
  assert.ok(hook?.visual.type === 'title-card');
  const custom = {
    ...legacy,
    schema_version: '1.1.0',
    scenes: [{ ...hook, visual: { ...hook.visual, content } }],
  };
  const parsed = parseVideoScript(custom);
  validateStoryboard(parsed);
  assert.ok(
    JSON.stringify(directorContract(parsed).schema).includes('footnote'),
  );
  assert.throws(() => parseVideoScript({ ...custom, schema_version: '1.0.0' }));
  for (const bad of [
    { ...content, rows: ['one', 'two'] },
    { ...content, rows: ['x'.repeat(39), 'two', 'three'] },
    { ...content, label: 'x'.repeat(37) },
    { ...content, footnote: 'x'.repeat(65) },
    { ...content, html: 'unregistered markup' },
  ]) {
    assert.throws(() =>
      parseVideoScript({
        ...custom,
        scenes: [{ ...hook, visual: { ...hook.visual, content: bad } }],
      }),
    );
  }
});
