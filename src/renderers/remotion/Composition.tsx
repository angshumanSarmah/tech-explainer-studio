import { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { BRAND } from '../../branding/profile.ts';
import { parseVideoScript } from '../../domain/validation.ts';
import type { VideoScript } from '../../domain/videoscript.ts';
import {
  type Presentation,
  resolvePresentation,
} from '../../timing/timeline.ts';
import { CACHE_PHASE_COPY } from '../../visuals/cache-aside-state.ts';
import { PHASE_LABELS } from '../../visuals/flow-state.ts';
import type { StagedImages } from '../../visuals/LayeredAssets.tsx';
import { LibraryScene, libraryTitle } from '../../visuals/LibraryScene.tsx';
import { SvgText } from '../../visuals/SvgText.tsx';
import { titleCardCopy } from '../../visuals/title-card.ts';
import { planSilentRender, sceneAtFrame } from './plan.ts';
import { renderRegistry } from './registry.tsx';
import { CAPTION, MOTION, SAFE, THEME, VIDEO, wrapText } from './theme.ts';

export type CompositionProps = {
  script?: VideoScript;
  guides?: boolean;
  presentation?: Presentation;
  assets?: StagedImages;
};

function assertLabels(svg: SVGSVGElement, sceneId: string) {
  const content = svg
    .querySelector('[data-scene-content]')
    ?.getBoundingClientRect();
  const band = svg
    .querySelector('[data-caption-band]')
    ?.getBoundingClientRect();
  if (content && band && content.bottom + 48 > band.top)
    throw new Error(
      `${sceneId}: scene graphics need at least 48px clearance above captions`,
    );
  const labels = Array.from(
    svg.querySelectorAll<SVGTextElement>('[data-label]'),
  ).map((element) => ({ element, rect: element.getBoundingClientRect() }));
  for (const { element, rect } of labels) {
    if (
      rect.left < SAFE.left - 1 ||
      rect.right > SAFE.right + 1 ||
      rect.top < SAFE.top - 1 ||
      rect.bottom > SAFE.bottom + 1
    )
      throw new Error(
        `${sceneId}: label outside the mobile safe area: ${element.textContent}`,
      );
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i];
      const b = labels[j];
      if (
        a &&
        b &&
        Math.min(a.rect.right, b.rect.right) -
          Math.max(a.rect.left, b.rect.left) >
          2 &&
        Math.min(a.rect.bottom, b.rect.bottom) -
          Math.max(a.rect.top, b.rect.top) >
          2
      )
        throw new Error(
          `${sceneId}: overlapping labels: ${a.element.textContent} / ${b.element.textContent}`,
        );
    }
  }
}

export function ExplainerComposition({
  script,
  guides,
  presentation,
  assets,
}: CompositionProps) {
  const frame = useCurrentFrame();
  const validated = parseVideoScript(script);
  const plan = presentation
    ? resolvePresentation(validated, presentation)
    : planSilentRender(validated);
  const caption = presentation?.captions.find(
    (c) => frame >= c.startFrame && frame < c.endFrame,
  );
  const active = sceneAtFrame(plan.scenes, frame);
  const scene = active.scene;
  const localFrame = frame - active.from;
  const visual = scene.visual;
  const cardCopy =
    visual.type === 'registered-animation'
      ? {
          rows: [],
          label: 'TECH EXPLAINER',
          footnote:
            visual.component === 'CityDemandHeatmap'
              ? 'Illustrative • no real dispatch or pricing model'
              : visual.component === 'LayeredAssetScene'
                ? 'Reviewed illustration • 2.5D layers'
                : 'Illustrative model • simplified for explanation',
        }
      : visual.type === 'cache-aside-proof'
        ? {
            rows: [],
            label: 'CACHE-ASIDE / MOTION PROOF',
            footnote: 'Illustrative read path / no benchmark claims',
          }
        : titleCardCopy(visual.type === 'title-card' ? visual : undefined);
  const ref = useRef<SVGSVGElement>(null);
  const [fontHandle] = useState(() => delayRender('Load bundled Inter font'));
  useEffect(() => {
    document.fonts
      .load(BRAND.typography.fontLoad)
      .then(() => document.fonts.ready)
      .then(() => continueRender(fontHandle))
      .catch(cancelRender);
  }, [fontHandle]);
  useEffect(() => {
    if (!Number.isInteger(frame)) throw new Error('Invalid composition frame');
    const handle = delayRender('Check mobile label bounds');
    document.fonts.ready
      .then(() => {
        if (ref.current) assertLabels(ref.current, scene.scene_id);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [frame, scene.scene_id]);
  const index = plan.scenes.indexOf(active);
  const opacity =
    visual.type === 'cache-aside-proof'
      ? 1
      : interpolate(
          localFrame,
          [0, MOTION.appearFrames],
          [BRAND.motion.initialOpacity, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        );
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      <svg
        ref={ref}
        width={VIDEO.width}
        height={VIDEO.height}
        viewBox="0 0 1080 1920"
        style={{ fontFamily: THEME.font }}
        role="img"
        aria-label={scene.educational_goal}
      >
        <title>{scene.educational_goal}</title>
        <rect width={1080} height={1920} fill={THEME.bg} />
        <path
          d="M960 0 V1920 M0 1660 H1080 M0 150 H1080"
          stroke={THEME.grid}
          strokeWidth={1}
        />
        <g opacity={opacity}>
          <SvgText
            text={`${cardCopy.label}     ${String(index + 1).padStart(2, '0')} / ${String(plan.scenes.length).padStart(2, '0')}`}
            x={96}
            y={220}
            size={BRAND.typography.sizes.s28}
            columns={60}
            color={THEME.muted}
            weight={BRAND.typography.weights.strong}
          />
          <g data-scene-content={presentation ? 'true' : undefined}>
            {visual.type === 'title-card' ? (
              <g>
                <SvgText
                  text={visual.heading}
                  x={96}
                  y={380}
                  size={BRAND.typography.sizes.s76}
                  columns={19}
                  gap={90}
                  weight={BRAND.typography.weights.heading}
                />
                {visual.subheading && (
                  <SvgText
                    text={visual.subheading}
                    x={96}
                    y={860}
                    size={BRAND.typography.sizes.s42}
                    columns={30}
                    gap={52}
                    color={THEME.muted}
                  />
                )}
                <rect
                  x={96}
                  y={presentation ? 1000 : 1060}
                  width={824}
                  height={presentation ? 260 : 320}
                  rx={28}
                  fill={THEME.surface}
                />
                {cardCopy.rows.map((line, i) => (
                  <SvgText
                    key={line}
                    text={line}
                    x={132}
                    y={presentation ? 1060 + i * 70 : 1140 + i * 82}
                    size={BRAND.typography.sizes.s36}
                    columns={38}
                    color={
                      i === 1
                        ? THEME.highlight
                        : i === 2
                          ? THEME.success
                          : THEME.flow
                    }
                  />
                ))}
              </g>
            ) : visual.type === 'registered-animation' ? (
              <g>
                <SvgText
                  text={libraryTitle(visual)}
                  x={96}
                  y={338}
                  size={BRAND.typography.sizes.s68}
                  columns={20}
                  gap={78}
                  weight={BRAND.typography.weights.heading}
                />
                <LibraryScene
                  visual={visual}
                  frame={localFrame}
                  durationFrames={active.durationFrames}
                  {...(assets ? { assets } : {})}
                />
              </g>
            ) : visual.type === 'cache-aside-proof' ? (
              <g>
                <SvgText
                  text={CACHE_PHASE_COPY[visual.props.visualPhase].title}
                  x={96}
                  y={338}
                  size={BRAND.typography.sizes.s68}
                  columns={20}
                  weight={BRAND.typography.weights.heading}
                />
                <SvgText
                  text={CACHE_PHASE_COPY[visual.props.visualPhase].description}
                  x={96}
                  y={419}
                  size={BRAND.typography.sizes.s30}
                  columns={48}
                  color={THEME.muted}
                />
                <renderRegistry.CacheAsideProof.Component
                  props={visual.props}
                  frame={localFrame}
                  durationFrames={active.durationFrames}
                />
              </g>
            ) : (
              <g>
                <SvgText
                  text={PHASE_LABELS[visual.props.visualPhase][0]}
                  x={96}
                  y={330}
                  size={BRAND.typography.sizes.s68}
                  columns={20}
                  gap={78}
                  weight={BRAND.typography.weights.heading}
                />
                <SvgText
                  text={PHASE_LABELS[visual.props.visualPhase][1]}
                  x={96}
                  y={490}
                  size={BRAND.typography.sizes.s34}
                  columns={40}
                  gap={42}
                  color={THEME.muted}
                />
                <renderRegistry.BrowserRequestFlow.Component
                  props={visual.props}
                  cues={visual.cues}
                  frame={localFrame}
                  durationFrames={active.durationFrames}
                  captionSpace={Boolean(presentation)}
                />
              </g>
            )}
          </g>
          <SvgText
            text={cardCopy.footnote}
            x={96}
            y={presentation ? 1324 : 1530}
            size={BRAND.typography.sizes.s24}
            columns={70}
            color={THEME.muted}
          />
          <rect
            x={96}
            y={1570}
            width={824}
            height={5}
            rx={2}
            fill={THEME.grid}
          />
          <rect
            x={96}
            y={1570}
            width={(824 * (frame + 1)) / plan.durationFrames}
            height={5}
            rx={2}
            fill={THEME.flow}
          />
        </g>
        {caption && (
          <g>
            <rect
              data-caption-band="true"
              x={96}
              y={CAPTION.bandTop}
              width={824}
              height={CAPTION.bandHeight}
              rx={18}
              fill={CAPTION.background}
            />
            <SvgText
              text={caption.text}
              x={508}
              y={
                CAPTION.firstBaseline +
                ((CAPTION.maxLines -
                  wrapText(caption.text, CAPTION.columns).length) *
                  CAPTION.lineGap) /
                  2
              }
              size={CAPTION.fontSize}
              color={CAPTION.text}
              columns={CAPTION.columns}
              gap={CAPTION.lineGap}
              anchor="middle"
              weight={BRAND.typography.weights.strong}
            />
          </g>
        )}
        {guides && (
          <g
            fill="none"
            stroke={THEME.highlight}
            strokeDasharray="12 10"
            strokeWidth={2}
          >
            <rect
              x={SAFE.left}
              y={SAFE.top}
              width={SAFE.right - SAFE.left}
              height={SAFE.bottom - SAFE.top}
            />
            <path d="M0 1660 H1080" />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
}
