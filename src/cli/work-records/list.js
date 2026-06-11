import { listWorkRecords } from '../../utils/orchestrator.js';

export async function listWorkRecordsHandler(argv) {
  const { limit, status, station: stationId, tag, json } = argv;

  const filters = [];
  if (limit) filters.push(`limit=${limit}`);
  if (status) filters.push(`status=${status}`);
  if (stationId) filters.push(`station=${stationId}`);
  if (tag) filters.push(`tag=${tag}`);
  if (filters.length > 0) {
    console.log(`Filters: ${filters.join(', ')}`);
  }
  console.log('');

  try {
    const response = await listWorkRecords({ limit, status, station: stationId, tag });
    const records = response.data || [];

    if (records.length === 0) {
      console.log('No work records found');
      return;
    }

    if (json) {
      console.log(JSON.stringify(records, null, 2));
      return;
    }

    // Calculate column widths
    const idWidth = Math.max(2, ...records.map(r => r.id.length));
    const statusWidth = Math.max(6, ...records.map(r => (r.status || '').length));

    // Format date helper
    const formatDate = (iso) => {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toISOString().replace('T', ' ').slice(0, 19);
    };

    // Header
    const header = `${'ID'.padEnd(idWidth)}  ${'STATUS'.padEnd(statusWidth)}  CREATED`;
    console.log(header);
    console.log('-'.repeat(header.length + 10));

    // Rows
    for (const record of records) {
      const id = record.id.padEnd(idWidth);
      const recStatus = (record.status || '-').padEnd(statusWidth);
      const created = formatDate(record.created_at);
      console.log(`${id}  ${recStatus}  ${created}`);
    }

    console.log('');
    console.log(`Total: ${records.length} records`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
