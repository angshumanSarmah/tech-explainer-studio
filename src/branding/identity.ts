import { createHash } from 'node:crypto';
import { resolveBrand } from './profile.ts';
export function brandIdentity(selection?: unknown) {
  const profile = resolveBrand(selection);
  return {
    id: profile.id,
    version: profile.version,
    sha256: createHash('sha256').update(JSON.stringify(profile)).digest('hex'),
  };
}
