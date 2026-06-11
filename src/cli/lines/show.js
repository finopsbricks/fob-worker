import { listLocalStations } from '../../utils/station-files.js';
import { topoSortStations } from '../../utils/line-state.js';
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

  // Topological sort by dependencies (shared with lines list / lines status).
  // Sort before the json branch so --json and the table show the same order.
  const ordered = topoSortStations(members);

  if (json) {
    console.log(JSON.stringify(ordered.map(m => m.data), null, 2));
    return;
  }

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
