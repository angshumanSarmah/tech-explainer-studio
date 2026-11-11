import { libraryRegistry } from '../../domain/visual-library-registry.ts';
import { componentRegistry } from '../../domain/visuals.ts';
import { BrowserRequestFlow } from '../../visuals/BrowserRequestFlow.tsx';
import { CacheAsideProof } from '../../visuals/CacheAsideProof.tsx';
import { LibraryScene } from '../../visuals/LibraryScene.tsx';

export const renderRegistry = Object.freeze({
  ...Object.fromEntries(
    Object.entries(libraryRegistry).map(([id, entry]) => [
      id,
      { ...entry, renderVersion: entry.version, Component: LibraryScene },
    ]),
  ),
  CacheAsideProof: Object.freeze({
    ...componentRegistry.CacheAsideProof,
    renderVersion: '0.1.0',
    Component: CacheAsideProof,
  }),
  BrowserRequestFlow: Object.freeze({
    ...componentRegistry.BrowserRequestFlow,
    renderVersion: '1.0.0',
    Component: BrowserRequestFlow,
  }),
});
