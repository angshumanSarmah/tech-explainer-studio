import { useEffect, useState } from 'react';
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from 'remotion';
import type { z } from 'zod';
import { BRAND } from '../branding/profile.ts';
import type { LayeredAssetSceneSchema } from '../domain/library.ts';
import { easeInOut } from './cache-aside-state.ts';
export type StagedImages = Record<string, string>;
export function LayeredAssets({
  props,
  t,
  assets,
  namespace = 'layer',
}: {
  props: z.infer<typeof LayeredAssetSceneSchema>;
  t: number;
  assets: StagedImages;
  namespace?: string;
}) {
  const [handle] = useState(() =>
    delayRender('Decode reviewed local image layers'),
  );
  const sources = JSON.stringify(
    props.layers.map((l) => assets[l.asset.recordSha256]),
  );
  useEffect(() => {
    Promise.all(
      (JSON.parse(sources) as (string | undefined)[]).map(async (file) => {
        if (!file) throw new Error('Missing staged image');
        const image = new Image();
        image.src = staticFile(file);
        await image.decode();
      }),
    )
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle, sources]);
  return (
    <g>
      {props.layers.map((l, i) => {
        const file = assets[l.asset.recordSha256];
        if (
          !file ||
          !/^visual-assets\/[a-f0-9]{64}\.(png|jpg|webp|svg)$/.test(file)
        )
          throw new Error(`Asset ${l.asset.assetId}: local staging missing`);
        const enter = easeInOut((t - l.enter) / 0.1),
          exit = easeInOut((l.exit - t) / 0.1),
          opacity = Math.min(enter, exit),
          u = props.intent === 'compare' ? 0 : easeInOut(t),
          parallaxDepth = props.intent === 'focus' ? 1 : l.depth,
          scale = 1 + (l.zoom - 1) * u;
        return (
          <g
            key={l.id}
            opacity={opacity}
            transform={`translate(${l.x + l.panX * u * parallaxDepth} ${l.y + l.panY * u * parallaxDepth}) scale(${scale})`}
          >
            <defs>
              <clipPath id={`${namespace}-${i}`}>
                <rect width={l.width} height={l.height} rx={24} />
              </clipPath>
            </defs>
            <rect
              x={8 + l.depth * 8}
              y={14 + l.depth * 8}
              width={l.width}
              height={l.height}
              rx={24}
              fill={BRAND.colors.grid}
              opacity={0.6}
            />
            <image
              href={staticFile(file)}
              width={l.width}
              height={l.height}
              preserveAspectRatio={
                l.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'
              }
              clipPath={`url(#${namespace}-${i})`}
            />
            <rect
              width={l.width}
              height={l.height}
              rx={24}
              fill={BRAND.colors.flow}
              opacity={0.06}
            />
            <rect
              width={l.width}
              height={l.height}
              rx={24}
              fill="none"
              stroke={BRAND.colors.grid}
              strokeWidth={2}
            />
          </g>
        );
      })}
    </g>
  );
}
