import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import type { ResourceLimits } from '../config/narration.ts';
import { NarrationError } from './types.ts';

export interface ProcessJob {
  executable: string;
  args: string[];
  input: string;
  limits: ResourceLimits;
}
export interface ProcessResult {
  stdout: string;
}
export type ProcessRunner = (job: ProcessJob) => Promise<ProcessResult>;

export const runBoundedProcess: ProcessRunner = (job) =>
  new Promise((resolve, reject) => {
    const child = spawn(job.executable, job.args, {
      shell: false,
      env: {
        PATH: `${dirname(job.executable)}:/usr/bin:/bin`,
        PYTHONNOUSERSITE: '1',
        PYTHONDONTWRITEBYTECODE: '1',
        HF_HUB_OFFLINE: '1',
        TRANSFORMERS_OFFLINE: '1',
        OMP_NUM_THREADS: String(job.limits.threads),
        OPENBLAS_NUM_THREADS: String(job.limits.threads),
        MKL_NUM_THREADS: String(job.limits.threads),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let size = 0;
    let failure: NarrationError | undefined;
    const fail = (error: NarrationError) => {
      failure ??= error;
      child.kill('SIGKILL');
    };
    const timer = setTimeout(
      () =>
        fail(
          new NarrationError(
            'PROCESS_TIMEOUT',
            'Local synthesis exceeded timeoutMs; reduce text or increase the bounded timeout',
          ),
        ),
      job.limits.timeoutMs,
    );
    const receive = (chunk: Buffer, output: boolean) => {
      size += chunk.length;
      if (size > job.limits.maxProcessOutputBytes)
        fail(
          new NarrationError(
            'PROCESS_OUTPUT_LIMIT',
            'Worker output exceeded maxProcessOutputBytes',
          ),
        );
      else if (output) stdout += chunk.toString('utf8');
    };
    child.stdout.on('data', (chunk: Buffer) => receive(chunk, true));
    child.stderr.on('data', (chunk: Buffer) => receive(chunk, false));
    child.on('error', () => {
      failure ??= new NarrationError(
        'PROCESS_START_FAILED',
        'Cannot start the configured local Python; create .venv and install requirements-audio.lock',
      );
    });
    child.stdin.on('error', () => {});
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(
          new NarrationError(
            'PROCESS_FAILED',
            `Worker exited unsuccessfully (${signal ?? code}); check runtime, model compatibility and configured limits`,
          ),
        );
      else resolve({ stdout });
    });
    child.stdin.end(job.input);
  });
