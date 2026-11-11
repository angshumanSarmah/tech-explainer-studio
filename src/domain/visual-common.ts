import { z } from 'zod';
export const StableIdSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
    'Use a stable alphanumeric ID with hyphens or underscores',
  );
export const displayText = (max: number) => z.string().min(1).max(max);
export const ShaSchema = z.string().regex(/^[a-f0-9]{64}$/);

const cueText = displayText(500).refine(
  (value) =>
    !/(?:\$\{|\$\(|\{\{|=>|`|<\/?script\b|javascript:|data:|\b(?:eval|require|import)\s*\(|\b(?:process|document|window)\s*\.)/i.test(
      value,
    ),
  'Cues accept literal display values, not expressions, scripts or commands',
);

export const VisualCueSchema = z.strictObject({
  cue_id: StableIdSchema,
  trigger: z.discriminatedUnion('kind', [
    z
      .strictObject({
        kind: z.literal('progress'),
        from: z.number().min(0).max(1),
        to: z.number().min(0).max(1),
      })
      .refine((trigger) => trigger.to >= trigger.from, {
        path: ['to'],
        message: 'Cue end must be at or after its start',
      }),
    z.strictObject({ kind: z.literal('phrase'), text: cueText }),
  ]),
  action: z.strictObject({
    kind: z.enum([
      'focus',
      'move',
      'appear',
      'disappear',
      'highlight',
      'update_field',
    ]),
    // Identifiers only: no selectors, URLs, expressions or executable payloads.
    target: StableIdSchema,
    value: z.union([cueText, z.number(), z.boolean()]).optional(),
  }),
});
