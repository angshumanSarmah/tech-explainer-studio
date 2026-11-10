import { componentRegistry } from '../../domain/visuals.ts';
import { BrowserRequestFlow } from '../../visuals/BrowserRequestFlow.tsx';

export const renderRegistry = Object.freeze({
  BrowserRequestFlow: Object.freeze({
    ...componentRegistry.BrowserRequestFlow,
    renderVersion: '1.0.0',
    Component: BrowserRequestFlow,
  }),
});
