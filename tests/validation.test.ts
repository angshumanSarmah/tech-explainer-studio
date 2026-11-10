import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseVideoScript,
  parseVideoScriptJson,
  ScriptValidationError,
} from '../src/domain/validation.ts';
import {
  type VideoScript,
  VideoScriptV1Schema,
} from '../src/domain/videoscript.ts';
import { animation, fixture, fixtureText, scene } from './helpers/fixture.ts';

test('HTTP fixture parses without changing any data or estimated timings', () => {
  const parsed = parseVideoScriptJson(fixtureText);
  assert.deepEqual(parsed, JSON.parse(fixtureText));
  assert.equal(parsed.scenes.length, 6);
  assert.equal(
    animation(parsed, 4).props.response?.bodyPreview,
    '<html>...</html>',
  );
  assert.equal(parsed.provenance.model_id, 'none');
});

interface InvalidCase {
  name: string;
  mutate: (script: VideoScript) => void;
  path: string;
  exit?: 2 | 3;
}

const invalidCases: InvalidCase[] = [
  {
    name: 'unknown component',
    mutate: (s) => {
      Object.assign(animation(s), { component: 'UntrustedComponent' });
    },
    path: '["component"]',
    exit: 3,
  },
  {
    name: 'prototype-name component',
    mutate: (s) => {
      Object.assign(animation(s), { component: 'toString' });
    },
    path: '["component"]',
    exit: 3,
  },
  {
    name: 'extra component property',
    mutate: (s) => {
      Object.assign(animation(s).props, { expression: 'process.exit(0)' });
    },
    path: '["expression"]',
  },
  {
    name: 'extra nested property',
    mutate: (s) => {
      Object.assign(animation(s).props.request, { token: 'do-not-log-value' });
    },
    path: '["token"]',
  },
  {
    name: 'extra visual property',
    mutate: (s) => {
      Object.assign(animation(s), { code: 'eval("x")' });
    },
    path: '["code"]',
  },
  {
    name: 'unknown visual type',
    mutate: (s) => {
      Object.assign(scene(s).visual, { type: 'html' });
    },
    path: '["type"]',
    exit: 3,
  },
  {
    name: 'reserved code-trace type',
    mutate: (s) => {
      Object.assign(scene(s), {
        visual: { type: 'code-trace', language: 'js', steps: [] },
      });
    },
    path: '["type"]',
    exit: 3,
  },
  {
    name: 'reserved screen-recording type',
    mutate: (s) => {
      Object.assign(scene(s), {
        visual: {
          type: 'screen-recording',
          fixture_id: 'private',
          actions: [],
        },
      });
    },
    path: '["type"]',
    exit: 3,
  },
  {
    name: 'invalid request method',
    mutate: (s) => {
      Object.assign(animation(s).props.request, { method: 'DELETE' });
    },
    path: '["method"]',
  },
  {
    name: 'unvetted protocol label',
    mutate: (s) => {
      animation(s).props.request.protocolLabel = 'eval()' as 'HTTP/1.1';
    },
    path: '["protocolLabel"]',
  },
  {
    name: 'external URL as path',
    mutate: (s) => {
      animation(s).props.request.path = 'https://example.com';
    },
    path: '["path"]',
  },
  {
    name: 'overlong path',
    mutate: (s) => {
      animation(s).props.request.path = `/${'a'.repeat(200)}`;
    },
    path: '["path"]',
  },
  {
    name: 'command substitution in display path',
    mutate: (s) => {
      animation(s).props.request.path = '/$(id)';
    },
    path: '["path"]',
  },
  {
    name: 'missing response data',
    mutate: (s) => {
      delete animation(s, 4).props.response;
    },
    path: '["response"]',
  },
  {
    name: '204 body',
    mutate: (s) => {
      const response = animation(s, 4).props.response;
      assert.ok(response);
      response.status = 204;
    },
    path: '["bodyPreview"]',
  },
  {
    name: 'invalid status',
    mutate: (s) => {
      const response = animation(s, 4).props.response;
      assert.ok(response);
      response.status = 600;
    },
    path: '["status"]',
  },
  {
    name: 'progress below zero',
    mutate: (s) => {
      Object.assign(animation(s).cues[0]?.trigger ?? {}, { from: -0.1 });
    },
    path: '["from"]',
  },
  {
    name: 'progress above one',
    mutate: (s) => {
      Object.assign(animation(s).cues[0]?.trigger ?? {}, { to: 1.1 });
    },
    path: '["to"]',
  },
  {
    name: 'reversed progress',
    mutate: (s) => {
      Object.assign(animation(s).cues[0]?.trigger ?? {}, {
        from: 0.9,
        to: 0.1,
      });
    },
    path: '["to"]',
  },
  {
    name: 'expression instead of numeric progress',
    mutate: (s) => {
      Object.assign(animation(s).cues[0]?.trigger ?? {}, {
        from: 'frame / fps',
      });
    },
    path: '["from"]',
  },
  {
    name: 'XPath cue target',
    mutate: (s) => {
      const cue = animation(s).cues[0];
      assert.ok(cue);
      cue.action.target = '//button[1]';
    },
    path: '["target"]',
  },
  {
    name: 'script as cue value',
    mutate: (s) => {
      const cue = animation(s).cues[0];
      assert.ok(cue);
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Intentional untrusted expression test data, never interpolate it.
      cue.action.value = '${process.exit(0)}';
    },
    path: '["value"]',
  },
  {
    name: 'command cue action',
    mutate: (s) => {
      Object.assign(animation(s).cues[0]?.action ?? {}, {
        kind: 'exec',
        command: 'touch /tmp/unsafe',
      });
    },
    path: '["kind"]',
  },
  {
    name: 'duplicate cue IDs',
    mutate: (s) => {
      const cue = animation(s).cues[0];
      assert.ok(cue);
      animation(s).cues.push(structuredClone(cue));
    },
    path: '["cue_id"]',
  },
  {
    name: 'missing phrase',
    mutate: (s) => {
      const cue = animation(s).cues[0];
      assert.ok(cue);
      cue.trigger = { kind: 'phrase', text: 'not in narration' };
    },
    path: '["text"]',
  },
  {
    name: 'ambiguous phrase',
    mutate: (s) => {
      scene(s).narration = 'request request';
      const cue = animation(s).cues[0];
      assert.ok(cue);
      cue.trigger = { kind: 'phrase', text: 'request' };
    },
    path: '["text"]',
  },
  {
    name: 'reversed estimated timing',
    mutate: (s) => {
      scene(s).timing.preferred_seconds = 100;
    },
    path: '["preferred_seconds"]',
  },
  {
    name: 'nonfinite timing',
    mutate: (s) => {
      scene(s).timing.max_seconds = Number.POSITIVE_INFINITY;
    },
    path: '["max_seconds"]',
  },
  {
    name: 'duplicate scene IDs',
    mutate: (s) => {
      scene(s, 2).scene_id = scene(s).scene_id;
    },
    path: '["scene_id"]',
  },
  {
    name: 'unknown claim reference',
    mutate: (s) => {
      scene(s).claim_ids = ['missing-claim'];
    },
    path: '["claim_ids"][0]',
  },
  {
    name: 'invalid caption interval',
    mutate: (s) => {
      scene(s).caption_overrides = [
        { text: 'caption', start_ms: 20, end_ms: 10 },
      ];
    },
    path: '["caption_overrides"][0]',
  },
  {
    name: 'caption exceeds estimated max',
    mutate: (s) => {
      scene(s).caption_overrides = [
        { text: 'caption', start_ms: 0, end_ms: 99999 },
      ];
    },
    path: '["caption_overrides"][0]',
  },
  {
    name: 'oversized heading',
    mutate: (s) => {
      Object.assign(scene(s, 0).visual, { heading: 'x'.repeat(91) });
    },
    path: '["heading"]',
  },
];

for (const entry of invalidCases) {
  test(`rejects ${entry.name} with scene/path/reason`, () => {
    const input = fixture();
    entry.mutate(input);
    assert.equal(VideoScriptV1Schema.safeParse(input).success, false);
    assert.throws(
      () => parseVideoScript(input),
      (error: unknown) => {
        assert.ok(error instanceof ScriptValidationError);
        assert.equal(error.exitCode, entry.exit ?? 2);
        const issue = error.issues.find((item) =>
          item.path.includes(entry.path),
        );
        assert.ok(issue, JSON.stringify(error.issues));
        assert.ok(issue.scene_id);
        assert.ok(issue.reason.length > 0);
        assert.ok(!JSON.stringify(error.issues).includes('do-not-log-value'));
        return true;
      },
    );
  });
}

test('accepts normalized progress boundaries and an unambiguous phrase cue', () => {
  const input = fixture();
  const cue = animation(input).cues[0];
  assert.ok(cue);
  cue.trigger = { kind: 'progress', from: 0, to: 1 };
  parseVideoScript(input);
  cue.trigger = { kind: 'progress', from: 1, to: 1 };
  parseVideoScript(input);
  cue.trigger = { kind: 'phrase', text: 'GET slash' };
  parseVideoScript(input);
});

test('accepts a 204 without a body and ordered caption overrides', () => {
  const input = fixture();
  const response = animation(input, 4).props.response;
  assert.ok(response);
  response.status = 204;
  delete response.bodyPreview;
  scene(input).caption_overrides = [
    { text: 'first', start_ms: 0, end_ms: 100 },
    { text: 'second', start_ms: 100, end_ms: 200 },
  ];
  parseVideoScript(input);
});

test('rejects root shape, version, unexpected root fields and mismatched geometry', () => {
  for (const input of [
    null,
    [],
    1,
    'script',
    {},
    { ...fixture(), schema_version: '2.0.0' },
    { ...fixture(), executable: '() => 1' },
    {
      ...fixture(),
      target: { aspect_ratio: '9:16', width: 1920, height: 1080, fps: 30 },
    },
  ]) {
    assert.throws(() => parseVideoScript(input), ScriptValidationError);
  }
});

test('rejects broken source references, duplicate IDs and invalid provenance', () => {
  const input = fixture();
  const source = input.sources[0];
  const claim = input.claims[0];
  assert.ok(source && claim);
  input.sources.push(structuredClone(source));
  input.claims.push(structuredClone(claim));
  claim.source_ids = ['unknown'];
  source.content_sha256 = '<computed-at-ingestion>';
  source.url = 'javascript:alert(1)';
  input.provenance.created_at = 'yesterday';
  assert.throws(() => parseVideoScript(input), ScriptValidationError);
  Reflect.deleteProperty(source, 'content_sha256');
  assert.throws(() => parseVideoScript(input), ScriptValidationError);
});

test('malformed JSON produces a typed error without reflecting confidential input', () => {
  for (const text of [
    '',
    '{',
    '{"secret":"do-not-log-value",}',
    'const script = {};',
    'NaN',
  ]) {
    assert.throws(
      () => parseVideoScriptJson(text),
      (error: unknown) => {
        assert.ok(error instanceof ScriptValidationError);
        assert.equal(error.code, 'MALFORMED_JSON');
        assert.equal(error.exitCode, 2);
        assert.equal(error.issues[0]?.path, '$');
        assert.equal(error.issues[0]?.scene_id, null);
        assert.ok(!JSON.stringify(error).includes('do-not-log-value'));
        return true;
      },
    );
  }
});
