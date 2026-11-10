import { componentRegistry } from '../../domain/visuals.ts';
import { BrowserRequestFlow } from '../../visuals/BrowserRequestFlow.tsx';
import { CacheAsideProof } from '../../visuals/CacheAsideProof.tsx';

export const renderRegistry = Object.freeze({
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
