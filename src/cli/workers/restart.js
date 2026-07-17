import { execFileSync } from 'child_process';

import { requirePm2Target } from './stop.js';

export async function restartWorkerHandler(argv) {
  const match = requirePm2Target(argv);
  execFileSync('pm2', ['restart', match.pm2], { stdio: 'inherit' });
}
