import type { Scene, VideoScript } from '../../domain/videoscript.ts';
import { VIDEO, wrapText } from './theme.ts';

export { RenderInputError } from './input-error.ts';

import { compileVisualPlan } from './compile.ts';
import { RenderInputError } from './input-error.ts';
export interface PlannedScene {
  scene: Scene;
  from: number;
  durationFrames: number;
}

export function planSilentRender(script: VideoScript) {
  if (
    script.profile !== 'technology-explainer' ||
    script.target.width !== VIDEO.width ||
    script.target.height !== VIDEO.height ||
    script.target.fps !== VIDEO.fps
  ) {
    throw new RenderInputError(
      'The silent renderer supports technology-explainer at 1080x1920, 30 fps only',
      null,
      '$["target"]',
    );
  }
  let from = 0;
  const scenes: PlannedScene[] = script.scenes.map((scene, index) => {
    const path = `$["scenes"][${index}]`;
    const fail = (reason: string, field: string): never => {
      throw new RenderInputError(reason, scene.scene_id, path + field);
    };
    if (scene.caption_overrides?.length)
      fail(
        'Caption rendering is not implemented in the silent preview',
        '["caption_overrides"]',
      );
    const visual = scene.visual;
    if (visual.type === 'title-card') {
      if (
        wrapText(visual.heading, 19).length > 5 ||
        wrapText(visual.subheading ?? '', 30).length > 3
      )
        fail(
          'Title text exceeds the mobile-safe layout; shorten the display text',
          '["visual"]',
        );
    } else if (visual.type === 'composed') {
      if (visual.cues.some((c) => c.trigger.kind !== 'progress'))
        fail(
          'Phrase cues require reviewed audio alignment',
          '["visual"]["cues"]',
        );
    } else if (visual.type === 'cache-aside-proof') {
      if (scene.timing.preferred_seconds * VIDEO.fps < 30)
        fail(
          'Each cache proof beat needs at least one second for causal motion',
          '["timing"]',
        );
    } else if (visual.type === 'registered-animation') {
      if (scene.timing.preferred_seconds * VIDEO.fps < 30)
        fail('Mechanism scenes need at least 30 frames', '["timing"]');
      for (const cue of visual.cues)
        if (
          cue.trigger.kind !== 'progress' ||
          cue.trigger.to <= cue.trigger.from
        )
          fail(
            'Mechanism cues require nonzero progress windows; phrase cues need reviewed audio alignment',
            '["visual"]["cues"]',
          );
    } else {
      if (!visual.props.illustrative)
        fail(
          'This preview renderer supports illustrative flows only; it does not verify a real system trace',
          '["visual"]["props"]["illustrative"]',
        );
      if (
        visual.props.request.path.length > 18 ||
        (visual.props.response?.statusText.length ?? 0) > 18 ||
        (visual.props.response?.bodyPreview?.length ?? 0) > 50
      )
        fail(
          'Display fields exceed this renderer’s safe label bounds (path/status text 18, body preview 50 characters)',
          '["visual"]["props"]',
        );
      if (
        visual.props.visualPhase !== 'idle' &&
        (!visual.props.show.browser ||
          !visual.props.show.server ||
          !visual.props.show.network)
      )
        fail(
          'Flow phases require visible browser, server and network endpoints',
          '["visual"]["props"]["show"]',
        );
      if (visual.props.visualPhase === 'route' && !visual.props.show.handler)
        fail(
          'The route phase requires a visible handler',
          '["visual"]["props"]["show"]["handler"]',
        );
      const targets = new Set<string>();
      visual.cues.forEach((cue, cueIndex) => {
        if (
          cue.trigger.kind !== 'progress' ||
          cue.action.kind !== 'move' ||
          cue.action.value !== undefined ||
          !['http-request', 'http-response'].includes(cue.action.target)
        )
          fail(
            'Silent previews support progress/move cues for http-request or http-response only; phrase cues need measured audio alignment',
            `["visual"]["cues"][${cueIndex}]`,
          );
        if (targets.has(cue.action.target))
          fail(
            'Multiple movement windows for the same packet are ambiguous',
            `["visual"]["cues"][${cueIndex}]`,
          );
        targets.add(cue.action.target);
        const phase = visual.props.visualPhase;
        if (
          (cue.action.target === 'http-request' && phase !== 'request') ||
          (cue.action.target === 'http-response' && phase !== 'response')
        )
          fail(
            'Packet movement cue does not match the visual phase',
            `["visual"]["cues"][${cueIndex}]`,
          );
      });
    }
    const durationFrames = Math.round(
      scene.timing.preferred_seconds * VIDEO.fps,
    );
    if (
      !Number.isSafeInteger(durationFrames) ||
      durationFrames < 2 ||
      durationFrames > 18000
    )
      fail(
        'Silent scene estimates must resolve to 2–18000 frames',
        '["timing"]',
      );
    const planned = { scene, from, durationFrames };
    from += durationFrames;
    return planned;
  });
  if (from > 108000)
    throw new RenderInputError(
      'Silent preview exceeds the one-hour render limit',
    );
  compileVisualPlan(script, scenes);
  return {
    scenes,
    durationFrames: from,
    timingMode: 'silent-preview-estimates' as const,
    measuredAudio: false as const,
  };
}

export function sceneAtFrame(
  scenes: PlannedScene[],
  frame: number,
): PlannedScene {
  const scene = scenes.find(
    (item) => frame >= item.from && frame < item.from + item.durationFrames,
  );
  if (!scene || !Number.isInteger(frame))
    throw new RangeError('Frame is outside the planned timeline');
  return scene;
}
