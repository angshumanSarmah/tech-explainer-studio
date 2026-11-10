import { BRAND } from '../branding/profile.ts';
import type { BrowserRequestFlowProps, VisualSpec } from '../domain/visuals.ts';
import { CAPTION, THEME } from '../renderers/remotion/theme.ts';
import { flowState } from './flow-state.ts';
import { SvgText } from './SvgText.tsx';

function Arrow({
  x,
  up,
  active,
  lift = 0,
}: {
  x: number;
  up: boolean;
  active: boolean;
  lift?: number;
}) {
  const color = active ? (up ? THEME.success : THEME.flow) : THEME.grid;
  return (
    <g stroke={color} strokeWidth={6} fill="none">
      <path d={`M${x} 835 L${x} ${1090 - lift}`} />
      <path
        d={
          up
            ? `M${x - 14} 855 L${x} 835 L${x + 14} 855`
            : `M${x - 14} ${1070 - lift} L${x} ${1090 - lift} L${x + 14} ${1070 - lift}`
        }
      />
    </g>
  );
}

function Packet({
  x,
  y,
  label,
  secondary,
  response = false,
}: {
  x: number;
  y: number;
  label: string;
  secondary: string;
  response?: boolean;
}) {
  const color = response ? THEME.success : THEME.flow;
  return (
    <g>
      <rect
        x={x - 158}
        y={y - 62}
        width={316}
        height={124}
        rx={20}
        fill={THEME.bg}
        stroke={color}
        strokeWidth={3}
      />
      <SvgText
        text={label}
        x={x}
        y={y - 10}
        size={BRAND.typography.sizes.s32}
        columns={12}
        anchor="middle"
        weight={BRAND.typography.weights.heading}
        color={color}
        gap={34}
      />
      <SvgText
        text={secondary}
        x={x}
        y={y + 44}
        size={BRAND.typography.sizes.s24}
        columns={20}
        anchor="middle"
        color={THEME.muted}
      />
    </g>
  );
}

export function BrowserRequestFlow({
  props,
  cues,
  frame,
  durationFrames,
  captionSpace = false,
}: {
  props: BrowserRequestFlowProps;
  cues: Extract<VisualSpec, { type: 'tech-animation' }>['cues'];
  frame: number;
  durationFrames: number;
  captionSpace?: boolean;
}) {
  const state = flowState(props, cues, frame, durationFrames, captionSpace);
  const lift = captionSpace ? CAPTION.serverLift : 0;
  const response = props.response;
  const detail =
    state.phase === 'parse'
      ? `method: ${props.request.method}    path: ${props.request.path}`
      : state.phase === 'route'
        ? `${props.request.path} matches the selected route`
        : state.phase === 'response'
          ? response?.bodyPreview
            ? `Body preview: ${response.bodyPreview}`
            : 'Status + headers; no body depicted'
          : state.phase === 'idle'
            ? 'No message is in flight yet.'
            : state.phase === 'overview'
              ? 'The response follows request processing.'
              : `${props.request.method} ${props.request.path}  /  ${props.request.protocolLabel}`;
  return (
    <g>
      {props.show.browser && (
        <g>
          <rect
            x={96}
            y={580}
            width={824}
            height={190}
            rx={26}
            fill={THEME.surface}
            stroke={props.focus === 'browser' ? THEME.highlight : THEME.grid}
            strokeWidth={3}
          />
          <circle cx={135} cy={616} r={6} fill={THEME.flow} />
          <circle cx={159} cy={616} r={6} fill={THEME.grid} />
          <circle cx={183} cy={616} r={6} fill={THEME.grid} />
          <SvgText
            text="Browser"
            x={224}
            y={645}
            size={BRAND.typography.sizes.s46}
            weight={BRAND.typography.weights.strong}
          />
          <rect
            x={130}
            y={680}
            width={756}
            height={58}
            rx={12}
            fill={THEME.bg}
          />
          <SvgText
            text={`example.test${props.request.path}`}
            x={155}
            y={720}
            size={BRAND.typography.sizes.s32}
            columns={35}
            color={THEME.muted}
          />
        </g>
      )}
      {props.show.network && (
        <g>
          <SvgText
            text="TO SERVER"
            x={280}
            y={810}
            size={BRAND.typography.sizes.s26}
            anchor="middle"
            color={THEME.flow}
          />
          <SvgText
            text="TO BROWSER"
            x={740}
            y={810}
            size={BRAND.typography.sizes.s26}
            anchor="middle"
            color={THEME.success}
          />
          <Arrow x={280} up={false} active={state.requestVisible} lift={lift} />
          <Arrow x={740} up active={state.responseVisible} lift={lift} />
        </g>
      )}
      {props.show.server && (
        <g transform={lift ? `translate(0 -${lift})` : undefined}>
          <rect
            x={96}
            y={1120}
            width={824}
            height={210}
            rx={26}
            fill={THEME.surface}
            stroke={props.focus === 'server' ? THEME.highlight : THEME.grid}
            strokeWidth={3}
          />
          <SvgText
            text="HTTP server"
            x={136}
            y={1185}
            size={BRAND.typography.sizes.s44}
            weight={BRAND.typography.weights.strong}
          />
          <rect
            x={136}
            y={1220}
            width={300}
            height={70}
            rx={14}
            fill={state.parserActive ? THEME.highlight : THEME.bg}
          />
          <SvgText
            text="Parse request"
            x={158}
            y={1266}
            size={BRAND.typography.sizes.s30}
            color={
              state.parserActive
                ? THEME.bg
                : state.arrived
                  ? THEME.success
                  : THEME.muted
            }
          />
          {props.show.handler && (
            <g>
              <path
                d="M450 1255 H486 M475 1245 L486 1255 L475 1265"
                fill="none"
                stroke={state.handlerActive ? THEME.highlight : THEME.muted}
                strokeWidth={3}
              />
              <rect
                x={504}
                y={1220}
                width={374}
                height={70}
                rx={14}
                fill={state.handlerActive ? THEME.highlight : THEME.bg}
                stroke={props.focus === 'handler' ? THEME.highlight : 'none'}
                strokeWidth={2}
              />
              <SvgText
                text="Route handler"
                x={528}
                y={1266}
                size={BRAND.typography.sizes.s30}
                color={state.handlerActive ? THEME.bg : THEME.muted}
              />
            </g>
          )}
        </g>
      )}
      {state.requestVisible && (
        <Packet
          x={280}
          y={state.requestY}
          label={`${props.request.method} ${props.request.path}`}
          secondary={props.request.protocolLabel}
        />
      )}
      {state.responseVisible && (
        <Packet
          x={740}
          y={state.responseY}
          label={
            response ? `${response.status} ${response.statusText}` : 'Response'
          }
          secondary="HTTP reply"
          response
        />
      )}
      {captionSpace ? (
        <SvgText
          text={detail}
          x={96}
          y={1352 - lift}
          size={BRAND.typography.sizes.s24}
          columns={70}
          color={THEME.muted}
        />
      ) : (
        <g>
          <rect
            x={96}
            y={1360}
            width={824}
            height={140}
            rx={22}
            fill={THEME.surface}
          />
          <SvgText
            text={
              state.phase === 'response'
                ? 'RESPONSE DATA'
                : state.phase === 'route'
                  ? 'APPLICATION LOGIC'
                  : 'FOLLOW THE MESSAGE'
            }
            x={128}
            y={1396}
            size={BRAND.typography.sizes.s23}
            color={THEME.muted}
            weight={BRAND.typography.weights.strong}
          />
          <SvgText
            text={detail}
            x={128}
            y={1448}
            size={BRAND.typography.sizes.s32}
            columns={40}
            gap={36}
          />
        </g>
      )}
    </g>
  );
}
