import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVideoScriptJson } from '../../src/domain/validation.ts';
import type { VideoScript } from '../../src/domain/videoscript.ts';

export const fixturePath = new URL(
  '../../examples/http-server.videoscript.json',
  import.meta.url,
);
export const fixtureText = readFileSync(fixturePath, 'utf8');
export function fixture(): Extract<VideoScript, { schema_version: '1.0.0' }> {
  const script = parseVideoScriptJson(fixtureText);
  assert.ok(script.schema_version === '1.0.0');
  return script;
}

export function scene(script: VideoScript, index = 1) {
  const result = script.scenes[index];
  assert.ok(result);
  return result;
}

export function animation(script: VideoScript, index = 1) {
  const visual = scene(script, index).visual;
  assert.ok(visual.type === 'tech-animation');
  return visual;
}
