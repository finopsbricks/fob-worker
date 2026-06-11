import { listStations } from '../../utils/orchestrator.js';

export async function listStationsHandler(argv) {
  const { tag, json } = argv || {};

  if (tag) {
    console.log(`Filter: tag=${tag}`);
    console.log('');
  }

  try {
    const response = await listStations({ tag });
    const stations = response.data || [];

    if (stations.length === 0) {
      console.log('No stations found');
      return;
    }

    if (json) {
      console.log(JSON.stringify(stations, null, 2));
      return;
    }

    // Calculate column widths
    const codeWidth = Math.max(4, ...stations.map(s => (s.short_code || '').length));
    const idWidth = Math.max(4, ...stations.map(s => s.id.length));
    const nameWidth = Math.max(4, ...stations.map(s => (s.name || '').length));

    // Header
    const header = `${'CODE'.padEnd(codeWidth)}  ${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  STEPS`;
    console.log(header);
    console.log('-'.repeat(header.length));

    // Rows
    for (const station of stations) {
      const code = (station.short_code || '-').padEnd(codeWidth);
      const id = station.id.padEnd(idWidth);
      const name = (station.name || '-').padEnd(nameWidth);
      const steps = station.steps ? station.steps.length : 0;
      console.log(`${code}  ${id}  ${name}  ${steps}`);
    }

    console.log('');
    console.log(`Total: ${stations.length} stations`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
