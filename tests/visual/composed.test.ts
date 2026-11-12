import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { directorContract } from '../../src/director/contracts.ts';
import {
  assertDirectorDataSize,
  DirectorDraftSchema,
  importDraft,
} from '../../src/director/core.ts';
import { COMPOSED_EXAMPLE } from '../../src/domain/composed.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import type { VideoScript } from '../../src/domain/videoscript.ts';
import { libraryRegistry } from '../../src/domain/visual-library-registry.ts';
import {
  boundaryState,
  canonical,
  compileVisualPlan,
  composedState,
  UnsupportedCapability,
} from '../../src/renderers/remotion/compile.ts';
import { planSilentRender } from '../../src/renderers/remotion/plan.ts';
import { boundaryPacing } from '../../src/timing/pacing.ts';
import { planNarratedRender } from '../../src/timing/timeline.ts';
import { audioKey, sceneKey } from '../../src/workflow/dependencies.ts';
import { fixture } from '../helpers/fixture.ts';

function input() {
  const old = fixture(),
    base = required(old.scenes[1]);
  return parseVideoScript({
    ...old,
    schema_version: '1.2.0',
    scenes: [0, 1].map((i) => ({
      ...base,
      scene_id: `composed-${i}`,
      narration: 'One token moves.',
      timing: { min_seconds: 4, preferred_seconds: 4, max_seconds: 8 },
      visual: {
        type: 'composed',
        component: 'ComposedScene',
        props: structuredClone(COMPOSED_EXAMPLE),
        cues: [
          {
            cue_id: 'delivery',
            trigger: { kind: 'progress', from: 0.2, to: 0.8 },
            action: { kind: 'move', target: 'message', value: 'delivery' },
          },
        ],
      },
      ...(i ? { transition: { kind: 'crossfade', preset: 'short' } } : {}),
    })),
  });
}
const compile = (s: VideoScript) =>
  compileVisualPlan(s, planSilentRender(s).scenes);

test('1.2 composition is additive: old scripts reject new fields; malformed graphs, budgets and code fail closed', () => {
  const s = input();
  for (const version of ['1.0.0', '1.1.0'])
    assert.throws(() => parseVideoScript({ ...s, schema_version: version }));
  assert.deepEqual(parseVideoScript(fixture()), fixture());
  for (const mutate of [
    (v: Record<string, unknown>) => {
      v.code = 'return process.env';
    },
    (v: Record<string, unknown>) => {
      v.layout = 'arbitrary-physics';
    },
    (v: Record<string, unknown>) => {
      v.entities = Array(9).fill({
        id: 'x',
        kind: 'node',
        slot: 0,
        label: 'x',
        role: 'flow',
        depth: 'flat',
      });
    },
    (v: Record<string, unknown>) => {
      v.links = [{ id: 'bad', from: 'sender', to: 'missing' }];
    },
    (v: Record<string, unknown>) => {
      v.groups = [{ id: 'g', label: 'g', members: ['g'] }];
    },
  ]) {
    const changed = structuredClone(s);
    const visual = required(changed.scenes[0]).visual;
    assert.equal(visual.type, 'composed');
    if (visual.type !== 'composed') throw new Error();
    mutate(visual.props);
    assert.throws(() => parseVideoScript(changed));
  }
  const changed = structuredClone(s);
  const v = required(changed.scenes[0]).visual;
  if (v.type !== 'composed') throw new Error();
  required(v.cues[0]).action.target = 'unknown';
  assert.throws(
    () => compile(changed),
    (e) =>
      e instanceof UnsupportedCapability &&
      e.scene_id === 'composed-0' &&
      e.path.includes('cues'),
  );
});

test('multiple semantic objects move deterministically under shuffled frames with fixed geometry and bounded focus', () => {
  const s = input(),
    p = compile(s),
    scene = required(p.scenes[0]);
  const snapshots = Array.from({ length: 120 }, (_, f) =>
    canonical(composedState(scene, f)),
  );
  for (const f of [119, 0, 60, 1, 90, 15, 61])
    assert.equal(canonical(composedState(scene, f)), snapshots[f]);
  const first = composedState(scene, 0),
    last = composedState(scene, 119);
  assert.equal(first.entities.length, 3);
  assert.notEqual(required(first.entities[2]).x, required(last.entities[2]).x);
  assert.equal(required(first.entities[0]).x, required(last.entities[0]).x);
  assert.equal(canonical(compile(s)), canonical(p));
});

test('finite action handlers preserve visibility/state and camera bounds; excess concurrency fails explicitly', () => {
  const s = input(),
    v = required(s.scenes[0]).visual;
  if (v.type !== 'composed') throw new Error();
  v.props.camera = 'gentle-focus';
  const cue = (
    id: string,
    kind: 'appear' | 'disappear' | 'highlight' | 'focus' | 'update_field',
    target: string,
    from: number,
    to: number,
    value?: string,
  ) => ({
    cue_id: id,
    trigger: { kind: 'progress' as const, from, to },
    action: { kind, target, ...(value ? { value } : {}) },
  });
  v.cues = [
    cue('show', 'appear', 'message', 0.1, 0.2),
    cue('emphasis', 'highlight', 'sender', 0.2, 0.4),
    cue('state', 'update_field', 'receiver', 0.4, 0.5, 'Ready'),
    cue('camera', 'focus', 'receiver', 0.5, 0.6),
    cue('hide', 'disappear', 'message', 0.7, 0.9),
  ];
  const p = required(compile(s).scenes[0]);
  assert.equal(
    required(
      composedState(p, 0).entities.find((e) => e.entity.id === 'message'),
    ).opacity,
    0,
  );
  assert.equal(
    required(
      composedState(p, 45).entities.find((e) => e.entity.id === 'message'),
    ).opacity,
    1,
  );
  assert.equal(
    required(
      composedState(p, 119).entities.find((e) => e.entity.id === 'message'),
    ).opacity,
    0,
  );
  assert.equal(
    required(
      composedState(p, 100).entities.find((e) => e.entity.id === 'receiver'),
    ).status,
    'Ready',
  );
  assert.ok(composedState(p, 65).camera.zoom > 1);
  assert.ok(composedState(p, 65).camera.zoom <= 1.04);
  v.props.entities.push(
    { id: 'second', kind: 'token', at: 'sender', label: 'B', role: 'flow' },
    { id: 'third', kind: 'token', at: 'sender', label: 'C', role: 'flow' },
  );
  v.cues = ['message', 'second', 'third'].map((target, i) => ({
    cue_id: `move-${i}`,
    trigger: { kind: 'progress', from: 0.2, to: 0.8 },
    action: { kind: 'move', target, value: 'delivery' },
  }));
  assert.throws(() => compile(s), /At most two concurrent/);
});

test('shared specialized/mixed crossfade and composed handoff preserve partitions and reject incompatible pairs', () => {
  const s = input();
  const specialized = {
    type: 'registered-animation',
    component: 'CacheAsideScene',
    taxonomy_version: '1.0.0',
    props: libraryRegistry.CacheAsideScene.example,
    cues: [],
  };
  for (const visuals of [
    [specialized, specialized],
    [specialized, required(s.scenes[0]).visual],
    [required(s.scenes[0]).visual, specialized],
  ]) {
    const t = parseVideoScript({
      ...s,
      scenes: s.scenes.map((scene, i) => ({ ...scene, visual: visuals[i] })),
    });
    const p = compile(t);
    assert.equal(p.durationFrames, 240);
    assert.equal(required(p.scenes[1]).from, 120);
    assert.equal(boundaryState(p, 1, 0).progress, 0);
    assert.equal(boundaryState(p, 1, 11).progress, 1);
    assert.equal(boundaryState(p, 1, 12).active, false);
  }
  const matched = parseVideoScript({
    ...s,
    scenes: s.scenes.map((scene, i) => ({
      ...scene,
      ...(i
        ? {
            transition: {
              kind: 'match',
              preset: 'short',
              entityIds: ['sender'],
            },
          }
        : {}),
    })),
  });
  assert.equal(required(compile(matched).scenes[1]).boundary.kind, 'match');
  const bad = structuredClone(matched);
  const v = required(bad.scenes[1]).visual;
  if (v.type !== 'composed') throw new Error();
  required(v.props.entities[0]).label = 'Different meaning';
  assert.throws(() => compile(bad), UnsupportedCapability);
  assert.throws(
    () =>
      compile(
        parseVideoScript({
          ...s,
          scenes: s.scenes.map((scene, i) => ({
            ...scene,
            ...(i
              ? {
                  visual: {
                    type: 'title-card',
                    heading: 'Cut only',
                    variant: 'hook',
                  },
                }
              : {}),
          })),
        }),
      ),
    UnsupportedCapability,
  );
});

test('both neighboring visual dependencies invalidate boundary consumers while retaining audio keys', () => {
  const s = input(),
    baseline = compile(s);
  const keys = (x: VideoScript) => {
    const p = compile(x);
    return p.scenes.map((c, i) =>
      sceneKey(
        required(x.scenes[i]),
        {
          compiled: c.dependency,
          from: c.from,
          durationFrames: c.durationFrames,
        },
        'brand',
        'impl',
      ),
    );
  };
  const old = keys(s),
    speech = s.scenes.map((scene) => audioKey(scene, 'narrator', 'audio-impl'));
  for (const i of [0, 1]) {
    const changed = structuredClone(s),
      v = required(changed.scenes[i]).visual;
    if (v.type !== 'composed') throw new Error();
    required(v.props.entities[0]).role = 'highlight';
    assert.notEqual(keys(changed)[1], old[1]);
    assert.deepEqual(
      changed.scenes.map((scene) => audioKey(scene, 'narrator', 'audio-impl')),
      speech,
    );
  }
  assert.equal(required(baseline.scenes[1]).boundary.frames, 12);
});

test('Phase 04 resolves composed phrase cues only against exact reviewed WAV/text words; reports 900ms pacing decomposition', () => {
  const s = input();
  const v = required(s.scenes[0]).visual;
  if (v.type !== 'composed') throw new Error();
  required(v.cues[0]).trigger = { kind: 'phrase', text: 'token' };
  const audio = s.scenes.map((scene, i) => ({
    sceneId: scene.scene_id,
    samples: i ? 96784 : 81664,
    sha256: 'a'.repeat(64),
    textSha256: 'b'.repeat(64),
    speechStartSample: 960,
    speechEndSample: i ? 90240 : 75360,
  }));
  assert.throws(
    () => planNarratedRender(s, audio, { allowFallback: true }),
    /reviewed word/,
  );
  required(v.cues[0]).trigger = { kind: 'progress', from: 0.2, to: 0.8 };
  const timeline = planNarratedRender(s, audio, { allowFallback: true });
  const report = boundaryPacing(timeline, audio, s.scenes),
    b = required(report.boundaries[0]);
  assert.equal(b.milliseconds, 900);
  assert.equal(b.paddingSamples, 14336);
  assert.equal(
    b.gapSamples,
    b.trailingSamples + b.paddingSamples + b.leadingSamples,
  );
  assert.equal(b.requiresHumanReview, true);
  assert.equal(b.classification, 'unresolved');
  assert.equal(required(timeline.scenes[0]).audioSamples, 81664);
  assert.equal(required(timeline.scenes[1]).from, 120);
});

test('export uses current strict composition catalog within context bounds; historical draft identities stay readable', () => {
  const c = directorContract(fixture());
  assert.equal(c.currentVideoScriptVersion, '1.2.0');
  const { schema: _schema, ...generation } = c;
  assert.ok(Buffer.byteLength(JSON.stringify(generation)) < 98304);
  assertDirectorDataSize({
    contract: generation,
    evidence: [],
    repairDiagnostics: [],
  });
  assert.throws(
    () =>
      assertDirectorDataSize({
        contract: generation,
        evidence: [],
        repairDiagnostics: [{ path: '$', reason: 'x'.repeat(98304) }],
      }),
    /Complete contract\/evidence\/feedback/,
  );
  const draft = importDraft(JSON.stringify(input()));
  for (const version of [
    'director-1.0.0',
    'director-1.1.0',
    'director-1.2.0',
  ] as const) {
    const historical = { ...draft, prompt: { ...draft.prompt, version } };
    assert.equal(DirectorDraftSchema.parse(historical).prompt.version, version);
  }
});

test('actual renderer bindings execute for every exported component, not only matching source text', () => {
  const result = spawnSync(process.execPath, ['--input-type=module'], {
    encoding: 'utf8',
    input: `
    import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import esbuild from 'esbuild';
    registerHooks({load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:esbuild.transformSync(readFileSync(new URL(url),'utf8'),{loader:'tsx',jsx:'automatic',format:'esm',target:'es2023'}).code};return next(url,context);}});
    const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
    const {renderRegistry}=await import('./src/renderers/remotion/registry.tsx');const {componentRegistry}=await import('./src/domain/visuals.ts');
    const {compileVisualPlan}=await import('./src/renderers/remotion/compile.ts');const {planSilentRender}=await import('./src/renderers/remotion/plan.ts');
    const f=JSON.parse(readFileSync('examples/http-server.videoscript.json','utf8'));const ids=Object.keys(componentRegistry);if(JSON.stringify(ids.sort())!==JSON.stringify(Object.keys(renderRegistry).sort()))throw Error('registry mismatch');
    for(const id of ids){const e=componentRegistry[id];let props;
      if(id==='ComposedScene'){const script={...f,schema_version:'1.2.0',scenes:[{...f.scenes[0],visual:{type:'composed',component:id,props:e.example,cues:[]}}]};const compiled=compileVisualPlan(script,planSilentRender(script).scenes).scenes[0];props={compiled,frame:30};}
      else if(id==='BrowserRequestFlow')props={props:f.scenes[1].visual.props,cues:[],frame:30,durationFrames:120};
      else if(id==='CacheAsideProof')props={props:{visualPhase:'lookup',keyLabel:'key',valueLabel:'value',illustrative:true},frame:30,durationFrames:120};
      else props={visual:{type:'registered-animation',component:id,taxonomy_version:'1.0.0',props:e.example,cues:[]},frame:30,durationFrames:480,assets:{['0'.repeat(64)]:'visual-assets/'+ '0'.repeat(64)+'.svg'}};
      const html=renderToStaticMarkup(createElement(renderRegistry[id].Component,props));if(!html.includes('<g'))throw Error('missing output '+id);
    } console.log(ids.length);
  `,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /11/);
});

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== undefined && value !== null);
  return value;
}
