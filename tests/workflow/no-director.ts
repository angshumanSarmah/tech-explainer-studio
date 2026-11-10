import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/deepseek|director-cli|sources\/fetch|llm\/ollama/.test(specifier))
      throw new Error(
        'Paid/research construction is forbidden in render-only recovery',
      );
    return nextResolve(specifier, context);
  },
});
