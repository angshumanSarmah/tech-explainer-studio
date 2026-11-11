import { BRAND } from '../branding/profile.ts';
import { treeSearch } from '../domain/library.ts';
import type { RegisteredVisual } from '../domain/visual-library-registry.ts';
import { THEME } from '../renderers/remotion/theme.ts';
import { CacheAsideProof } from './CacheAsideProof.tsx';
import { CityDemandHeatmap } from './CityDemandHeatmap.tsx';
import {
  CACHE_PHASE_COPY,
  type Curve,
  easeInOut,
  windowProgress,
} from './cache-aside-state.ts';
import { LayeredAssets, type StagedImages } from './LayeredAssets.tsx';
import {
  mechanismProgress,
  queueState,
  transferState,
} from './library-state.ts';
import { DepthPanel, MotionPath, MovingPacket } from './motion-primitives.tsx';
import { SvgText } from './SvgText.tsx';

const label = (
  text: string,
  x: number,
  y: number,
  color = THEME.text,
  size: number = BRAND.typography.sizes.s36,
) => (
  <SvgText
    text={text}
    x={x}
    y={y}
    size={size}
    color={color}
    anchor="middle"
    columns={32}
  />
);
function wire(x1: number, y1: number, x2: number, y2: number): Curve {
  return [
    { x: x1, y: y1 },
    { x: x1, y: (y1 + y2) / 2 },
    { x: x2, y: (y1 + y2) / 2 },
    { x: x2, y: y2 },
  ];
}
export function libraryTitle(v: RegisteredVisual) {
  switch (v.component) {
    case 'CityDemandHeatmap':
      return 'Where demand gathers';
    case 'EventQueue':
      return 'A burst, held in order';
    case 'BTreeLookup':
      return `Find key ${v.props.searchKey}`;
    case 'HashObjectGraph':
      return 'Inside a Git snapshot';
    case 'CodeTrace':
      return 'Follow the state';
    case 'FileTransfer':
      return v.props.direction === 'upload'
        ? 'From device to cloud'
        : 'From cloud to device';
    case 'CacheAsideScene':
      return CACHE_PHASE_COPY[v.props.visualPhase].title;
    case 'LayeredAssetScene':
      return 'A closer look';
  }
}
export function LibraryScene({
  visual,
  frame,
  durationFrames,
  assets = {},
}: {
  visual: RegisteredVisual;
  frame: number;
  durationFrames: number;
  assets?: StagedImages;
}) {
  const t = mechanismProgress(visual, frame, durationFrames);
  if (visual.component === 'CityDemandHeatmap')
    return <CityDemandHeatmap props={visual.props} progress={t} />;
  if (visual.component === 'CacheAsideScene')
    return (
      <CacheAsideProof
        props={visual.props}
        frame={Math.min(
          durationFrames - 1,
          Math.round(t * (durationFrames - 1)),
        )}
        durationFrames={durationFrames}
        premium
      />
    );
  if (visual.component === 'LayeredAssetScene')
    return <LayeredAssets props={visual.props} t={t} assets={assets} />;
  if (visual.component === 'EventQueue') {
    const p = visual.props,
      s = queueState(p, t),
      slots = Array.from({ length: p.queueCapacity }, (_, i) => i),
      color =
        s.blocked.length || s.dropped.length ? THEME.highlight : THEME.flow;
    return (
      <g>
        <DepthPanel x={126} y={500} width={752} height={116} accent={color}>
          {label('PRODUCER', 502, 550, THEME.muted, 28)}
          {label(
            s.blocked.length
              ? `${s.blocked.length} waiting to enter`
              : s.dropped.length
                ? `${s.dropped.length} dropped`
                : 'Arrivals',
            502,
            590,
            color,
            30,
          )}
        </DepthPanel>
        <path
          d="M502 632 V688 M502 990 V1050"
          stroke={THEME.grid}
          strokeWidth={4}
        />
        {slots.map((i) => (
          <g key={i}>
            <rect
              x={180}
              y={700 + i * 68}
              width={644}
              height={58}
              rx={15}
              fill={THEME.surface}
              stroke={THEME.grid}
            />
            {label(
              s.waiting[i]
                ? `${s.waiting[i]?.label}  /  waiting`
                : 'Empty slot',
              502,
              740 + i * 68,
              s.waiting[i] ? THEME.flow : THEME.muted,
              30,
            )}
          </g>
        ))}
        <DepthPanel
          x={226}
          y={1064}
          width={552}
          height={140}
          accent={s.processing ? THEME.success : THEME.grid}
        >
          {label('CONSUMER', 502, 1110, THEME.muted, 28)}
          {label(
            s.processing ? `${s.processing.label}  /  processing` : 'Idle',
            502,
            1163,
            THEME.success,
            36,
          )}
        </DepthPanel>
        {s.items
          .filter(
            (e) =>
              e.start !== null && e.end !== null && t >= e.start && t < e.end,
          )
          .map((e) => {
            const u = windowProgress(
              t,
              e.start ?? 0,
              (e.start ?? 0) + Math.min(0.1, p.consumptionTime / 2),
            );
            return (
              <MovingPacket
                key={e.id}
                curve={[
                  { x: 160, y: 700 },
                  { x: 136, y: 810 },
                  { x: 136, y: 1030 },
                  { x: 502, y: 1030 },
                ]}
                progress={u}
                color={THEME.flow}
                data
                scale={1.4}
              />
            );
          })}
        {s.items
          .filter((e) => t >= e.arrival && t < e.arrival + 0.06 && !e.dropped)
          .map((e) => (
            <MovingPacket
              key={`arrive-${e.id}`}
              curve={wire(502, 610, 502, 690)}
              progress={windowProgress(t, e.arrival, e.arrival + 0.06)}
              color={THEME.flow}
              data
              scale={1.4}
            />
          ))}
        {label(
          `FIFO  •  ${s.waiting.length}/${p.queueCapacity} waiting  •  ${s.completed.length} done`,
          502,
          1270,
          THEME.muted,
          28,
        )}
      </g>
    );
  }
  if (visual.component === 'FileTransfer') {
    const p = visual.props,
      s = transferState(t, p.outcome),
      download = p.direction === 'download';
    const a = download ? wire(690, 660, 502, 850) : wire(310, 1100, 502, 850),
      b = download ? wire(502, 850, 310, 1100) : wire(502, 850, 690, 660);
    return (
      <g>
        <ellipse
          cx={510}
          cy={1180}
          rx={330}
          ry={40}
          fill={THEME.grid}
          opacity={0.3}
        />
        <MotionPath curve={a} progress={s.upload} color={THEME.flow} />
        <MotionPath curve={b} progress={s.store} color={THEME.success} />
        <DepthPanel
          x={590}
          y={510}
          width={270}
          height={150}
          accent={s.store === 1 && !download ? THEME.success : THEME.grid}
        >
          {label('STORAGE', 725, 564, THEME.muted, 28)}
          {label(
            download || s.store === 1 ? 'Saved file' : 'Awaiting file',
            725,
            616,
            THEME.success,
            30,
          )}
        </DepthPanel>
        <g transform={`translate(0 ${-6 * Math.sin(Math.PI * t)})`}>
          <path
            d="M370 845 C315 845 315 750 375 745 C375 670 500 660 526 716 C625 690 669 845 596 845 Z"
            fill={THEME.surface}
            stroke={THEME.flow}
            strokeWidth={3}
          />
          {label('CLOUD', 488, 792, THEME.text, 36)}
        </g>
        <DepthPanel
          x={138}
          y={1020}
          width={340}
          height={172}
          accent={download && s.store === 1 ? THEME.success : THEME.flow}
        >
          {label('DEVICE', 308, 1070, THEME.muted, 28)}
          {label(p.fileLabel, 308, 1135, THEME.text, 34)}
        </DepthPanel>
        {s.upload > 0 && s.upload < 1 && (
          <MovingPacket
            curve={a}
            progress={s.upload}
            color={THEME.flow}
            data
            scale={1.8}
          />
        )}
        {s.store > 0 && s.store < 1 && (
          <MovingPacket
            curve={b}
            progress={s.store}
            color={THEME.success}
            data
            scale={1.8}
          />
        )}
        {label(
          s.status,
          502,
          1268,
          p.outcome === 'failed' && t >= 0.36 ? THEME.warning : THEME.success,
          34,
        )}
      </g>
    );
  }
  if (visual.component === 'BTreeLookup') {
    const p = visual.props,
      result = treeSearch(p),
      active = Math.min(
        result.path.length - 1,
        Math.floor(t * result.path.length),
      ),
      current = result.path[active];
    const positions = new Map<string, { x: number; y: number }>();
    const levels: string[][] = [];
    const walk = (id: string, d: number) => {
      levels[d] ??= [];
      levels[d]?.push(id);
      p.nodes
        .find((n) => n.id === id)
        ?.children.forEach((c) => {
          walk(c, d + 1);
        });
    };
    walk(p.rootNodeId, 0);
    levels.forEach((ids, d) => {
      ids.forEach((id, i) => {
        positions.set(id, {
          x: 504 + (i - (ids.length - 1) / 2) * (ids.length === 3 ? 280 : 408),
          y: 620 + d * 220,
        });
      });
    });
    return (
      <g>
        {p.nodes.flatMap((n) =>
          n.children.map((child) => {
            const a = positions.get(n.id),
              b = positions.get(child);
            if (!a || !b) return null;
            const chosen =
                result.path.includes(child) &&
                result.path.indexOf(child) <= active,
              curve = wire(a.x, a.y + 40, b.x, b.y - 40);
            const step = result.path.indexOf(child);
            const u =
              step > 0
                ? windowProgress(
                    t,
                    (step - 1) / result.path.length + 0.12,
                    step / result.path.length,
                  )
                : 0;
            return (
              <g key={`${n.id}-${child}`}>
                <MotionPath
                  curve={curve}
                  progress={chosen ? 1 : u}
                  color={THEME.flow}
                  dim={!result.path.includes(child)}
                />
                {step === active + 1 && u > 0 && u < 1 && (
                  <MovingPacket
                    curve={curve}
                    progress={u}
                    color={THEME.highlight}
                    scale={1.4}
                  />
                )}
              </g>
            );
          }),
        )}
        {p.nodes.map((n) => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const visited = result.path.indexOf(n.id);
          return (
            <g
              key={n.id}
              opacity={visited >= 0 && visited <= active ? 1 : 0.45}
            >
              <DepthPanel
                x={pos.x - 120}
                y={pos.y - 42}
                width={240}
                height={84}
                accent={n.id === current ? THEME.highlight : THEME.grid}
              >
                {label(
                  n.keys.length ? n.keys.join(' | ') : 'Empty',
                  pos.x,
                  pos.y + 12,
                  n.id === current ? THEME.highlight : THEME.text,
                  32,
                )}
              </DepthPanel>
            </g>
          );
        })}
        {label(
          t > 0.9
            ? result.found
              ? 'Key found'
              : 'Key not found'
            : 'Compare, then choose one branch',
          502,
          1200,
          THEME.highlight,
          34,
        )}
        {label('B-tree • degree 2 • illustrative', 502, 1270, THEME.muted, 26)}
      </g>
    );
  }
  if (visual.component === 'HashObjectGraph') {
    const p = visual.props,
      positions = new Map(
        p.objects.map((o, i) => [
          o.id,
          { x: i % 2 ? 706 : 300, y: 570 + Math.floor(i / 2) * 224 },
        ]),
      );
    return (
      <g>
        {p.edges.map((e, i) => {
          const a = positions.get(e.from),
            b = positions.get(e.to);
          if (!a || !b) return null;
          const u = windowProgress(
            t,
            i / Math.max(1, p.edges.length),
            (i + 0.8) / Math.max(1, p.edges.length),
          );
          const curve = wire(a.x, a.y + 32, b.x, b.y - 32);
          return (
            <g key={`${e.from}-${e.to}-${e.meaning}`}>
              <MotionPath curve={curve} progress={u} color={THEME.flow} />
              {u > 0 && u < 1 && (
                <MovingPacket
                  curve={curve}
                  progress={u}
                  color={THEME.flow}
                  scale={1.4}
                />
              )}
            </g>
          );
        })}
        {p.objects.map((o) => {
          const pos = positions.get(o.id);
          if (!pos) return null;
          return (
            <DepthPanel
              key={o.id}
              x={pos.x - 138}
              y={pos.y - 60}
              width={276}
              height={134}
              accent={
                o.kind === 'commit'
                  ? THEME.highlight
                  : o.kind === 'tree'
                    ? THEME.flow
                    : THEME.success
              }
            >
              {label(o.kind.toUpperCase(), pos.x, pos.y - 10, THEME.muted, 26)}
              {label(o.label, pos.x, pos.y + 40, THEME.text, 30)}
            </DepthPanel>
          );
        })}
        {label(
          p.objects.length
            ? 'References • illustrative IDs'
            : 'Empty object store',
          502,
          1270,
          THEME.muted,
          28,
        )}
      </g>
    );
  }
  const p = visual.props,
    step =
      p.steps[Math.min(p.steps.length - 1, Math.floor(t * p.steps.length))];
  const previous =
    p.steps[Math.max(0, Math.floor(t * p.steps.length) - 1)] ?? step;
  const u =
    t === 1 ? 1 : easeInOut(Math.min(1, ((t * p.steps.length) % 1) * 5));
  const y =
    ((previous?.line ?? 1) - 1) * 78 +
    ((step?.line ?? 1) - (previous?.line ?? 1)) * 78 * u;
  return (
    <g>
      <DepthPanel x={112} y={500} width={784} height={580} accent={THEME.flow}>
        <rect
          x={130}
          y={512 + y}
          width={748}
          height={65}
          rx={12}
          fill={THEME.grid}
        />
        {p.lines.map((line, i) => (
          <SvgText
            // biome-ignore lint/suspicious/noArrayIndexKey: immutable reviewed lines may repeat; no component state.
            key={`${i}-${line}`}
            text={`${i + 1}   ${line}`}
            x={148}
            y={550 + i * 78}
            size={30}
            columns={44}
            color={i + 1 === step?.line ? THEME.highlight : THEME.muted}
          />
        ))}
      </DepthPanel>
      <DepthPanel
        x={166}
        y={1130}
        width={676}
        height={106}
        accent={THEME.success}
      >
        {label(step?.state ?? '', 504, 1196, THEME.success, 34)}
      </DepthPanel>
      {label('Reviewed trace • never executed', 502, 1290, THEME.muted, 26)}
    </g>
  );
}
