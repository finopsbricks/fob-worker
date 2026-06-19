import { listStations } from '../../utils/orchestrator.js';

export async function listStationsHandler(argv) {
  const { tag, line, json, includeArchived } = argv || {};

  const filters = [];
  if (tag) filters.push(`tag=${tag}`);
  if (line) filters.push(`line=${line}`);
  if (filters.length > 0) {
    console.log(`Filter: ${filters.join(', ')}`);
    console.log('');
  }

  try {
    const response = await listStations({ tag, includeArchived });
    let stations = response.data || [];
    if (line) stations = stations.filter(s => s.line === line);

    if (stations.length === 0) {
      console.log('No stations found');
      return;
    }

    if (json) {
      console.log(JSON.stringify(stations, null, 2));
      return;
    }

    const showArchivedColumn = includeArchived && stations.some(s => s.archived_at);

    // Calculate column widths
    const codeWidth = Math.max(4, ...stations.map(s => (s.short_code || '').length));
    const idWidth = Math.max(4, ...stations.map(s => s.id.length));
    const nameWidth = Math.max(4, ...stations.map(s => (s.name || '').length));

    // Header
    let header = `${'CODE'.padEnd(codeWidth)}  ${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  STEPS`;
    if (showArchivedColumn) header += '  ARCHIVED';
    console.log(header);
    console.log('-'.repeat(header.length));

    // Rows
    for (const station of stations) {
      const code = (station.short_code || '-').padEnd(codeWidth);
      const id = station.id.padEnd(idWidth);
      const name = (station.name || '-').padEnd(nameWidth);
      const steps = station.steps ? station.steps.length : 0;
      let row = `${code}  ${id}  ${name}  ${steps}`;
      if (showArchivedColumn) row += `  ${station.archived_at ? 'yes' : '-'}`;
      console.log(row);
    }

    console.log('');
    console.log(`Total: ${stations.length} stations${includeArchived ? ' (including archived)' : ''}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
