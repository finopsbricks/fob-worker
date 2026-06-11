import { getStation, listWorkRecords, getStationItems } from '../../utils/orchestrator.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate } from '../../utils/format.js';

export async function showStationHandler(argv) {
  const { id, workRecords, items, all, json } = argv;

  try {
    const response = await getStation(id);
    const station = response.data;

    if (json) {
      console.log(JSON.stringify(station, null, 2));
      return;
    }

    // Default: formatted summary
    console.log(formatHeader('Station', station.id));
    const lw = 14;
    console.log(formatField('Name', station.name, lw));
    if (station.short_code) console.log(formatField('Short Code', station.short_code, lw));
    console.log(formatField('Status', station.is_enabled ? 'enabled' : 'disabled', lw));

    const tags = station.tags?.map(t => t.name).join(', ');
    if (tags) console.log(formatField('Tags', tags, lw));

    const deps = station.dependencies?.length > 0 ? station.dependencies.map(d => d.short_code || d.id).join(', ') : 'none';
    console.log(formatField('Dependencies', deps, lw));

    const appliesTo = station.applies_to?.length > 0 ? station.applies_to.join(', ') : '—';
    console.log(formatField('Applies To', appliesTo, lw));

    if (station.steps?.length > 0) {
      console.log(`\nSteps (${station.steps.length}):`);
      station.steps.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.slug}`);
      });
    }

    if (station.schedule_cron) {
      const tz = station.schedule_timezone || 'UTC';
      const enabled = station.schedule_enabled ? 'enabled' : 'disabled';
      console.log(`\nSchedule: ${station.schedule_cron} (${tz}) — ${enabled}`);
    }

    // --work-records or --all
    if (workRecords || all) {
      const wrResponse = await listWorkRecords({ station: station.id, limit: 10 });
      const records = wrResponse.data || [];
      console.log(formatSection(`Recent Work Records (${records.length})`));
      if (records.length > 0) {
        const rows = records.map(r => [
          r.id,
          r.status || '—',
          r.item || '—',
          formatDate(r.created_at),
        ]);
        console.log(formatTable(['ID', 'STATUS', 'ITEM', 'CREATED'], rows));
        console.log(`\nUse \`fob work-records list --station ${station.id}\` for full list.`);
      } else {
        console.log('No work records found.');
      }
    }

    // --items or --all
    if (items || all) {
      const itemsResponse = await getStationItems(station.id);
      const itemsList = itemsResponse.data || [];
      console.log(formatSection(`Items (${itemsList.length})`));
      if (itemsList.length > 0) {
        const rows = itemsList.map(item => [
          item.id,
          item.type || '—',
          item.name || '—',
          String(item.execution_count || 0),
          formatDate(item.last_executed_at),
        ]);
        console.log(formatTable(['ID', 'TYPE', 'NAME', 'RUNS', 'LAST RUN'], rows));
      } else {
        console.log('No items found.');
      }
    }

    // Hint when no section flags used
    if (!workRecords && !items && !all) {
      console.log('\nUse --work-records, --items, or --all for linked entities.');
      if (station.short_code) {
        console.log(`Run \`fob stations status ${station.short_code}\` for live bin state.`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
