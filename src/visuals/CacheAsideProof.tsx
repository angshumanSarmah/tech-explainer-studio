import { BRAND } from '../branding/profile.ts';
import type { CacheAsideProofProps } from '../domain/visuals.ts';
import { THEME } from '../renderers/remotion/theme.ts';
import { CACHE_PATHS, cacheAsideState } from './cache-aside-state.ts';
import { DepthPanel, MotionPath, MovingPacket } from './motion-primitives.tsx';
import { SvgText } from './SvgText.tsx';

/** Focused illustrative proof, not the Phase 11 component library or a live system trace. */
export function CacheAsideProof({
  props,
  frame,
  durationFrames,
  premium = false,
}: {
  props: CacheAsideProofProps;
  frame: number;
  durationFrames: number;
  premium?: boolean;
}) {
  const s = cacheAsideState(props.visualPhase, frame, durationFrames);
  const hit = props.visualPhase === 'hit';
  const populated = s.entry > 0;
  const badgeColor =
    s.badge === 'HIT' || s.badge === 'READY'
      ? THEME.success
      : s.badge === 'MISS'
        ? THEME.highlight
        : THEME.flow;
  return (
    <g>
      <path
        d="M104 954 L530 1170 L912 954 M104 992 L530 1208 L912 992"
        stroke={THEME.grid}
        strokeWidth={1}
        opacity={0.35}
        fill="none"
      />
      {!premium && (
        <DepthPanel x={96} y={480} width={816} height={62}>
          <SvgText
            text={hit ? 'READ 02' : 'READ 01'}
            x={120}
            y={520}
            size={BRAND.typography.sizes.s26}
            color={THEME.flow}
          />
          <SvgText
            text="DATABASE READS"
            x={566}
            y={519}
            size={BRAND.typography.sizes.s23}
            color={THEME.muted}
          />
          <SvgText
            text={String(s.queryCount)}
            x={868}
            y={522}
            size={BRAND.typography.sizes.s32}
            color={hit ? THEME.muted : THEME.text}
            weight={BRAND.typography.weights.heading}
          />
        </DepthPanel>
      )}
      <MotionPath
        curve={CACHE_PATHS.lookup}
        progress={props.visualPhase === 'lookup' || hit ? s.lookup : 0}
        color={THEME.flow}
      />
      <MotionPath
        curve={CACHE_PATHS.reply}
        progress={hit ? s.hitReply : s.missReply}
        color={hit ? THEME.success : THEME.highlight}
      />
      <MotionPath
        curve={CACHE_PATHS.query}
        progress={props.visualPhase === 'miss' ? s.query : 0}
        color={THEME.flow}
        dim={hit}
      />
      <MotionPath
        curve={CACHE_PATHS.data}
        progress={props.visualPhase === 'fill' ? s.data : 0}
        color={THEME.success}
        dim={hit}
      />
      <MotionPath
        curve={CACHE_PATHS.fill}
        progress={props.visualPhase === 'fill' ? s.fill : 0}
        color={THEME.success}
      />
      <DepthPanel x={96} y={610} width={300} height={200} accent={THEME.flow}>
        <circle
          cx={364}
          cy={637}
          r={5}
          fill={s.appStatus === 'result ready' ? THEME.success : THEME.flow}
        />
        <SvgText
          text="APP"
          x={124}
          y={659}
          size={BRAND.typography.sizes.s36}
          weight={BRAND.typography.weights.heading}
        />
        <SvgText
          text={premium ? 'Application' : 'cache-aside reader'}
          x={124}
          y={692}
          size={BRAND.typography.sizes.s23}
          color={THEME.muted}
          columns={24}
        />
        <rect x={120} y={714} width={252} height={44} rx={10} fill={THEME.bg} />
        <SvgText
          text={props.keyLabel}
          x={136}
          y={745}
          size={BRAND.typography.sizes.s26}
          color={THEME.flow}
        />
        <SvgText
          text={s.appStatus}
          x={124}
          y={787}
          size={BRAND.typography.sizes.s23}
          color={s.appStatus === 'result ready' ? THEME.success : THEME.muted}
        />
      </DepthPanel>
      <DepthPanel
        x={616}
        y={610}
        width={296}
        height={250}
        accent={populated ? THEME.success : THEME.grid}
      >
        <SvgText
          text="CACHE"
          x={640}
          y={659}
          size={BRAND.typography.sizes.s36}
          weight={BRAND.typography.weights.heading}
        />
        <SvgText
          text="reusable copy"
          x={640}
          y={693}
          size={BRAND.typography.sizes.s23}
          color={THEME.muted}
        />
        <rect
          x={640}
          y={718}
          width={248}
          height={108}
          rx={14}
          stroke={THEME.grid}
          strokeDasharray="6 7"
          fill={THEME.bg}
        />
        {!populated && (
          <SvgText
            text="EMPTY"
            x={764}
            y={782}
            size={BRAND.typography.sizes.s26}
            color={THEME.muted}
            anchor="middle"
          />
        )}
        {populated && (
          <g opacity={s.entry} transform={`translate(0 ${8 * (1 - s.entry)})`}>
            <rect
              x={640}
              y={718}
              width={248}
              height={108}
              rx={14}
              fill={THEME.surface}
              stroke={THEME.success}
              strokeWidth={2}
            />
            <SvgText
              text={props.keyLabel}
              x={658}
              y={755}
              size={BRAND.typography.sizes.s23}
              color={THEME.muted}
            />
            <SvgText
              text={props.valueLabel}
              x={658}
              y={796}
              size={BRAND.typography.sizes.s26}
              color={THEME.success}
              weight={BRAND.typography.weights.strong}
            />
          </g>
        )}
      </DepthPanel>
      <g>
        <rect
          x={796}
          y={556}
          width={116}
          height={40}
          rx={12}
          fill={THEME.surface}
          stroke={badgeColor}
          strokeWidth={2}
        />
        <SvgText
          text={s.badge}
          x={854}
          y={585}
          size={BRAND.typography.sizes.s23}
          color={badgeColor}
          anchor="middle"
          weight={BRAND.typography.weights.strong}
        />
      </g>
      <g opacity={hit ? 0.62 : 1}>
        <ellipse
          cx={544}
          cy={1230}
          rx={190}
          ry={24}
          fill={THEME.grid}
          opacity={0.4}
        />
        <path
          d="M356 1088 V1198 C356 1240 724 1240 724 1198 V1088 Z"
          fill={THEME.surface}
          stroke={s.dbBusy ? THEME.flow : THEME.grid}
          strokeWidth={2}
        />
        <ellipse
          cx={540}
          cy={1088}
          rx={184}
          ry={32}
          fill={THEME.surface}
          stroke={s.dbBusy ? THEME.flow : THEME.grid}
          strokeWidth={2}
        />
        <SvgText
          text="DATABASE"
          x={540}
          y={1161}
          size={BRAND.typography.sizes.s36}
          anchor="middle"
          weight={BRAND.typography.weights.heading}
        />
        <SvgText
          text={
            s.dbBusy
              ? 'reading source data'
              : hit
                ? premium
                  ? 'Idle'
                  : 'IDLE / not queried'
                : 'source of truth'
          }
          x={540}
          y={1200}
          size={BRAND.typography.sizes.s23}
          anchor="middle"
          color={s.dbBusy ? THEME.flow : THEME.muted}
        />
      </g>
      {s.requestVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.lookup}
          progress={s.lookup}
          color={THEME.flow}
        />
      )}
      {s.missVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.reply}
          progress={s.missReply}
          color={THEME.highlight}
        />
      )}
      {s.queryVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.query}
          progress={s.query}
          color={THEME.flow}
        />
      )}
      {s.dataVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.data}
          progress={s.data}
          color={THEME.success}
          data
        />
      )}
      {s.fillVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.fill}
          progress={s.fill}
          color={THEME.success}
          data
        />
      )}
      {s.hitVisible && (
        <MovingPacket
          scale={premium ? 1.65 : 1}
          curve={CACHE_PATHS.reply}
          progress={s.hitReply}
          color={THEME.success}
          data
        />
      )}
      <circle cx={112} cy={1284} r={5} fill={THEME.flow} />
      <SvgText
        text="REQUEST"
        x={128}
        y={1292}
        size={BRAND.typography.sizes.s23}
        color={THEME.muted}
      />
      <circle cx={380} cy={1284} r={5} fill={THEME.success} />
      <SvgText
        text="DATA"
        x={396}
        y={1292}
        size={BRAND.typography.sizes.s23}
        color={THEME.muted}
      />
      <circle cx={692} cy={1284} r={5} fill={THEME.highlight} />
      <SvgText
        text="MISS"
        x={708}
        y={1292}
        size={BRAND.typography.sizes.s23}
        color={THEME.muted}
      />
    </g>
  );
}
