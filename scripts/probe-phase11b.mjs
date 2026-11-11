import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { openBrowser } from '@remotion/renderer';
import { renderSilentPreview } from '../src/renderers/remotion/render.ts';

// Read-only capability check. No installation, download, remote page or asset.
const output = resolve(process.argv[2] ?? 'output/phase11b/probe');
await mkdir(output, { recursive: true });
const browserExecutable =
  process.env.STUDIO_BROWSER ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const report = { packages: {}, contexts: [], approvedForRelease: false };
for (const name of [
  'remotion',
  'react',
  '@remotion/three',
  '@react-three/fiber',
  'three',
]) {
  try {
    report.packages[name] = JSON.parse(
      await readFile(
        fileURLToPath(import.meta.resolve(`${name}/package.json`)),
        'utf8',
      ),
    ).version;
  } catch {
    report.packages[name] = 'not installed';
  }
}
for (const gl of ['swangle', 'angle']) {
  let browser;
  try {
    browser = await openBrowser('chrome', {
      browserExecutable,
      chromiumOptions: { gl, disableWebSecurity: false },
      logLevel: 'error',
    });
    const page = await browser.newPage({
      context: () => null,
      logLevel: 'error',
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    });
    const context = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const gl = canvas.getContext('webgl2', {
        antialias: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) return { webgl2: false };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const sample = () => {
        gl.clearColor(0.25, 0.5, 0.75, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const pixels = new Uint8Array(16 * 16 * 4);
        gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return [...pixels];
      };
      const first = sample();
      const second = sample();
      return {
        webgl2: true,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        version: gl.getParameter(gl.VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        repeatedClearEqual: JSON.stringify(first) === JSON.stringify(second),
        firstPixel: sample().slice(0, 4),
      };
    });
    report.contexts.push({ backend: gl, ...context });
  } catch (error) {
    report.contexts.push({ backend: gl, error: error.message });
  } finally {
    await browser?.close({ silent: true });
  }
}
await writeFile(
  join(output, 'capabilities.json'),
  JSON.stringify(report, null, 2),
);
if (process.argv.includes('--skip-mp4')) process.exit(0);
const script = JSON.parse(
  await readFile('examples/phase11/code-trace.videoscript.json', 'utf8'),
);
const start = performance.now();
try {
  const result = await renderSilentPreview(script, {
    outputDir: join(output, 'headless-smoke'),
    browserExecutable,
    frameRange: [0, 29],
  });
  report.headlessSmoke = {
    wallSeconds: (performance.now() - start) / 1000,
    media: result.manifest.media,
    videoSha256: result.manifest.videoSha256,
    nodePeakRssKiB: process.resourceUsage().maxRSS,
    memoryScope: 'Node process only; not browser/FFmpeg tree',
  };
} finally {
  await writeFile(
    join(output, 'capabilities.json'),
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify(report, null, 2));
