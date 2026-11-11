import type { ReactNode } from 'react';
import { THEME } from '../renderers/remotion/theme.ts';
import { type Curve, curvePath, curvePoint } from './cache-aside-state.ts';

export function DepthPanel({
  x,
  y,
  width,
  height,
  accent = THEME.grid,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={x + 8}
        y={y + 14}
        width={width}
        height={height}
        rx={24}
        fill={THEME.grid}
        opacity={0.5}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={24}
        fill={THEME.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d={`M${x + 25} ${y + 2} H${x + width - 25}`}
        stroke={THEME.text}
        opacity={0.12}
        strokeWidth={2}
      />
      {children}
    </g>
  );
}
export function MotionPath({
  curve,
  progress,
  color,
  dim = false,
}: {
  curve: Curve;
  progress: number;
  color: string;
  dim?: boolean;
}) {
  return (
    <g fill="none" strokeLinecap="round">
      <path
        d={curvePath(curve)}
        stroke={THEME.grid}
        strokeWidth={3}
        opacity={dim ? 0.28 : 0.8}
      />
      {progress > 0 && (
        <path
          d={curvePath(curve)}
          stroke={color}
          strokeWidth={4}
          pathLength={1}
          strokeDasharray={`${Math.min(1, progress)} 1`}
          opacity={dim ? 0.25 : 0.9}
        />
      )}
    </g>
  );
}
export function MovingPacket({
  curve,
  progress,
  color,
  data = false,
  scale = 1,
}: {
  curve: Curve;
  progress: number;
  color: string;
  data?: boolean;
  scale?: number;
}) {
  const point = curvePoint(curve, progress);
  const ahead = curvePoint(curve, Math.min(1, progress + 0.001));
  const behind = curvePoint(curve, Math.max(0, progress - 0.001));
  const angle =
    (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${point.x} ${point.y}) scale(${scale})`}>
      <ellipse
        cx={4}
        cy={20}
        rx={data ? 26 : 20}
        ry={8}
        fill={THEME.bg}
        opacity={0.8}
      />
      {data && (
        <rect
          x={-18}
          y={-21}
          width={44}
          height={34}
          rx={8}
          fill={THEME.surface}
          stroke={color}
          strokeWidth={2}
          opacity={0.55}
        />
      )}
      <rect
        x={-22}
        y={-17}
        width={44}
        height={34}
        rx={8}
        fill={THEME.surface}
        stroke={color}
        strokeWidth={3}
      />
      {data ? (
        <>
          <path
            d="M-12 -5 H12 M-12 4 H5"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={12} cy={5} r={3} fill={color} />
        </>
      ) : (
        <path
          transform={`rotate(${angle})`}
          d="M-10 0 H10 M3 -7 L10 0 L3 7"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}
