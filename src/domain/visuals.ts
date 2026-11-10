import { z } from 'zod';

export const StableIdSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
    'Use a stable alphanumeric ID with hyphens or underscores',
  );

// Labels are data. This schema is not an HTML sanitizer; renderers must escape text.
export const displayText = (max: number) => z.string().min(1).max(max);

const cueText = displayText(500).refine(
  (value) =>
    !/(?:\$\{|\$\(|\{\{|=>|`|<\/?script\b|javascript:|data:|\b(?:eval|require|import)\s*\(|\b(?:process|document|window)\s*\.)/i.test(
      value,
    ),
  'Cues accept literal display values, not expressions, scripts or commands',
);

export const BrowserRequestFlowPropsSchema = z
  .strictObject({
    visualPhase: z.enum([
      'idle',
      'request',
      'parse',
      'route',
      'response',
      'overview',
    ]),
    request: z.strictObject({
      method: z.enum(['GET', 'POST']),
      path: z
        .string()
        .min(1)
        .max(200)
        .regex(
          /^\/(?!\/)[A-Za-z0-9/._~%!&'()*+,;=:@?-]*$/,
          'Use a display path beginning with a single slash',
        ),
      protocolLabel: z.enum(['HTTP/1.0', 'HTTP/1.1', 'HTTP/2', 'HTTP/3']),
    }),
    response: z
      .strictObject({
        status: z.int().min(100).max(599),
        statusText: displayText(80),
        bodyPreview: displayText(500).optional(),
      })
      .optional(),
    show: z.strictObject({
      browser: z.boolean(),
      network: z.boolean(),
      server: z.boolean(),
      handler: z.boolean(),
    }),
    focus: z
      .enum(['browser', 'packet', 'server', 'handler', 'overview'])
      .optional(),
    illustrative: z.boolean(),
  })
  .superRefine((props, ctx) => {
    if (props.visualPhase === 'response' && !props.response) {
      ctx.addIssue({
        code: 'custom',
        path: ['response'],
        message: 'A response phase requires response data',
      });
    }
    if (
      props.response?.status === 204 &&
      props.response.bodyPreview !== undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['response', 'bodyPreview'],
        message: 'A 204 response must not depict a body',
      });
    }
  });

export type BrowserRequestFlowProps = z.infer<
  typeof BrowserRequestFlowPropsSchema
>;

export const CacheAsideProofPropsSchema = z.strictObject({
  visualPhase: z.enum(['lookup', 'miss', 'fill', 'hit']),
  keyLabel: displayText(14),
  valueLabel: displayText(14),
  illustrative: z.literal(true),
});
export type CacheAsideProofProps = z.infer<typeof CacheAsideProofPropsSchema>;

// Validation registry only. No rendering or dynamic module resolution exists here.
export const componentRegistry = Object.freeze({
  CacheAsideProof: Object.freeze({
    version: '0.1.0',
    previewOnly: true,
    schema: CacheAsideProofPropsSchema,
  }),
  BrowserRequestFlow: Object.freeze({
    version: '1.0.0',
    schema: BrowserRequestFlowPropsSchema,
  }),
});

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

export const TitleCardContentSchema = z.strictObject({
  label: displayText(36),
  rows: z.tuple([displayText(38), displayText(38), displayText(38)]),
  footnote: displayText(64),
});

export const VisualSpecSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('title-card'),
    heading: displayText(90),
    subheading: displayText(160).optional(),
    variant: z.enum(['hook', 'summary']),
    content: TitleCardContentSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('tech-animation'),
    component: z.literal('BrowserRequestFlow'),
    props: componentRegistry.BrowserRequestFlow.schema,
    cues: z.array(VisualCueSchema).max(100),
  }),
  z.strictObject({
    type: z.literal('cache-aside-proof'),
    component: z.literal('CacheAsideProof'),
    props: CacheAsideProofPropsSchema,
  }),
]);

export type VisualSpec = z.infer<typeof VisualSpecSchema>;
