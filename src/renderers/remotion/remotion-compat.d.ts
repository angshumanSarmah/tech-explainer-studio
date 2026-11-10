// Remotion 4.0.542's declarations expose Bun's global Timer name. The actual
// timeout handle in this Node/browser project is the standard setTimeout return.
// Keep dependency declaration checking enabled; remove when upstream fixes it.
export {};

declare global {
  type Timer = ReturnType<typeof globalThis.setTimeout>;
}
