import { execFileSync } from 'child_process';
import path from 'path';

import { listRunningWorkers, getWorkerPackageInfo, isPm2Available } from '../../utils/worker-processes.js';

export async function startWorkerHandler(argv) {
  const { target } = argv || {};
  const dir = path.resolve(target || process.cwd());

  const info = getWorkerPackageInfo(dir);
  if (!info) {
    console.error(`"${dir}" doesn't look like a fob worker repo (missing @fob/lib-worker dependency or package.json "main" field).`);
    process.exit(1);
  }

  const name = path.basename(dir);

  const existing = listRunningWorkers().find((r) => r.cwd === dir);
  if (existing) {
    console.error(`Worker "${name}" is already running (pid ${existing.pid}, mode ${existing.mode}).`);
    console.error('Use "fob-worker procs stop" first, or "fob-worker procs restart".');
    process.exit(1);
  }

  if (!isPm2Available()) {
    console.error('pm2 not found — install with `npm i -g pm2`');
    process.exit(1);
  }

  execFileSync('pm2', ['start', info.main, '--name', name], { cwd: dir, stdio: 'inherit' });
}
