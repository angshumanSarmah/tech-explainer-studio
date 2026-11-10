import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      /^(?:remotion|@remotion\/)/.test(specifier) ||
      specifier.includes('render-cli')
    )
      throw new Error('Validator must not load the renderer');
    return nextResolve(specifier, context);
  },
});
