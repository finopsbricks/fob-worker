import { execFileSync } from 'child_process';

import { resolveRunningWorker } from '../../utils/worker-processes.js';

/**
 * Resolve `argv.target` to a pm2-managed running worker, or exit with a clear error.
 * @param {{target?: string}} argv
 * @returns {ReturnType<typeof resolveRunningWorker>}
 */
export function requirePm2Target(argv) {
  const { target } = argv || {};
  const key = target || 'the worker in the current directory';
  const match = resolveRunningWorker(target);

  if (!match) {
    console.error(`No running worker matches ${target ? `"${target}"` : key}. Run "fob-worker procs list" to see running workers.`);
    process.exit(1);
  }

  if (match.mode !== 'pm2') {
    console.error(`Worker "${match.worker}" (pid ${match.pid}) is running directly, not under pm2 — can't manage it this way.`);
    console.error(`Kill it manually: kill ${match.pid}  (see "fob-worker procs list" for details)`);
    process.exit(1);
  }

  return match;
}

export async function stopWorkerHandler(argv) {
  const match = requirePm2Target(argv);
  execFileSync('pm2', ['stop', match.pm2], { stdio: 'inherit' });
}
