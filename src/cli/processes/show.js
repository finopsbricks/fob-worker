import { getProcess, listWorkRecords, getProcessItems } from '../../utils/orchestrator.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate } from '../../utils/format.js';

export async function showProcessHandler(argv) {
  const { id, workRecords, items, all, json } = argv;

  try {
    const response = await getProcess(id);
    const proc = response.data;

    if (json) {
      console.log(JSON.stringify(proc, null, 2));
      return;
    }

    // Default: formatted summary
    console.log(formatHeader('Process', proc.id));
    const lw = 14;
    console.log(formatField('Name', proc.name, lw));
    if (proc.short_code) console.log(formatField('Short Code', proc.short_code, lw));
    console.log(formatField('Status', proc.is_enabled ? 'enabled' : 'disabled', lw));

    const tags = proc.tags?.map(t => t.name).join(', ');
    if (tags) console.log(formatField('Tags', tags, lw));

    const deps = proc.dependencies?.length > 0 ? proc.dependencies.map(d => d.short_code || d.id).join(', ') : 'none';
    console.log(formatField('Dependencies', deps, lw));

    const appliesTo = proc.applies_to?.length > 0 ? proc.applies_to.join(', ') : '—';
    console.log(formatField('Applies To', appliesTo, lw));

    if (proc.steps?.length > 0) {
      console.log(`\nSteps (${proc.steps.length}):`);
      proc.steps.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.slug}`);
      });
    }

    if (proc.schedule_cron) {
      const tz = proc.schedule_timezone || 'UTC';
      const enabled = proc.schedule_enabled ? 'enabled' : 'disabled';
      console.log(`\nSchedule: ${proc.schedule_cron} (${tz}) — ${enabled}`);
    }

    // --work-records or --all
    if (workRecords || all) {
      const wrResponse = await listWorkRecords({ process: proc.id, limit: 10 });
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
        console.log(`\nUse \`fob work-records list --process ${proc.id}\` for full list.`);
      } else {
        console.log('No work records found.');
      }
    }

    // --items or --all
    if (items || all) {
      const itemsResponse = await getProcessItems(proc.id);
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
      if (proc.short_code) {
        console.log(`Run \`fob stations status ${proc.short_code}\` for live bin state.`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
