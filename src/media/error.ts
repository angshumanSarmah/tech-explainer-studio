export class MediaError extends Error {
  readonly code: string;
  readonly stage: string;
  readonly sceneId: string | null;
  constructor(
    code: string,
    stage: string,
    sceneId: string | null,
    reason: string,
  ) {
    super(reason);
    this.name = 'MediaError';
    this.code = code;
    this.stage = stage;
    this.sceneId = sceneId;
  }
}
