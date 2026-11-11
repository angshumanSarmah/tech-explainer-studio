import { BRAND } from '../branding/profile.ts';
import type { CityDemandProps } from '../domain/spatial.ts';
import { cityDemandState, projectCity } from './city-demand-state.ts';
import { SvgText } from './SvgText.tsx';

const C = BRAND.colors;
const beats = [
  'A city in motion',
  'Demand gathers',
  'Vehicles move closer',
  'The pattern changes',
];
const mix = (a: string, b: string, t: number) => {
  const n = (s: string, i: number) => Number.parseInt(s.slice(i, i + 2), 16);
  return `rgb(${[1, 3, 5].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t)).join(',')})`;
};
// Original procedural geometry: no tiles, location coordinates, images or models.
const buildings = [
  [0, 0, 44],
  [1, 0, 66],
  [2, 0, 38],
  [3, 0, 58],
  [4, 0, 32],
  [0, 1, 38],
  [1, 1, 52],
  [4, 1, 48],
  [0, 2, 64],
  [2, 2, 42],
  [4, 2, 60],
  [0, 3, 30],
  [2, 3, 56],
  [3, 3, 42],
  [4, 3, 28],
  [0, 4, 40],
  [2, 4, 32],
  [3, 4, 56],
  [4, 4, 40],
] as const;
export function CityDemandHeatmap({
  props: p,
  progress,
}: {
  props: CityDemandProps;
  progress: number;
}) {
  const s = cityDemandState(p, progress);
  const pt = (x: number, y: number, z = 0) => projectCity(p, s, x, y, z);
  const poly = (points: number[][]) =>
    points
      .map(([x = 0, y = 0, z = 0]) => {
        const a = pt(x, y, z);
        return `${a.x},${a.y}`;
      })
      .join(' ');
  const tile = (x: number, y: number, inset: number, z = 0) =>
    poly([
      [x + inset, y + inset, z],
      [x + 1 - inset, y + inset, z],
      [x + 1 - inset, y + 1 - inset, z],
      [x + inset, y + 1 - inset, z],
    ]);
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M${a.x} ${a.y} L${b.x} ${b.y}`;
  return (
    <g data-spatial-mode={p.renderMode}>
      <SvgText
        text={`0${s.beat + 1}  /  ${beats[s.beat]}`}
        x={112}
        y={509}
        size={32}
        color={C.text}
      />
      <SvgText
        text="FICTIONAL CITY  /  SYNTHETIC DATA"
        x={112}
        y={555}
        size={24}
        color={C.muted}
      />
      <ellipse
        cx={504}
        cy={1130}
        rx={300}
        ry={30}
        fill={C.grid}
        opacity={0.28}
      />
      <polygon
        points={poly([
          [0, 0, -18],
          [5, 0, -18],
          [5, 5, -18],
          [0, 5, -18],
        ])}
        fill={C.bg}
        stroke={C.grid}
        strokeWidth={2}
      />
      <polygon
        points={poly([
          [0, 5, 0],
          [5, 5, 0],
          [5, 5, -18],
          [0, 5, -18],
        ])}
        fill={C.surface}
      />
      <polygon
        points={poly([
          [5, 0, 0],
          [5, 5, 0],
          [5, 5, -18],
          [5, 0, -18],
        ])}
        fill={C.grid}
      />
      <polygon
        points={poly([
          [0, 0, 0],
          [5, 0, 0],
          [5, 5, 0],
          [0, 5, 0],
        ])}
        fill={C.bg}
        stroke={C.grid}
        strokeWidth={2}
      />
      {s.density.map((value, i) => {
        const x = i % 5,
          y = Math.floor(i / 5);
        return (
          <g key={`cell-${x}-${y}`}>
            <polygon points={tile(x, y, 0.07)} fill={C.surface} />
            <polygon
              data-demand-cell={i}
              points={tile(x, y, 0.07)}
              fill={mix(C[p.palette.low], C[p.palette.high], value)}
              opacity={s.reveal * (0.08 + value * 0.78)}
            />
          </g>
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={`road-${i}`}>
          <path
            d={`${line(pt(i, 0), pt(i, 5))} ${line(pt(0, i), pt(5, i))}`}
            stroke={C.grid}
            strokeWidth={8}
            fill="none"
          />
          <path
            d={`${line(pt(i, 0), pt(i, 5))} ${line(pt(0, i), pt(5, i))}`}
            stroke={C.muted}
            opacity={0.24}
            strokeWidth={1}
            strokeDasharray="4 12"
            fill="none"
          />
        </g>
      ))}
      {/* Painter order is fixed by ground depth. The fallback uses roof footprints. */}
      {[...buildings]
        .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
        .map(([x, y, h]) => {
          const a = x + 0.28,
            b = y + 0.28,
            c = x + 0.72,
            d = y + 0.72;
          const flat = p.renderMode === 'flat-svg';
          return (
            <g key={`building-${x}-${y}`} opacity={0.92}>
              {!flat && (
                <>
                  <polygon
                    points={poly([
                      [c, b, 0],
                      [c, d, 0],
                      [c, d, h],
                      [c, b, h],
                    ])}
                    fill={C.grid}
                  />
                  <polygon
                    points={poly([
                      [a, d, 0],
                      [c, d, 0],
                      [c, d, h],
                      [a, d, h],
                    ])}
                    fill={C.surface}
                    stroke={C.grid}
                  />
                  <path
                    d={`${line(pt(a, d + 0.04, 16), pt(c, d + 0.04, 16))} ${line(pt(a, d + 0.04, 28), pt(c, d + 0.04, 28))}`}
                    stroke={C.flow}
                    opacity={0.18}
                    strokeWidth={2}
                  />
                </>
              )}
              <polygon
                points={poly([
                  [a, b, h],
                  [c, b, h],
                  [c, d, h],
                  [a, d, h],
                ])}
                fill={mix(C.grid, C.muted, 0.2)}
                stroke={C.muted}
                strokeOpacity={0.25}
              />
            </g>
          );
        })}
      {s.reveal > 0 &&
        (() => {
          const a = pt(p.focusCell.x + 0.5, p.focusCell.y + 0.5, 3);
          return (
            <g opacity={s.reveal}>
              <ellipse
                cx={a.x}
                cy={a.y}
                rx={22 + 23 * s.pulse}
                ry={
                  p.renderMode === 'flat-svg'
                    ? 22 + 23 * s.pulse
                    : 12 + 13 * s.pulse
                }
                fill="none"
                stroke={C.highlight}
                strokeWidth={2}
                opacity={(1 - s.pulse) * s.focusIntensity}
              />
              <path
                d={`M${a.x} ${a.y} v-54`}
                stroke={C.highlight}
                strokeWidth={2}
              />
              <circle cx={a.x} cy={a.y - 54} r={12} fill={C.highlight} />
            </g>
          );
        })()}
      {/* Vehicles lie on roads and are painted last to preserve explanatory visibility. */}
      {s.vehicles.map((v) => {
        const a = pt(v.x, v.y, 6),
          b = pt(v.x + v.dx, v.y + v.dy, 6);
        const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        return (
          <g
            key={v.id}
            data-vehicle={v.id}
            transform={`translate(${a.x} ${a.y}) rotate(${angle})`}
          >
            <ellipse cx={0} cy={5} rx={17} ry={9} fill={C.bg} opacity={0.7} />
            <rect
              x={-17}
              y={-9}
              width={34}
              height={18}
              rx={6}
              fill={C[p.palette.vehicle]}
              stroke={C.text}
              strokeWidth={1.5}
            />
            <rect
              x={-6}
              y={-6}
              width={11}
              height={12}
              rx={2}
              fill={C.surface}
            />
            <path d="M12 -5 V5" stroke={C.text} strokeWidth={3} />
          </g>
        );
      })}
      <SvgText
        text={`FOCUS CELL  /  ${Math.round(s.focusIntensity * 100)} / 100`}
        x={112}
        y={1189}
        size={30}
        color={C.highlight}
      />
      <SvgText
        text="Simulated demand"
        x={112}
        y={1248}
        size={28}
        color={C.muted}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect
          key={`legend-${i}`}
          x={472 + i * 39}
          y={1224}
          width={35}
          height={24}
          rx={3}
          fill={mix(C[p.palette.low], C[p.palette.high], i / 7)}
          opacity={0.25 + (0.75 * i) / 7}
        />
      ))}
      <SvgText text="LOW" x={472} y={1282} size={23} color={C.muted} />
      <SvgText text="HIGH" x={738} y={1282} size={23} color={C.muted} />
    </g>
  );
}
