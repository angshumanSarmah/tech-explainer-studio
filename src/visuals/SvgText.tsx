import { THEME, wrapText } from '../renderers/remotion/theme.ts';

export function SvgText({
  text,
  x,
  y,
  size = 36,
  columns = 40,
  color = THEME.text,
  weight = 500,
  anchor = 'start',
  gap = size * 1.22,
}: {
  text: string;
  x: number;
  y: number;
  size?: number;
  columns?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle';
  gap?: number;
}) {
  return (
    <text
      data-label="true"
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
    >
      {wrapText(text, columns).map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Immutable ordered glyph spans have no state; index distinguishes repeated lines.
        <tspan key={`${index}-${line}`} x={x} dy={index ? gap : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
