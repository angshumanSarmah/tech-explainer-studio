import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runBoundedProcess } from '../../src/audio/process-runner.ts';
import { NarrationError } from '../../src/audio/types.ts';
import type { ResourceLimits } from '../../src/config/narration.ts';

const limits: ResourceLimits = {
  timeoutMs: 3000,
  cpuSeconds: 3,
  threads: 1,
  maxTextChars: 2000,
  maxProcessOutputBytes: 4096,
  maxWavBytes: 1048576,
  maxAudioSeconds: 10,
};
test('bounded runner transports quotes/newlines/shell text as data with no shell evaluation', async () => {
  const text = '"HTTP"; $(echo SECRET) `echo nope`\nbackslash\\';
  const result = await runBoundedProcess({
    executable: process.execPath,
    args: [
      '-e',
      'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s))));',
    ],
    input: JSON.stringify({ text }),
    limits,
  });
  assert.equal(JSON.parse(result.stdout).text, text);
});
test('bounded runner fails on nonzero child exit and unavailable executable', async () => {
  await assert.rejects(
    () =>
      runBoundedProcess({
        executable: process.execPath,
        args: ['-e', 'process.exit(7)'],
        input: '{}',
        limits,
      }),
    (e: unknown) => e instanceof NarrationError && e.code === 'PROCESS_FAILED',
  );
  await assert.rejects(
    () =>
      runBoundedProcess({
        executable: '/does-not-exist/python',
        args: [],
        input: '{}',
        limits,
      }),
    (e: unknown) =>
      e instanceof NarrationError && e.code === 'PROCESS_START_FAILED',
  );
});
test('bounded runner kills timed-out and excessive-output children', async () => {
  await assert.rejects(
    () =>
      runBoundedProcess({
        executable: process.execPath,
        args: ['-e', 'setInterval(()=>{},1000)'],
        input: '{}',
        limits: { ...limits, timeoutMs: 100 },
      }),
    (e: unknown) => e instanceof NarrationError && e.code === 'PROCESS_TIMEOUT',
  );
  await assert.rejects(
    () =>
      runBoundedProcess({
        executable: process.execPath,
        args: ['-e', 'process.stdout.write("x".repeat(100000))'],
        input: '{}',
        limits: { ...limits, maxProcessOutputBytes: 256 },
      }),
    (e: unknown) =>
      e instanceof NarrationError && e.code === 'PROCESS_OUTPUT_LIMIT',
  );
});
