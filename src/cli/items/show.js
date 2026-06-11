import { getItem, getItemStations, listWorkRecords, getEntityTags } from '../../utils/orchestrator.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate } from '../../utils/format.js';

export async function showItemHandler(argv) {
  const { id, stations, workRecords, all, json } = argv;

  try {
    const response = await getItem(id);
    const item = response.data;

    if (json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    // Default: formatted summary
    console.log(formatHeader('Item', item.id));
    console.log('');
    const lw = 14;
    console.log(formatField('Name', item.name, lw));
    console.log(formatField('Type', item.type, lw));
    console.log(formatField('Status', item.status, lw));
    console.log(formatField('External ID', item.external_id, lw));

    // Tags
    try {
      const tagsResponse = await getEntityTags('items', id);
      const tags = (tagsResponse.data || []).map(t => t.name).join(', ');
      console.log(formatField('Tags', tags || '—', lw));
    } catch {
      console.log(formatField('Tags', '—', lw));
    }

    console.log(formatField('Created', formatDate(item.created_at), lw));

    // Metadata
    if (item.metadata && Object.keys(item.metadata).length > 0) {
      console.log('\nMetadata:');
      for (const [key, value] of Object.entries(item.metadata)) {
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        console.log(`  ${key}: ${display}`);
      }
    }

    // --stations or --all
    if (stations || all) {
      const stationsResponse = await getItemStations(id);
      const stationsList = stationsResponse.data || [];
      console.log(formatSection(`Configured Stations (${stationsList.length})`));
      if (stationsList.length > 0) {
        const rows = stationsList.map(s => [
          s.short_code || '—',
          s.name || '—',
          String(s.execution_count || 0),
          formatDate(s.last_executed_at),
        ]);
        console.log(formatTable(['SHORT CODE', 'NAME', 'RUNS', 'LAST RUN'], rows));
        console.log(`\nUse \`fob stations run <station-id> --item ${id}\` to trigger a run.`);
      } else {
        console.log('No configured stations.');
      }
    }

    // --work-records or --all
    if (workRecords || all) {
      const wrResponse = await listWorkRecords({ item: id, limit: 10 });
      const records = wrResponse.data || [];
      console.log(formatSection(`Execution History (${records.length})`));
      if (records.length > 0) {
        const rows = records.map(r => [
          r.id,
          r.process || '—',
          r.status || '—',
          formatDate(r.started_at),
          formatDate(r.completed_at),
        ]);
        console.log(formatTable(['ID', 'STATION', 'STATUS', 'STARTED', 'COMPLETED'], rows));
        console.log(`\nUse \`fob work-records list --item ${id}\` for full list.`);
      } else {
        console.log('No work records found.');
      }
    }

    // Hint when no section flags used
    if (!stations && !workRecords && !all) {
      console.log('\nUse --stations, --work-records, or --all for linked entities.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
