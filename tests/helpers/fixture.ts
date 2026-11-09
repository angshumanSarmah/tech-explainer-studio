import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVideoScriptJson } from '../../src/domain/validation.ts';
import type { VideoScriptV1 } from '../../src/domain/videoscript.ts';

export const fixturePath = new URL(
  '../../examples/http-server.videoscript.json',
  import.meta.url,
);
export const fixtureText = readFileSync(fixturePath, 'utf8');
export function fixture(): VideoScriptV1 {
  return parseVideoScriptJson(fixtureText);
}

export function scene(script: VideoScriptV1, index = 1) {
  const result = script.scenes[index];
  assert.ok(result);
  return result;
}

export function animation(script: VideoScriptV1, index = 1) {
  const visual = scene(script, index).visual;
  assert.ok(visual.type === 'tech-animation');
  return visual;
}
