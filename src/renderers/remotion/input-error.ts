export class RenderInputError extends Error {
  readonly scene_id: string | null;
  readonly path: string;
  readonly code = 'UNSUPPORTED_RENDER_INPUT';
  constructor(reason: string, scene_id: string | null = null, path = '$') {
    super(reason);
    this.name = 'RenderInputError';
    this.scene_id = scene_id;
    this.path = path;
  }
}
