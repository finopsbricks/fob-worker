import { listLocalStations } from '../../utils/process-files.js';
import { formatHeader, formatField, formatTable, formatSection } from '../../utils/format.js';

/**
 * `fob lines show <line>` — definitional view of a line: stations in dependency
 * order, plus conveyor topology. Derived from local station JSON files.
 *
 * For the operational view (live bin counts), use `fob lines status <line>`.
 */
export async function showLineHandler(argv) {
  const { line: lineArg, json } = argv;
  const stations = listLocalStations();

  const members = stations.filter(s => s.line === lineArg);
  if (members.length === 0) {
    console.error(`Line not found locally: ${lineArg}`);
    console.error('Run "fob lines list" to see available lines.');
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(members.map(m => m.data), null, 2));
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

  console.log('');
  console.log(`Run \`fob lines status ${lineArg}\` for live bin counts.`);
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
