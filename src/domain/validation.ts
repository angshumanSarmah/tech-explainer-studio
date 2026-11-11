import type { z } from 'zod';
import {
  type VideoScript,
  VideoScriptV1Schema,
  VideoScriptV11Schema,
} from './videoscript.ts';
import { componentRegistry } from './visuals.ts';

export interface ValidationIssue {
  code:
    | 'INVALID_INPUT'
    | 'UNKNOWN_VISUAL_COMPONENT'
    | 'UNSUPPORTED_VISUAL_TYPE';
  scene_id: string | null;
  path: string;
  reason: string;
}

export class ScriptValidationError extends Error {
  readonly code: 'MALFORMED_JSON' | 'SCRIPT_VALIDATION_FAILED';
  readonly issues: ValidationIssue[];
  readonly exitCode: 2 | 3;

  constructor(code: ScriptValidationError['code'], issues: ValidationIssue[]) {
    super(
      code === 'MALFORMED_JSON'
        ? 'Malformed JSON input'
        : 'VideoScript validation failed',
    );
    this.name = 'ScriptValidationError';
    this.code = code;
    this.issues = issues;
    this.exitCode = issues.some((issue) => issue.code !== 'INVALID_INPUT')
      ? 3
      : 2;
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function sceneId(input: unknown, path: PropertyKey[]): string | null {
  const scenes = record(input)?.scenes;
  const index = path[1];
  if (
    path[0] !== 'scenes' ||
    typeof index !== 'number' ||
    !Array.isArray(scenes)
  )
    return null;
  const id = record(scenes[index])?.scene_id;
  return typeof id === 'string' ? id : null;
}

function issueCode(issue: z.core.$ZodIssue): ValidationIssue['code'] {
  if (issue.path[0] === 'scenes' && issue.path[2] === 'visual') {
    if (issue.path[3] === 'component' && issue.code === 'invalid_value')
      return 'UNKNOWN_VISUAL_COMPONENT';
    if (issue.path[3] === 'type' && issue.code === 'invalid_union')
      return 'UNSUPPORTED_VISUAL_TYPE';
  }
  return 'INVALID_INPUT';
}

function formatPath(path: PropertyKey[]): string {
  return `$${path.map((part) => (typeof part === 'number' ? `[${part}]` : `[${JSON.stringify(String(part))}]`)).join('')}`;
}

export function parseVideoScript(input: unknown): VideoScript {
  const version = record(input)?.schema_version;
  if (version !== '1.0.0' && version !== '1.1.0')
    throw new ScriptValidationError('SCRIPT_VALIDATION_FAILED', [
      {
        code: 'INVALID_INPUT',
        scene_id: null,
        path: '$["schema_version"]',
        reason: 'Supported VideoScript versions: 1.0.0 and 1.1.0',
      },
    ]);
  const rawScenes = record(input)?.scenes;
  if (Array.isArray(rawScenes))
    for (const [i, raw] of rawScenes.entries()) {
      const v = record(record(raw)?.visual);
      if (!v) continue;
      const id = record(raw)?.scene_id;
      if (
        typeof v.type === 'string' &&
        ![
          'title-card',
          'tech-animation',
          'cache-aside-proof',
          'registered-animation',
        ].includes(v.type)
      )
        throw new ScriptValidationError('SCRIPT_VALIDATION_FAILED', [
          {
            code: 'UNSUPPORTED_VISUAL_TYPE',
            scene_id: typeof id === 'string' ? id : null,
            path: formatPath(['scenes', i, 'visual', 'type']),
            reason:
              'Visual type is not renderable. Use the exported registered catalog; spatial scenes use registered-animation/CityDemandHeatmap. Arbitrary 3D or map types remain unsupported.',
          },
        ]);
      if (
        typeof v.component === 'string' &&
        !Object.hasOwn(componentRegistry, v.component)
      )
        throw new ScriptValidationError('SCRIPT_VALIDATION_FAILED', [
          {
            code: 'UNKNOWN_VISUAL_COMPONENT',
            scene_id: typeof id === 'string' ? id : null,
            path: formatPath(['scenes', i, 'visual', 'component']),
            reason: `Unsupported component. Choose one of: ${Object.keys(componentRegistry).join(', ')}; otherwise return unsupported_visual/needs_review.`,
          },
        ]);
    }
  const result = (
    version === '1.0.0' ? VideoScriptV1Schema : VideoScriptV11Schema
  ).safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues.flatMap((issue): ValidationIssue[] => {
    // Zod reports unknown keys on their parent; attach each key for actionable paths.
    const paths =
      issue.code === 'unrecognized_keys'
        ? issue.keys.map((key) => [...issue.path, key])
        : [issue.path];
    return paths.map((path) => ({
      code: issueCode(issue),
      scene_id: sceneId(input, path),
      path: formatPath(path),
      reason:
        issue.code === 'unrecognized_keys'
          ? 'Unexpected property'
          : issue.message,
    }));
  });
  throw new ScriptValidationError('SCRIPT_VALIDATION_FAILED', issues);
}

export function parseVideoScriptJson(text: string): VideoScript {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    // Do not include JSON.parse's input excerpt: scripts can contain confidential text.
    throw new ScriptValidationError('MALFORMED_JSON', [
      {
        code: 'INVALID_INPUT',
        scene_id: null,
        path: '$',
        reason: 'Supply a complete, syntactically valid JSON document',
      },
    ]);
  }
  return parseVideoScript(input);
}
