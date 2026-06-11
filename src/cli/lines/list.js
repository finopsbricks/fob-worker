import { listLocalStations } from '../../utils/station-files.js';
import { topoSortStations, codeOf } from '../../utils/line-state.js';
import { formatTable } from '../../utils/format.js';

/**
 * `fob lines list` — derive lines from local station JSON files.
 *
 * Definitional view: groups stations by their `line` field and shows count
 * + member short_codes. For operational/live state, use `fob lines status`.
 */
export async function listLinesHandler(argv) {
  const { json } = argv || {};
  const stations = listLocalStations();

  if (stations.length === 0) {
    console.log('No local station files found.');
    console.log('Run "fob stations pull --all" to fetch from orchestrator.');
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
      const ordered = topoSortStations(members);
      out[line] = ordered.map(m => ({
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
    const codes = topoSortStations(members).map(codeOf).join(', ');
    rows.push([line, String(members.length), codes]);
  }

  console.log(formatTable(['LINE', 'STATIONS', 'MEMBERS'], rows));
  console.log('');
  console.log(`Total: ${groups.size} lines, ${stations.length} stations`);
  console.log('Run `fob lines status` for live bin counts.');
}
