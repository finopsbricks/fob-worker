import { formatHeader } from '../../utils/format.js';
import { loadLineState, LIVE_BINS } from '../../utils/line-state.js';

/**
 * `fob stations status <code>` — single-station operational drilldown: per-bin
 * workpiece ids read from temp/stations/.
 *
 * Resolves the argument directly against on-disk station short_codes — no
 * orchestrator call. Pass the station short_code (e.g. VM3).
 */
export async function statusStationHandler(argv) {
  const { id, json } = argv;
  if (!id) {
    console.error('Usage: fob stations status <short_code>');
    process.exit(1);
  }

  const lines = loadLineState();
  let stationLine = null;
  for (const ls of Object.values(lines)) {
    if (ls.stations.includes(id)) { stationLine = ls; break; }
  }
  if (!stationLine) {
    console.error(`No station "${id}" on disk under temp/stations/.`);
    console.error('Pass the station short_code (e.g. VM3). Run `fob lines status` to see active lines.');
    process.exit(1);
  }

  const bins = stationLine.bins[id];

  if (json) {
    const out = { station: id, line: stationLine.code, terminal: id === stationLine.terminal, bins: {} };
    for (const bin of [...LIVE_BINS, 'done']) {
      const ids = bins[bin];
      out.bins[bin] = ids ? [...ids].sort() : null;
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(formatHeader('Station', id));
  console.log(`Line:     ${stationLine.code}${id === stationLine.terminal ? '  (terminal)' : ''}`);
  console.log('');

  for (const bin of [...LIVE_BINS, 'done']) {
    const ids = bins[bin];
    const label = bin === 'done' ? '(done)' : bin;
    if (ids === null) {
      console.log(`${label.padEnd(8)} —`);
      continue;
    }
    const sorted = [...ids].sort();
    console.log(`${label.padEnd(8)} (${sorted.length})`);
    for (const wpId of sorted) console.log(`         ${wpId}`);
    if (sorted.length === 0) console.log('         —');
    console.log('');
  }
}
