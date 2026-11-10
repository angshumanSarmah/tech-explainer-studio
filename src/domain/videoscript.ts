import { z } from 'zod';
import { BrandSelectionSchema } from '../branding/profile.ts';
import { displayText, StableIdSchema, VisualSpecSchema } from './visuals.ts';

const SourceSnapshotSchema = z.strictObject({
  source_id: StableIdSchema,
  url: z.url({ protocol: /^https?$/ }),
  title: displayText(300),
  retrieved_at: z.iso.datetime({ offset: true }).nullable(),
  source_kind: displayText(100),
  license_review: displayText(200),
  revision: displayText(200).nullable(),
  content_sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 hash')
    .nullable(),
});

const ClaimSchema = z.strictObject({
  claim_id: StableIdSchema,
  text: displayText(2000),
  source_ids: z.array(StableIdSchema).max(100),
  status: displayText(100),
  scope: displayText(500),
});

const TimingSchema = z
  .strictObject({
    min_seconds: z.number().positive(),
    preferred_seconds: z.number().positive(),
    max_seconds: z.number().positive(),
  })
  .refine(
    (value) =>
      value.min_seconds <= value.preferred_seconds &&
      value.preferred_seconds <= value.max_seconds,
    {
      path: ['preferred_seconds'],
      message: 'Expected min_seconds <= preferred_seconds <= max_seconds',
    },
  );

export const SceneV1Schema = z
  .strictObject({
    scene_id: StableIdSchema,
    educational_goal: displayText(1000),
    narration: displayText(10000),
    claim_ids: z.array(StableIdSchema).max(500),
    visual: VisualSpecSchema,
    timing: TimingSchema,
    caption_overrides: z
      .array(
        z.strictObject({
          text: displayText(1000),
          start_ms: z.int().nonnegative(),
          end_ms: z.int().positive(),
        }),
      )
      .max(500)
      .optional(),
  })
  .superRefine((scene, ctx) => {
    if (scene.visual.type === 'tech-animation') {
      const ids = new Set<string>();
      scene.visual.cues.forEach((cue, index) => {
        if (ids.has(cue.cue_id))
          ctx.addIssue({
            code: 'custom',
            path: ['visual', 'cues', index, 'cue_id'],
            message: 'Duplicate cue ID in scene',
          });
        ids.add(cue.cue_id);
        if (cue.trigger.kind === 'phrase') {
          const phrase = cue.trigger.text;
          const first = scene.narration.indexOf(phrase);
          if (first < 0 || scene.narration.indexOf(phrase, first + 1) >= 0) {
            ctx.addIssue({
              code: 'custom',
              path: ['visual', 'cues', index, 'trigger', 'text'],
              message: 'Phrase must occur exactly once in scene narration',
            });
          }
        }
      });
    }
    let previousEnd = 0;
    scene.caption_overrides?.forEach((caption, index) => {
      if (
        caption.start_ms < previousEnd ||
        caption.end_ms <= caption.start_ms ||
        caption.end_ms > scene.timing.max_seconds * 1000
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['caption_overrides', index],
          message:
            'Captions must be ordered, nonoverlapping, start before end, and fit within max_seconds',
        });
      }
      previousEnd = caption.end_ms;
    });
  });

const VideoScriptV1Base = z.strictObject({
  schema_version: z.literal('1.0.0'),
  script_id: StableIdSchema,
  revision: z.int().positive(),
  profile: z.enum(['technology-explainer', 'product-walkthrough']),
  topic: displayText(500),
  audience: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z
    .string()
    .regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/)
    .max(50),
  target: z
    .strictObject({
      aspect_ratio: z.enum(['9:16', '16:9']),
      width: z.int().positive().max(8192),
      height: z.int().positive().max(8192),
      fps: z.int().positive().max(120),
    })
    .refine(
      (target) =>
        target.aspect_ratio === '9:16'
          ? target.width * 16 === target.height * 9
          : target.width * 9 === target.height * 16,
      {
        path: ['aspect_ratio'],
        message: 'Aspect ratio must match width and height',
      },
    ),
  sources: z.array(SourceSnapshotSchema).max(100),
  claims: z.array(ClaimSchema).max(500),
  scenes: z.array(SceneV1Schema).min(1).max(100),
  editorial: z.strictObject({
    title_options: z.array(displayText(100)).min(1).max(20),
    summary: displayText(3000),
    simplifications: z.array(displayText(1000)).max(100),
  }),
  provenance: z.strictObject({
    prompt_version: displayText(100),
    model_id: displayText(200),
    created_at: z.iso.datetime({ offset: true }),
  }),
});
function validateReferences(
  script: {
    sources: { source_id: string }[];
    claims: { claim_id: string; source_ids: string[] }[];
    scenes: { scene_id: string; claim_ids: string[] }[];
  },
  ctx: z.RefinementCtx,
) {
  function unique(ids: string[], path: string, field: string): Set<string> {
    const seen = new Set<string>();
    ids.forEach((id, index) => {
      if (seen.has(id))
        ctx.addIssue({
          code: 'custom',
          path: [path, index, field],
          message: 'Duplicate ID',
        });
      seen.add(id);
    });
    return seen;
  }
  const sources = unique(
    script.sources.map((source) => source.source_id),
    'sources',
    'source_id',
  );
  const claims = unique(
    script.claims.map((claim) => claim.claim_id),
    'claims',
    'claim_id',
  );
  unique(
    script.scenes.map((scene) => scene.scene_id),
    'scenes',
    'scene_id',
  );
  script.claims.forEach((claim, index) => {
    claim.source_ids.forEach((id, ref) => {
      if (!sources.has(id))
        ctx.addIssue({
          code: 'custom',
          path: ['claims', index, 'source_ids', ref],
          message: 'Unknown source ID',
        });
    });
  });
  script.scenes.forEach((scene, index) => {
    scene.claim_ids.forEach((id, ref) => {
      if (!claims.has(id))
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'claim_ids', ref],
          message: 'Unknown claim ID',
        });
    });
  });
}
export const VideoScriptV1Schema = VideoScriptV1Base.superRefine(
  (script, ctx) => {
    validateReferences(script, ctx);
    script.scenes.forEach((scene, index) => {
      if (scene.visual.type === 'title-card' && scene.visual.content)
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'visual', 'content'],
          message: 'Authored title-card content requires VideoScript 1.1.0',
        });
    });
  },
);
const DirectorSourceSchema = SourceSnapshotSchema.extend({
  url: z.url({ protocol: /^https?$/ }).nullable(),
}).superRefine((source, ctx) => {
  if ((source.url === null) !== (source.source_kind === 'pasted_text'))
    ctx.addIssue({
      code: 'custom',
      path: ['url'],
      message: 'Only pasted_text sources use a null URL',
    });
});
export const VideoScriptV11Schema = z
  .strictObject({
    ...VideoScriptV1Base.shape,
    schema_version: z.literal('1.1.0'),
    sources: z.array(DirectorSourceSchema).max(100),
    brand: BrandSelectionSchema.optional(),
  })
  .superRefine(validateReferences);
export const VideoScriptSchema = z.union([
  VideoScriptV1Schema,
  VideoScriptV11Schema,
]);

export type VideoScriptV1 = z.infer<typeof VideoScriptV1Schema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type SceneV1 = z.infer<typeof SceneV1Schema>;
