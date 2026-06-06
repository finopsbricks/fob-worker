import { listLocalStations } from '../../utils/process-files.js';
import { formatHeader, formatField, formatTable, formatSection } from '../../utils/format.js';
import { loadLineState, LIVE_BINS } from '../../utils/line-state.js';

/**
 * `fob lines show <line>` — show all stations on a line, derived from local JSON files.
 * Order stations using the dependency graph (topological sort over the line's members).
 *
 * --state appends a station × live-bin table read from temp/stations/. The `done`
 * bin is shown in parens for audit and excluded from the live totals.
 */
export async function showLineHandler(argv) {
  const { line: lineArg, json, state } = argv;
  const stations = listLocalStations();

  const members = stations.filter(s => s.line === lineArg);
  if (members.length === 0) {
    console.error(`Line not found locally: ${lineArg}`);
    console.error('Run "fob lines list" to see available lines.');
    process.exit(1);
  }

  if (json) {
    const payload = { stations: members.map(m => m.data) };
    if (state) {
      const lineState = loadLineState();
      payload.state = lineState[lineArg] ?? null;
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // Topological sort by dependencies (within the line); fall back to alpha by short_code.
  const ordered = topoSort(members);

  console.log(formatHeader('Line', lineArg));
  console.log(formatField('Stations', String(members.length), 12));
  console.log('');

  const rows = ordered.map(m => {
    const code = m.data.short_code || m.data.id;
    const name = m.data.name || '—';
    const stepCount = Array.isArray(m.data.steps) ? m.data.steps.length : 0;
    const deps = (m.data.dependencies || [])
      .map(d => (typeof d === 'string' ? d : d.short_code || d.id))
      .join(', ') || '—';
    const enabled = m.data.is_enabled === false ? 'no' : 'yes';
    return [code, name, String(stepCount), deps, enabled];
  });

  console.log(formatTable(['STATION', 'NAME', 'STEPS', 'DEPENDS ON', 'ENABLED'], rows));

  // Surface conveyor topology hint (move_files steps tell us source→target bin flow)
  const conveyors = [];
  for (const m of ordered) {
    for (const step of m.data.steps || []) {
      if (step.slug === 'lib-worker:move_files' && step.config) {
        conveyors.push({
          station: m.data.short_code || m.data.id,
          from: step.config.source_bin,
          to: step.config.target_bin,
          mode: step.config.mode,
        });
      }
    }
  }
  if (conveyors.length > 0) {
    console.log(formatSection('Conveyors'));
    console.log(formatTable(
      ['AT STATION', 'FROM BIN', 'TO BIN', 'MODE'],
      conveyors.map(c => [c.station, c.from || '—', c.to || '—', c.mode || '—']),
    ));
  }

  // --state — live bin counts from temp/stations/{station}/{bin}/
  if (state) {
    const lineState = loadLineState();
    const ls = lineState[lineArg];
    console.log(formatSection('Live state'));
    if (!ls) {
      console.log('(no temp/stations/ entries for this line)');
      return;
    }

    const cell = (ids) => (ids === null ? '—' : String(ids.size));
    const rows = ls.stations.map((stationCode) => {
      const b = ls.bins[stationCode];
      return [
        stationCode,
        cell(b.input),
        cell(b.doing),
        cell(b.output),
        cell(b.failed),
        b.done === null ? '—' : `(${b.done.size})`,
      ];
    });

    // Live total row (excludes done).
    const totals = { input: 0, doing: 0, output: 0, failed: 0 };
    for (const stationCode of ls.stations) {
      for (const bin of LIVE_BINS) {
        const ids = ls.bins[stationCode][bin];
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
  }
}

/**
 * Topological sort over stations within a single line, using the `dependencies` array.
 * Dependency entries can be short_codes (strings) or {short_code, id} objects.
 * Stations whose deps fall outside the line are treated as roots within this view.
 */
function topoSort(members) {
  const codeOf = (s) => s.data.short_code || s.data.id;
  const byCode = new Map(members.map(s => [codeOf(s), s]));

  const depsOf = (s) => {
    const list = s.data.dependencies || [];
    return list
      .map(d => (typeof d === 'string' ? d : d.short_code || d.id))
      .filter(code => byCode.has(code));
  };

  const visited = new Set();
  const result = [];
  const visit = (s) => {
    const code = codeOf(s);
    if (visited.has(code)) return;
    visited.add(code);
    for (const depCode of depsOf(s)) {
      visit(byCode.get(depCode));
    }
    result.push(s);
  };

  // Visit alphabetically so siblings come out predictably
  const sorted = [...members].sort((a, b) => codeOf(a).localeCompare(codeOf(b)));
  for (const s of sorted) visit(s);
  return result;
}
