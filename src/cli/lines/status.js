import { formatTable, formatHeader, formatField, formatSection } from '../../utils/format.js';
import { loadLineState, summarizeLine, LIVE_BINS } from '../../utils/line-state.js';

/**
 * `fob lines status [code]` — operational snapshot of live bin state.
 *
 * With no argument: per-line summary across every line found under
 * temp/stations/, with IN-FLIGHT / STUCK / FINISHED / HEALTH columns.
 *
 * With a code: station × live-bin table for that one line; the `done`
 * bin is shown in parens and excluded from live totals (it's a receipt
 * of a successful forward move, not a current position).
 */
export async function statusLineHandler(argv) {
  const { line: lineArg, json } = argv || {};
  const lines = loadLineState();

  if (Object.keys(lines).length === 0) {
    if (json) console.log(JSON.stringify({}, null, 2));
    else console.log('No lines found under temp/stations/.');
    return;
  }

  if (!lineArg) {
    renderLineSummary(lines, json);
    return;
  }

  const ls = lines[lineArg];
  if (!ls) {
    console.error(`Line "${lineArg}" not found. Available: ${Object.keys(lines).sort().join(', ')}`);
    process.exit(1);
  }
  renderLineDrilldown(ls, json);
}

function renderLineSummary(lines, json) {
  const summaries = {};
  for (const ls of Object.values(lines)) summaries[ls.code] = summarizeLine(ls);

  if (json) {
    console.log(JSON.stringify(summaries, null, 2));
    return;
  }

  const rows = [];
  for (const code of Object.keys(summaries).sort()) {
    const s = summaries[code];
    let health;
    if (s.stuck > 0) health = `⚠ ${s.stuck_locations.join(', ')}`;
    else if (s.in_flight === 0 && s.finished === 0) health = 'idle';
    else if (s.in_flight === 0) health = `${s.finished} finished, drained`;
    else health = `flowing, biggest at ${s.biggest_flow.at}`;

    rows.push([code, String(s.in_flight), String(s.stuck), String(s.finished), health]);
  }
  console.log(formatTable(
    ['LINE', 'IN-FLIGHT', 'STUCK', 'FINISHED', 'HEALTH'],
    rows,
  ));
}

function renderLineDrilldown(ls, json) {
  if (json) {
    const out = { code: ls.code, terminal: ls.terminal, stations: {} };
    for (const station of ls.stations) {
      out.stations[station] = {};
      for (const bin of [...LIVE_BINS, 'done']) {
        const ids = ls.bins[station][bin];
        out.stations[station][bin] = ids ? [...ids].sort() : null;
      }
    }
    out.summary = summarizeLine(ls);
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(formatHeader('Line', ls.code));
  console.log(formatField('Stations', ls.stations.join(' → '), 12));
  console.log(formatField('Terminal', ls.terminal, 12));
  console.log('');

  const cell = (ids) => (ids === null ? '—' : String(ids.size));
  const rows = ls.stations.map((station) => {
    const b = ls.bins[station];
    return [
      station,
      cell(b.input),
      cell(b.doing),
      cell(b.output),
      cell(b.failed),
      b.done === null ? '—' : `(${b.done.size})`,
    ];
  });

  const totals = { input: 0, doing: 0, output: 0, failed: 0 };
  for (const station of ls.stations) {
    for (const bin of LIVE_BINS) {
      const ids = ls.bins[station][bin];
      if (ids) totals[bin] += ids.size;
    }
  }
  rows.push([
    'live',
    String(totals.input),
    String(totals.doing),
    String(totals.output),
    String(totals.failed),
    '',
  ]);

  console.log(formatTable(
    ['STATION', 'INPUT', 'DOING', 'OUTPUT', 'FAILED', '(DONE)'],
    rows,
  ));
  console.log('');
  console.log('`(done)` shown in parens for audit; excluded from live totals.');
  console.log('Run `fob workpieces list --line ' + ls.code + '` for per-workpiece positions.');
}
