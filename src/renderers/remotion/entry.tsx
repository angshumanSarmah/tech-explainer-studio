import '@fontsource-variable/inter/wght.css';
import { Composition, registerRoot } from 'remotion';
import { parseVideoScript } from '../../domain/validation.ts';
import { resolvePresentation } from '../../timing/timeline.ts';
import { ExplainerComposition } from './Composition.tsx';
import { planSilentRender } from './plan.ts';
import { VIDEO } from './theme.ts';

function Root() {
  return (
    <Composition
      id="TechExplainerSilent"
      component={ExplainerComposition}
      defaultProps={{ guides: false }}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={2}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.presentation
          ? resolvePresentation(
              parseVideoScript(props.script),
              props.presentation,
            ).durationFrames
          : planSilentRender(parseVideoScript(props.script)).durationFrames,
      })}
    />
  );
}
registerRoot(Root);
