import { z } from 'zod';
import { StableIdSchema } from './visual-common.ts';

const coordinate = z.number().min(0).max(5);
const position = z.strictObject({ x: coordinate, y: coordinate });
export const CityDemandHeatmapSchema = z
  .strictObject({
    sceneType: z.literal('synthetic-city-demand'),
    renderMode: z.enum(['isometric-svg', 'flat-svg']),
    cameraPreset: z.enum(['follow-demand', 'wide']),
    storyBeat: z.enum(['establish', 'demand', 'respond', 'pattern', 'full']),
    focusCell: z.strictObject({
      x: z.int().min(0).max(4),
      y: z.int().min(0).max(4),
    }),
    // Fixed topology/data resolution: 5×5 cells, four equally spaced snapshots.
    density: z.array(z.array(z.number().min(0).max(1)).length(25)).length(4),
    vehicles: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          route: z.array(position).length(5),
        }),
      )
      .min(1)
      .max(6),
    palette: z.strictObject({
      low: z.literal('flow'),
      high: z.literal('highlight'),
      vehicle: z.literal('success'),
    }),
    // This procedural template has no textures/models/footage. No raw path escape.
    assetIds: z.array(StableIdSchema).max(0),
    illustrative: z.literal(true),
    dataKind: z.literal('synthetic'),
  })
  .superRefine((p, c) => {
    if (new Set(p.vehicles.map((v) => v.id)).size !== p.vehicles.length)
      c.addIssue({ code: 'custom', message: 'Vehicle IDs must be unique' });
    for (const v of p.vehicles) {
      for (const [i, point] of v.route.entries()) {
        const prev = v.route[i - 1];
        // Roads are the integer grid lines, never through building interiors.
        if (
          (!Number.isInteger(point.x) && !Number.isInteger(point.y)) ||
          (prev &&
            !(
              (point.x === prev.x && Number.isInteger(point.x)) ||
              (point.y === prev.y && Number.isInteger(point.y))
            ))
        )
          c.addIssue({
            code: 'custom',
            message: 'Routes must follow axis-aligned integer-grid roads',
          });
      }
    }
  });
export type CityDemandProps = z.infer<typeof CityDemandHeatmapSchema>;

export const CITY_DEMAND_EXAMPLE: CityDemandProps = {
  sceneType: 'synthetic-city-demand',
  renderMode: 'isometric-svg',
  cameraPreset: 'follow-demand',
  storyBeat: 'full',
  focusCell: { x: 3, y: 1 },
  density: [
    [
      0.05, 0.08, 0.12, 0.1, 0.05, 0.1, 0.14, 0.12, 0.1, 0.08, 0.08, 0.12, 0.15,
      0.13, 0.05, 0.06, 0.1, 0.12, 0.08, 0.05, 0.04, 0.05, 0.08, 0.05, 0.04,
    ],
    [
      0.08, 0.12, 0.3, 0.6, 0.3, 0.1, 0.2, 0.65, 1, 0.7, 0.08, 0.18, 0.4, 0.75,
      0.45, 0.08, 0.1, 0.2, 0.3, 0.2, 0.05, 0.08, 0.1, 0.12, 0.08,
    ],
    [
      0.1, 0.2, 0.35, 0.5, 0.2, 0.15, 0.3, 0.55, 0.9, 0.55, 0.2, 0.4, 0.5, 0.6,
      0.3, 0.4, 0.65, 0.4, 0.25, 0.15, 0.2, 0.3, 0.25, 0.12, 0.08,
    ],
    [
      0.2, 0.15, 0.1, 0.12, 0.1, 0.4, 0.35, 0.15, 0.2, 0.2, 0.7, 0.8, 0.5, 0.25,
      0.2, 0.8, 1, 0.65, 0.3, 0.15, 0.4, 0.7, 0.4, 0.2, 0.1,
    ],
  ],
  vehicles: [
    {
      id: 'car-a',
      route: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 4, y: 3 },
      ],
    },
    {
      id: 'car-b',
      route: [
        { x: 2, y: 5 },
        { x: 2, y: 4 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: 'car-c',
      route: [
        { x: 5, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 2, y: 1 },
      ],
    },
    {
      id: 'car-d',
      route: [
        { x: 1, y: 4 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 4 },
      ],
    },
  ],
  palette: { low: 'flow', high: 'highlight', vehicle: 'success' },
  assetIds: [],
  illustrative: true,
  dataKind: 'synthetic',
};
