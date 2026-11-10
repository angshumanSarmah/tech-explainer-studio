import './no-director.ts';
import '../helpers/no-network.ts';
import { JobRunner } from '../../src/workflow/runner.ts';
import { renderTestScene } from './helpers.ts';

const [data, output, id, mode] = process.argv.slice(2);
if (!data || !output || !id) throw new Error('Missing test-only worker args');
const runner = new JobRunner(data, output, {
  adapterId: 'phase07-test-renderer-v1',
  renderScene: async (script, options) => {
    if (mode === 'kill' && options.frameRange?.[0] !== 0)
      process.kill(process.pid, 'SIGKILL');
    return renderTestScene(script, options);
  },
});
try {
  await runner.resume(id);
  process.stdout.write(JSON.stringify(runner.repo.get(id)));
} finally {
  runner.close();
}
