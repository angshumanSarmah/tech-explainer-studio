import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import {
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
} from '@remotion/renderer';
import {
  CITY_DEMAND_EXAMPLE,
  CityDemandHeatmapSchema,
} from '../src/domain/spatial.ts';
import { probeSilentVideo } from '../src/renderers/remotion/media-tools.ts';

// Private feasibility harness: prove the component before adding it to Director.
const dir = resolve(process.argv[2] ?? 'output/phase11b/spatial-smoke');
await mkdir(dir);
const props = CityDemandHeatmapSchema.parse(CITY_DEMAND_EXAMPLE);
const component = resolve('src/visuals/CityDemandHeatmap.tsx');
const entry = join(dir, 'entry.tsx');
await writeFile(
  entry,
  `
import React,{useState,useEffect} from 'react';
import {registerRoot,Composition,useCurrentFrame,delayRender,continueRender,cancelRender} from 'remotion';
import '@fontsource-variable/inter';
import {CityDemandHeatmap} from ${JSON.stringify(component)};
const props=${JSON.stringify(props)};
const View=()=> {const [h]=useState(()=>delayRender('font'));useEffect(()=>{document.fonts.load('600 48px "Inter Variable"').then(()=>document.fonts.ready).then(()=>continueRender(h)).catch(cancelRender)},[h]);return <svg width="1080" height="1920" style={{background:'#101826',fontFamily:'Inter Variable'}}><CityDemandHeatmap props={props} progress={useCurrentFrame()/59}/></svg>};
registerRoot(()=> <Composition id="SpatialSmoke" component={View} width={1080} height={1920} fps={30} durationInFrames={60}/>);
`,
);
const start = performance.now();
const serveUrl = await bundle({
  entryPoint: entry,
  outDir: join(dir, 'bundle'),
  enableCaching: false,
  gitSource: null,
});
const browserExecutable =
  process.env.STUDIO_BROWSER ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await openBrowser('chrome', {
  browserExecutable,
  chromiumOptions: { gl: 'swangle' },
  logLevel: 'error',
});
try {
  const common = {
    serveUrl,
    puppeteerInstance: browser,
    browserExecutable,
    inputProps: {},
    logLevel: 'error',
  };
  const composition = await selectComposition({
    ...common,
    id: 'SpatialSmoke',
  });
  for (const frame of [12, 35, 12]) {
    await renderStill({
      ...common,
      composition,
      frame,
      output: join(dir, `frame-${frame}-${performance.now().toFixed(0)}.png`),
      imageFormat: 'png',
    });
  }
  await renderMedia({
    ...common,
    composition,
    outputLocation: join(dir, 'video.mp4'),
    codec: 'h264',
    pixelFormat: 'yuv420p',
    concurrency: 4,
    muted: true,
    imageFormat: 'png',
  });
  const qc = await probeSilentVideo(join(dir, 'video.mp4'), 60);
  const files = (await import('node:fs/promises')).readdir;
  const repeated = (await files(dir)).filter((f) => f.startsWith('frame-12-'));
  const report = {
    wallSeconds: (performance.now() - start) / 1000,
    nodePeakRssKiB: process.resourceUsage().maxRSS,
    memoryScope: 'Node only',
    media: qc.summary,
    shuffledRepeatPngEqual: (await readFile(join(dir, repeated[0]))).equals(
      await readFile(join(dir, repeated[1])),
    ),
    template: 'CityDemandHeatmap',
    renderMode: props.renderMode,
    approvedForRelease: false,
  };
  await writeFile(join(dir, 'smoke.json'), JSON.stringify(report, null, 2));
  console.log(report);
} finally {
  await browser.close({ silent: true });
}
