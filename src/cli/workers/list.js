import { listRunningWorkers } from '../../utils/worker-processes.js';
import { formatTable } from '../../utils/format.js';

export async function listWorkersHandler(argv) {
  const { json } = argv || {};
  const rows = listRunningWorkers();

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log('No running fob workers found.');
    return;
  }

  const headers = ['PID', 'WORKER', 'MODE', 'PM2', 'PORT', 'UPTIME', 'STARTED'];
  const table = rows.map((r) => [r.pid, r.worker, r.mode, r.pm2, r.port, r.uptime, r.started]);
  console.log(formatTable(headers, table));
}
