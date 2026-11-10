import { hash } from '../render-manifest/manifest.ts';
import type { Repository } from '../storage/repository.ts';
import {
  block,
  type GateName,
  ManifestSchema,
  type ReleaseManifest,
  type Review,
  ReviewSchema,
} from './model.ts';

export class ReleaseStore {
  readonly repository: Repository;
  constructor(repository: Repository) {
    this.repository = repository;
  }
  save(manifest: ReleaseManifest, guard: () => void = () => {}) {
    const parsed = ManifestSchema.parse(manifest);
    const text = JSON.stringify(parsed),
      id = hash(text);
    this.repository.transaction(() => {
      guard();
      const existed = this.repository.db
        .prepare('SELECT id FROM releases WHERE id=?')
        .get(id);
      if (existed) {
        this.get(id);
        return;
      }
      this.repository.db
        .prepare('INSERT INTO releases VALUES(?,?,?,?)')
        .run(id, parsed.subject, text, this.repository.now());
      this.audit(id, 'prepared', { manifestSha256: id });
    });
    return id;
  }
  get(id: string) {
    const row = this.repository.db
      .prepare('SELECT manifest FROM releases WHERE id=?')
      .get(id);
    if (!row) block('RELEASE_NOT_FOUND', 'No candidate with this ID');
    const text = String(row.manifest);
    if (hash(text) !== id)
      block('RELEASE_CORRUPT', 'Immutable release manifest hash differs');
    return ManifestSchema.parse(JSON.parse(text));
  }
  latest(manifest: ReleaseManifest, id: string, gate: GateName) {
    const row = this.repository.db
      .prepare(`SELECT id,record FROM release_reviews
      WHERE subject=? AND gate=? AND dependency=? ${gate === 'publish' ? 'AND release_id=?' : ''} ORDER BY id DESC LIMIT 1`)
      .get(
        ...(gate === 'publish'
          ? [manifest.subject, gate, manifest.dependencies[gate], id]
          : [manifest.subject, gate, manifest.dependencies[gate]]),
      );
    return row
      ? {
          id: Number(row.id),
          ...ReviewSchema.parse(JSON.parse(String(row.record))),
        }
      : null;
  }
  review(
    id: string,
    manifest: ReleaseManifest,
    gate: GateName,
    record: Review,
  ) {
    this.repository.db
      .prepare(
        'INSERT INTO release_reviews(release_id,subject,gate,dependency,record) VALUES(?,?,?,?,?)',
      )
      .run(
        id,
        manifest.subject,
        gate,
        manifest.dependencies[gate],
        JSON.stringify(ReviewSchema.parse(record)),
      );
    this.audit(id, `review:${gate}`, record);
  }
  audit(id: string, event: string, record: unknown) {
    this.repository.db
      .prepare(
        'INSERT INTO release_audit(release_id,event,record) VALUES(?,?,?)',
      )
      .run(
        id,
        event,
        JSON.stringify({
          at: new Date(this.repository.now()).toISOString(),
          record,
        }),
      );
  }
  history(id: string) {
    this.get(id);
    return this.repository.db
      .prepare(
        'SELECT id,event,record FROM release_audit WHERE release_id=? ORDER BY id',
      )
      .all(id)
      .map((row) => ({
        id: Number(row.id),
        event: String(row.event),
        ...JSON.parse(String(row.record)),
      }));
  }
}
