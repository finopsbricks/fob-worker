import { existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { select, input, confirm } from '@inquirer/prompts';
import {
  getStation,
  listWorkRecords,
  deleteStation,
  archiveStation,
} from '../../utils/orchestrator.js';
import { findStationFile } from '../../utils/station-files.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate } from '../../utils/format.js';

const PREVIEW_RECORDS = 3;
const WORK_RECORDS_PROBE_LIMIT = 1000;

/**
 * Find the local src/steps folder for a station, if any. Looks for either
 * a folder named exactly `{short_code}__{name}` or one starting with `{short_code}__`.
 */
function findLocalStepsFolder(station) {
  const candidates = [];
  if (station.short_code) candidates.push(`${station.short_code}__`);
  const stepsDir = join(process.cwd(), 'src', 'steps');
  if (!existsSync(stepsDir)) return null;

  for (const prefix of candidates) {
    try {
      const matches = readdirSync(stepsDir).filter((name) => name.startsWith(prefix));
      if (matches.length > 0) return matches.map((m) => `src/steps/${m}`);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * After a successful remote delete, remove the corresponding local
 * `.orchestrator/stations/{prefix}__*.json` files (by id and by short_code,
 * since either prefix form may be on disk). Best-effort; logs what it removed.
 */
function removeLocalStationFiles(station) {
  const removed = [];
  for (const identifier of [station.id, station.short_code].filter(Boolean)) {
    const localPath = findStationFile(identifier);
    if (localPath && !removed.includes(localPath)) {
      try {
        unlinkSync(localPath);
        removed.push(localPath);
      } catch (e) {
        console.error(`Warning: failed to remove ${localPath}: ${e.message}`);
      }
    }
  }
  if (removed.length > 0) {
    console.log(`Removed local file(s): ${removed.join(', ')}`);
  }
}

function printPreview(station, recentRecords, workRecordCount, localFolders) {
  console.log(formatHeader('Station', station.id));
  const lw = 18;
  console.log(formatField('Name', station.name, lw));
  if (station.short_code) console.log(formatField('Short Code', station.short_code, lw));
  if (station.line) console.log(formatField('Line', station.line, lw));
  console.log(formatField('Location', station.location, lw));
  console.log(formatField('Enabled', station.is_enabled ? 'yes' : 'no', lw));

  console.log(formatSection('Execution stats'));
  const countDisplay = workRecordCount >= WORK_RECORDS_PROBE_LIMIT
    ? `${workRecordCount}+ (probe limit hit)`
    : String(workRecordCount);
  console.log(formatField('Work records', countDisplay, lw));
  const lastRunAt = recentRecords[0]?.created_at;
  console.log(formatField('Last run at', formatDate(lastRunAt), lw));
  if (recentRecords.length > 0) {
    const rows = recentRecords.slice(0, PREVIEW_RECORDS).map((r) => [
      r.id,
      r.status || '—',
      formatDate(r.created_at),
    ]);
    console.log('\nRecent work records:');
    console.log(formatTable(['ID', 'STATUS', 'CREATED'], rows));
  }

  if (station.schedule_cron) {
    console.log(formatSection('Schedule'));
    console.log(formatField('Cron', station.schedule_cron, lw));
    console.log(formatField('Timezone', station.schedule_timezone || 'UTC', lw));
    console.log(formatField('Enabled', station.schedule_enabled ? 'yes' : 'no', lw));
    if (station.next_run_at) console.log(formatField('Next run at', formatDate(station.next_run_at), lw));
  }

  console.log(formatSection('Local code'));
  if (localFolders && localFolders.length > 0) {
    console.log(`Found ${localFolders.length} local folder(s) — these will be orphaned:`);
    for (const folder of localFolders) console.log(`  ${folder}`);
  } else {
    console.log('No matching folder under ./src/steps/');
  }
}

/**
 * Confirm a destructive cascade-delete by requiring the user to type the short_code.
 * Returns true if confirmed, false on cancel.
 */
async function confirmTypeShortCode(station, workRecordCount) {
  const guard = station.short_code || station.id;
  console.log(`\n⚠️  CASCADE DELETE — this will permanently destroy:`);
  console.log(`    - the station '${station.name}'`);
  console.log(`    - ${workRecordCount} work record(s) and all their supporting documents`);
  console.log(`    - any step queue rows and entity tags`);
  console.log(`This action is irreversible.`);
  const typed = await input({
    message: `Type "${guard}" to confirm:`,
  });
  return typed.trim() === guard;
}

async function runInteractive(station, recentRecords, workRecordCount) {
  if (workRecordCount === 0) {
    const ok = await confirm({
      message: `Delete this station? (no work records to cascade)`,
      default: false,
    });
    if (!ok) {
      console.log('Cancelled.');
      return;
    }
    await deleteStation(station.id);
    console.log(`Deleted station ${station.short_code || station.id}.`);
    removeLocalStationFiles(station);
    return;
  }

  const choice = await select({
    message: `This station has ${workRecordCount} work record(s). What do you want to do?`,
    choices: [
      {
        name: 'Archive (preserve history)',
        value: 'archive',
        description: 'Marks the station archived — hidden from default list, blocked from execution. Work records remain queryable.',
      },
      {
        name: 'Cascade delete (destructive)',
        value: 'cascade',
        description: 'Permanently delete the station AND every linked work record. Irreversible.',
      },
      {
        name: 'Cancel',
        value: 'cancel',
        description: 'Take no action.',
      },
    ],
  });

  if (choice === 'cancel') {
    console.log('Cancelled.');
    return;
  }

  if (choice === 'archive') {
    await archiveStation(station.id);
    console.log(`Archived station ${station.short_code || station.id}.`);
    return;
  }

  if (choice === 'cascade') {
    const confirmed = await confirmTypeShortCode(station, workRecordCount);
    if (!confirmed) {
      console.log('Cancelled — text did not match.');
      return;
    }
    await deleteStation(station.id, { cascade: true });
    console.log(`Deleted station ${station.short_code || station.id} and ${workRecordCount} work record(s).`);
    removeLocalStationFiles(station);
  }
}

export async function deleteStationHandler(argv) {
  const { id, yes, forceDelete, archive } = argv;

  try {
    const stationResponse = await getStation(id);
    const station = stationResponse.data;

    const wrResponse = await listWorkRecords({ station: station.id, limit: WORK_RECORDS_PROBE_LIMIT });
    const recentRecords = wrResponse.data || [];
    const workRecordCount = recentRecords.length;

    const localFolders = findLocalStepsFolder(station);

    printPreview(station, recentRecords, workRecordCount, localFolders);
    console.log('');

    // Flag-driven non-interactive paths
    if (archive) {
      await archiveStation(station.id);
      console.log(`Archived station ${station.short_code || station.id}.`);
      return;
    }

    if (forceDelete) {
      const cascade = workRecordCount > 0;
      if (cascade && !yes) {
        const confirmed = await confirmTypeShortCode(station, workRecordCount);
        if (!confirmed) {
          console.log('Cancelled — text did not match.');
          return;
        }
      }
      await deleteStation(station.id, { cascade });
      console.log(`Deleted station ${station.short_code || station.id}${cascade ? ` and ${workRecordCount} work record(s)` : ''}.`);
      removeLocalStationFiles(station);
      return;
    }

    await runInteractive(station, recentRecords, workRecordCount);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log('Cancelled.');
      return;
    }
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
