import { z } from 'zod';
import { AssetRefSchema } from './library.ts';
import {
  displayText,
  StableIdSchema,
  VisualCueSchema,
} from './visual-common.ts';

export const COMPOSITION_VERSION = '1.0.1';
export const COMPOSITION_LIMITS = Object.freeze({
  entities: 8,
  links: 12,
  cues: 16,
  moving: 2,
  groups: 2,
  images: 2,
});
const role = z.enum(['flow', 'success', 'highlight', 'muted']);
const text = displayText(24).refine(
  (s) => !/[<>`\p{Cc}]/u.test(s),
  'Use literal labels, no markup or controls',
);
const common = { id: StableIdSchema, label: text, role };
export const ComposedPropsSchema = z
  .strictObject({
    title: displayText(40),
    layout: z.enum(['row', 'column', 'grid']),
    entities: z
      .array(
        z.discriminatedUnion('kind', [
          z.strictObject({
            ...common,
            kind: z.literal('node'),
            slot: z.int().min(0).max(5),
            depth: z.enum(['flat', 'raised']),
            asset: AssetRefSchema.optional(),
          }),
          z.strictObject({
            ...common,
            kind: z.literal('token'),
            at: StableIdSchema,
          }),
        ]),
      )
      .min(1)
      .max(COMPOSITION_LIMITS.entities),
    links: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          from: StableIdSchema,
          to: StableIdSchema,
        }),
      )
      .max(COMPOSITION_LIMITS.links),
    groups: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          label: text,
          members: z.array(StableIdSchema).min(1).max(6),
        }),
      )
      .max(COMPOSITION_LIMITS.groups),
    camera: z.enum(['wide', 'gentle-focus']),
    illustrative: z.literal(true),
  })
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const nodes = new Set(
      p.entities.filter((e) => e.kind === 'node').map((e) => e.id),
    );
    const ids = [...p.entities, ...p.links, ...p.groups].map((e) => e.id);
    if (new Set(ids).size !== ids.length)
      issue(['entities'], 'Entity/link/group IDs must be globally distinct');
    const slots = new Set<number>();
    let images = 0;
    for (const [i, e] of p.entities.entries()) {
      if (e.kind === 'token') {
        if (!nodes.has(e.at))
          issue(['entities', i, 'at'], 'Token must start at a node');
      } else {
        if (slots.has(e.slot) || (p.layout !== 'grid' && e.slot >= 3))
          issue(
            ['entities', i, 'slot'],
            'Unique slots required; row/column support three nodes, grid six',
          );
        slots.add(e.slot);
        if (e.asset) images++;
      }
    }
    if (!nodes.size || images > COMPOSITION_LIMITS.images)
      issue(['entities'], 'Require nodes and at most two reviewed images');
    for (const [i, l] of p.links.entries())
      if (!nodes.has(l.from) || !nodes.has(l.to) || l.from === l.to)
        issue(['links', i], 'Links require distinct existing node endpoints');
    const grouped = new Set<string>();
    for (const [i, g] of p.groups.entries())
      for (const id of g.members) {
        if (!nodes.has(id) || grouped.has(id))
          issue(
            ['groups', i, 'members'],
            'Groups are flat, disjoint sets of existing nodes',
          );
        grouped.add(id);
      }
  });
export const ComposedCueSchema = VisualCueSchema.superRefine((c, ctx) => {
  if (
    ![
      'move',
      'appear',
      'disappear',
      'highlight',
      'update_field',
      'focus',
    ].includes(c.action.kind) ||
    (c.trigger.kind === 'progress' && c.trigger.to <= c.trigger.from)
  )
    ctx.addIssue({
      code: 'custom',
      message: 'Actions need a nonzero supported cue window',
    });
});
export const BoundarySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('cut') }),
  z.strictObject({ kind: z.literal('crossfade'), preset: z.literal('short') }),
  z.strictObject({
    kind: z.literal('match'),
    preset: z.literal('short'),
    entityIds: z.array(StableIdSchema).min(1).max(8),
  }),
]);
export const PauseIntentSchema = z
  .strictObject({
    kind: z.literal('deliberate'),
    rationale: displayText(200),
    min_ms: z.int().min(0).max(10000),
    max_ms: z.int().min(0).max(10000),
  })
  .refine((p) => p.max_ms >= p.min_ms, 'Pause interval must be ordered');
export type ComposedProps = z.infer<typeof ComposedPropsSchema>;
export type ComposedEntity = ComposedProps['entities'][number];
export type ComposedCue = z.infer<typeof ComposedCueSchema>;
export const COMPOSED_EXAMPLE: ComposedProps = {
  title: 'A message changes hands',
  layout: 'row',
  camera: 'wide',
  illustrative: true,
  groups: [],
  entities: [
    {
      id: 'sender',
      kind: 'node',
      slot: 0,
      label: 'Sender',
      role: 'flow',
      depth: 'raised',
    },
    {
      id: 'receiver',
      kind: 'node',
      slot: 2,
      label: 'Receiver',
      role: 'success',
      depth: 'raised',
    },
    {
      id: 'message',
      kind: 'token',
      at: 'sender',
      label: 'Data',
      role: 'highlight',
    },
  ],
  links: [{ id: 'delivery', from: 'sender', to: 'receiver' }],
};
