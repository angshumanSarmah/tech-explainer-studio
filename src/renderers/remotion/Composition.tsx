import { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { parseVideoScript } from '../../domain/validation.ts';
import type { VideoScriptV1 } from '../../domain/videoscript.ts';
import {
  type Presentation,
  resolvePresentation,
} from '../../timing/timeline.ts';
import { PHASE_LABELS } from '../../visuals/flow-state.ts';
import { SvgText } from '../../visuals/SvgText.tsx';
import { planSilentRender, sceneAtFrame } from './plan.ts';
import { renderRegistry } from './registry.tsx';
import { CAPTION, MOTION, SAFE, THEME, VIDEO } from './theme.ts';

export type CompositionProps = {
  script?: VideoScriptV1;
  guides?: boolean;
  presentation?: Presentation;
};

function assertLabels(svg: SVGSVGElement, sceneId: string) {
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
  const ref = useRef<SVGSVGElement>(null);
  const [fontHandle] = useState(() => delayRender('Load bundled Inter font'));
  useEffect(() => {
    document.fonts
      .load('600 48px "Inter Variable"')
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
  const opacity = interpolate(localFrame, [0, MOTION.appearFrames], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
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
            text={`HTTP / ONE REQUEST     ${String(index + 1).padStart(2, '0')} / ${String(plan.scenes.length).padStart(2, '0')}`}
            x={96}
            y={220}
            size={28}
            columns={60}
            color={THEME.muted}
            weight={650}
          />
          {visual.type === 'title-card' ? (
            <g>
              <SvgText
                text={visual.heading}
                x={96}
                y={380}
                size={76}
                columns={19}
                gap={90}
                weight={700}
              />
              {visual.subheading && (
                <SvgText
                  text={visual.subheading}
                  x={96}
                  y={860}
                  size={42}
                  columns={30}
                  gap={52}
                  color={THEME.muted}
                />
              )}
              <rect
                x={96}
                y={1060}
                width={824}
                height={320}
                rx={28}
                fill={THEME.surface}
              />
              {(visual.variant === 'hook'
                ? [
                    '01   A browser asks',
                    '02   A server processes',
                    '03   A response returns',
                  ]
                : [
                    'Request: what do you want?',
                    'Process: choose what to return',
                    'Response: send the result',
                  ]
              ).map((line, i) => (
                <SvgText
                  key={line}
                  text={line}
                  x={132}
                  y={1140 + i * 82}
                  size={36}
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
          ) : (
            <g>
              <SvgText
                text={PHASE_LABELS[visual.props.visualPhase][0]}
                x={96}
                y={330}
                size={68}
                columns={20}
                gap={78}
                weight={700}
              />
              <SvgText
                text={PHASE_LABELS[visual.props.visualPhase][1]}
                x={96}
                y={490}
                size={34}
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
          <SvgText
            text="Illustrative HTTP flow / transport and security omitted"
            x={96}
            y={1530}
            size={24}
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
              x={96}
              y={1372}
              width={824}
              height={126}
              rx={18}
              fill={THEME.bg}
              stroke={THEME.grid}
              strokeWidth={2}
            />
            <SvgText
              text={caption.text}
              x={508}
              y={1404}
              size={CAPTION.fontSize}
              columns={CAPTION.columns}
              gap={CAPTION.lineGap}
              anchor="middle"
              weight={650}
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
