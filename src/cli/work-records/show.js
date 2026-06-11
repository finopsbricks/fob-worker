import { getWorkRecord, getWorkRecordActivity, getEntityTags } from '../../utils/orchestrator.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate, formatDuration } from '../../utils/format.js';

export async function showWorkRecordHandler(argv) {
  const { id, report, steps, supportingDocs, activity, all, json } = argv;

  try {
    // Build includes list for a single API call
    const include = [];
    if (report || all) include.push('report');
    if (steps || all) include.push('step_outputs');
    if (supportingDocs || all) include.push('supporting_docs');

    const response = await getWorkRecord(id, { include: include.length > 0 ? include : undefined });
    const record = response.data;

    if (json) {
      // For --json --all, also fetch activity
      if (activity || all) {
        try {
          const actResponse = await getWorkRecordActivity(id);
          record.activity = actResponse.data || [];
        } catch { /* skip */ }
      }
      console.log(JSON.stringify(record, null, 2));
      return;
    }

    // Default: formatted summary
    console.log(formatHeader('Work Record', record.id, record.status));
    console.log('');
    const lw = 14;
    console.log(formatField('Station', record.process || '—', lw));
    console.log(formatField('Item', record.item || '—', lw));
    console.log(formatField('Status', record.status, lw));
    console.log(formatField('Duration', formatDuration(record.started_at, record.completed_at), lw));
    console.log(formatField('Created', formatDate(record.created_at), lw));
    if (record.started_at) console.log(formatField('Started', formatDate(record.started_at), lw));
    if (record.completed_at) console.log(formatField('Completed', formatDate(record.completed_at), lw));

    // Tags
    try {
      const tagsResponse = await getEntityTags('work-records', id);
      const tags = (tagsResponse.data || []).map(t => t.name).join(', ');
      console.log(formatField('Tags', tags || '—', lw));
    } catch {
      console.log(formatField('Tags', '—', lw));
    }

    // --report or --all
    if (report || all) {
      console.log(formatSection('Report'));
      if (record.report) {
        console.log(record.report);
      } else {
        console.log('No report available.');
      }
    }

    // --steps or --all
    if (steps || all) {
      console.log(formatSection('Step Outputs'));
      const outputs = record.step_outputs || {};
      const slugs = Object.keys(outputs);
      if (slugs.length > 0) {
        for (const slug of slugs) {
          console.log(`\n[${slug}]`);
          const output = outputs[slug];
          if (typeof output === 'object') {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(String(output));
          }
        }
      } else {
        console.log('No step outputs.');
      }
    }

    // --supporting-docs or --all
    if (supportingDocs || all) {
      const docs = record.supporting_docs || [];
      console.log(formatSection(`Supporting Documents (${docs.length})`));
      if (docs.length > 0) {
        const rows = docs.map(d => [
          d.id,
          d.type || '—',
          d.title || '—',
          d.step_slug || '—',
          formatDate(d.created_at),
        ]);
        console.log(formatTable(['ID', 'TYPE', 'TITLE', 'STEP', 'CREATED'], rows));
        console.log(`\nUse \`fob supporting-docs show <id>\` to view content.`);
      } else {
        console.log('No supporting documents.');
      }
    }

    // --activity or --all
    if (activity || all) {
      try {
        const actResponse = await getWorkRecordActivity(id);
        const events = actResponse.data || [];
        console.log(formatSection(`Activity (${events.length})`));
        if (events.length > 0) {
          const rows = events.map(e => [
            formatDate(e.created_at),
            e.event || '—',
            e.action_type || '—',
            e.user || '—',
          ]);
          console.log(formatTable(['TIME', 'EVENT', 'ACTION', 'USER'], rows));
        } else {
          console.log('No activity events.');
        }
      } catch {
        console.log(formatSection('Activity'));
        console.log('Could not load activity.');
      }
    }

    // Hint when no section flags used
    if (!report && !steps && !supportingDocs && !activity && !all) {
      console.log('\nUse --report, --steps, --supporting-docs, --activity, or --all for details.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
