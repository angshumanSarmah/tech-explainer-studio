import type { ResourceLimits, VoiceSettings } from '../config/narration.ts';

export class NarrationError extends Error {
  readonly code: string;
  readonly sceneId: string | null;
  constructor(code: string, reason: string, sceneId: string | null = null) {
    super(reason);
    this.name = 'NarrationError';
    this.code = code;
    this.sceneId = sceneId;
  }
}

export interface HealthReport {
  provider: 'mock' | 'kokoro-onnx';
  ready: boolean;
  checks: { code: string; ok: boolean; reason: string }[];
  settings: VoiceSettings;
  limits: ResourceLimits;
  identity: Record<string, string | null>;
}
export interface NarrationRequest {
  sceneId: string;
  text: string;
  outputDir: string;
}
export interface NarrationArtifact {
  schemaVersion: '1.0.0';
  provider: 'mock' | 'kokoro-onnx';
  isMock: boolean;
  sceneId: string;
  wavPath: string;
  metadataPath: string;
  sha256: string;
  bytes: number;
  durationSeconds: number;
  measurement: 'ffprobe';
  sampleRate: number;
  samples: number;
  originalTextSha256: string;
  spokenTextSha256: string;
  settings: VoiceSettings;
  identity: Record<string, string | null>;
  limits: ResourceLimits;
}
export interface NarrationProvider {
  readonly id: 'mock' | 'kokoro-onnx';
  health(): Promise<HealthReport>;
  synthesize(request: NarrationRequest): Promise<NarrationArtifact>;
}
