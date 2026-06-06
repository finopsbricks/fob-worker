import { listLocalStations } from '../../utils/process-files.js';
import { formatTable } from '../../utils/format.js';
import { loadLineState, summarizeLine } from '../../utils/line-state.js';

/**
 * `fob lines list` — derive lines from local station JSON files.
 * Groups stations by their `line` field and shows count + member short_codes.
 *
 * --state augments each row with live counts read from temp/stations/:
 *   IN-FLIGHT  STUCK  FINISHED  HEALTH
 */
export async function listLinesHandler(argv) {
  const { json, state } = argv || {};
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

  // Live state — only loaded when --state is passed; lines without a temp/stations/
  // entry render with '—' state cells.
  const lineState = state ? loadLineState() : null;

  if (json) {
    const out = {};
    for (const [line, members] of groups) {
      const base = {
        members: members.map(m => ({
          short_code: m.data.short_code,
          id: m.data.id,
          name: m.data.name,
        })),
      };
      if (state) {
        const ls = lineState?.[line];
        base.state = ls ? summarizeLine(ls) : null;
      }
      out[line] = base;
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const headers = state
    ? ['LINE', 'STATIONS', 'MEMBERS', 'IN-FLIGHT', 'STUCK', 'FINISHED', 'HEALTH']
    : ['LINE', 'STATIONS', 'MEMBERS'];

  const rows = [];
  const sortedLines = [...groups.keys()].sort();
  for (const line of sortedLines) {
    const members = groups.get(line);
    const codes = members
      .map(m => m.data.short_code || m.data.id)
      .sort()
      .join(', ');
    const base = [line, String(members.length), codes];
    if (state) {
      const ls = lineState[line];
      if (!ls) {
        base.push('—', '—', '—', 'no temp/stations/ entries');
      } else {
        const s = summarizeLine(ls);
        let health;
        if (s.stuck > 0) health = `⚠ ${s.stuck_locations.join(', ')}`;
        else if (s.in_flight === 0 && s.finished === 0) health = 'idle';
        else if (s.in_flight === 0) health = `${s.finished} finished, drained`;
        else health = `flowing, biggest at ${s.biggest_flow.at}`;
        base.push(String(s.in_flight), String(s.stuck), String(s.finished), health);
      }
    }
    rows.push(base);
  }

  console.log(formatTable(headers, rows));
  console.log('');
  console.log(`Total: ${groups.size} lines, ${stations.length} stations`);
}
