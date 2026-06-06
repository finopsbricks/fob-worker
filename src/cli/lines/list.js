import { listLocalStations } from '../../utils/process-files.js';
import { formatTable } from '../../utils/format.js';

/**
 * `fob lines list` — derive lines from local station JSON files.
 * Groups stations by their `line` field and shows count + member short_codes.
 */
export async function listLinesHandler(argv) {
  const { json } = argv || {};
  const stations = listLocalStations();

  if (stations.length === 0) {
    console.log('No local station/process files found.');
    console.log('Run "fob stations pull --all" or "fob processes pull --all" to fetch from orchestrator.');
    return;
  }

  // Group by line; stations without a line field show up under '(unassigned)'
  const groups = new Map();
  for (const s of stations) {
    const key = s.line ?? '(unassigned)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  if (json) {
    const out = {};
    for (const [line, members] of groups) {
      out[line] = members.map(m => ({
        short_code: m.data.short_code,
        id: m.data.id,
        name: m.data.name,
      }));
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const rows = [];
  const sortedLines = [...groups.keys()].sort();
  for (const line of sortedLines) {
    const members = groups.get(line);
    const codes = members
      .map(m => m.data.short_code || m.data.id)
      .sort()
      .join(', ');
    rows.push([line, String(members.length), codes]);
  }

  console.log(formatTable(['LINE', 'STATIONS', 'MEMBERS'], rows));
  console.log('');
  console.log(`Total: ${groups.size} lines, ${stations.length} stations`);
}
