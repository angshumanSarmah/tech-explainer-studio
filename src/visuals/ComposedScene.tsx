import type {
  CompiledScene,
  PlacedEntity,
} from '../renderers/remotion/compile.ts';
import { composedState } from '../renderers/remotion/compile.ts';
import {
  COMPOSED_TEXT,
  groupBox,
  TOKEN_TEXT,
} from '../renderers/remotion/composed-layout.ts';
import { THEME } from '../renderers/remotion/theme.ts';
import { LayeredAssets, type StagedImages } from './LayeredAssets.tsx';
import { DepthPanel, MotionPath } from './motion-primitives.tsx';
import { SvgText } from './SvgText.tsx';

export function ComposedScene({
  compiled,
  frame,
  assets = {},
  omitIds = [],
  onlyIds,
  overrides = [],
}: {
  compiled: CompiledScene;
  frame: number;
  assets?: StagedImages;
  omitIds?: string[];
  onlyIds?: string[];
  overrides?: PlacedEntity[];
}) {
  if (compiled.visual.type !== 'composed')
    throw new Error('Composed handler requires compiled composed data');
  const p = compiled.visual.props,
    s = composedState(compiled, frame);
  const entities = s.entities.map(
    (e) => overrides.find((v) => v.entity.id === e.entity.id) ?? e,
  );
  return (
    <g
      transform={`translate(${s.camera.x} ${s.camera.y}) translate(504 850) scale(${s.camera.zoom}) translate(-504 -850)`}
    >
      {!onlyIds &&
        p.groups.map((g) => {
          const members = entities
            .filter((e) => g.members.includes(e.entity.id))
            .map((e) => {
              if (!e.box)
                throw new Error('Compiled group member lacks geometry');
              return { ...e, box: e.box };
            });
          const { left, right, top, bottom, columns, labelY } = groupBox(
            members,
            g.label,
          );
          return (
            <g key={g.id}>
              <rect
                x={left}
                y={top}
                width={right - left}
                height={bottom - top}
                rx={24}
                fill={THEME.grid}
                opacity={0.18}
              />
              <SvgText
                text={g.label}
                x={left + 12}
                y={labelY}
                size={COMPOSED_TEXT.size}
                gap={COMPOSED_TEXT.gap}
                columns={columns}
                color={THEME.muted}
              />
            </g>
          );
        })}
      {!onlyIds &&
        compiled.links.map((l) => (
          <MotionPath
            key={l.id}
            curve={l.curve}
            progress={1}
            color={
              compiled.tracks.some(
                (t) =>
                  t.cue.action.kind === 'move' &&
                  t.cue.action.value === l.id &&
                  frame >= t.from &&
                  frame <= t.to,
              )
                ? THEME.highlight
                : THEME.flow
            }
          />
        ))}

      {entities
        .filter(
          (e) =>
            !omitIds.includes(e.entity.id) &&
            (!onlyIds || onlyIds.includes(e.entity.id)),
        )
        .map((e) => {
          const n = e.entity,
            color = THEME[n.role];
          const box = e.box;
          if (n.kind === 'node' && !box)
            throw new Error('Compiled node lacks geometry');
          const w = box?.width ?? 0;
          return (
            <g key={n.id} opacity={e.opacity} data-entity={n.id}>
              {n.kind === 'node' ? (
                <>
                  {n.depth === 'raised' ? (
                    <DepthPanel
                      x={e.x - w / 2}
                      y={e.y + (box?.top ?? 0)}
                      width={w}
                      height={box?.height ?? 0}
                      accent={color}
                    >
                      {null}
                    </DepthPanel>
                  ) : (
                    <rect
                      x={e.x - w / 2}
                      y={e.y + (box?.top ?? 0)}
                      width={w}
                      height={box?.height ?? 0}
                      rx={24}
                      fill={THEME.surface}
                      stroke={color}
                      strokeWidth={2}
                    />
                  )}
                  <rect
                    x={e.x - w / 2}
                    data-node-box={n.id}
                    y={e.y + (box?.top ?? 0)}
                    width={w}
                    height={box?.height ?? 0}
                    rx={24}
                    fill="transparent"
                    stroke={THEME.highlight}
                    strokeWidth={5}
                    strokeOpacity={e.highlight}
                  />
                  {n.asset && (
                    <LayeredAssets
                      namespace={`${compiled.sceneId}-${n.id}`}
                      t={0.5}
                      assets={assets}
                      props={{
                        intent: 'compare',
                        illustrative: true,
                        layers: [
                          {
                            id: n.id,
                            asset: n.asset,
                            x: e.x - 70,
                            y: e.y - 62,
                            width: 140,
                            height: 100,
                            fit: 'contain',
                            depth: 0,
                            panX: 0,
                            panY: 0,
                            zoom: 1,
                            enter: 0,
                            exit: 1,
                          },
                        ],
                      }}
                    />
                  )}
                  <g data-node-label={n.id}>
                    <SvgText
                      text={n.label}
                      x={e.x}
                      y={e.y + (box?.labelY ?? 0)}
                      size={COMPOSED_TEXT.size}
                      columns={box?.columns ?? 11}
                      gap={COMPOSED_TEXT.gap}
                      anchor="middle"
                      color={THEME.text}
                    />
                    {e.status && (
                      <SvgText
                        text={e.status}
                        x={e.x}
                        y={e.y + (box?.statusY ?? 0)}
                        size={COMPOSED_TEXT.size}
                        columns={box?.columns ?? 11}
                        gap={COMPOSED_TEXT.gap}
                        anchor="middle"
                        color={THEME.highlight}
                      />
                    )}
                  </g>
                </>
              ) : (
                <>
                  <rect
                    x={e.x - 32}
                    y={e.y - 23}
                    width={64}
                    height={46}
                    rx={10}
                    fill={THEME.surface}
                    stroke={e.highlight > 0.05 ? THEME.highlight : color}
                    strokeWidth={4}
                  />
                  <path
                    d={`M${e.x - 16} ${e.y - 5} H${e.x + 16} M${e.x - 16} ${e.y + 6} H${e.x + 7}`}
                    stroke={color}
                    strokeWidth={3}
                  />
                  <SvgText
                    text={n.label}
                    x={e.x}
                    y={e.y + TOKEN_TEXT.y}
                    size={TOKEN_TEXT.size}
                    columns={TOKEN_TEXT.columns}
                    gap={TOKEN_TEXT.gap}
                    anchor="middle"
                    color={THEME.text}
                  />
                </>
              )}
            </g>
          );
        })}
    </g>
  );
}
