import { createStation, updateStation, setEntityTags, listStations } from '../../utils/orchestrator.js';
import { resolveTagNames } from '../../utils/tags.js';
import {
  loadStation,
  listLocalStationIds,
  listAllStationFiles,
  loadStationByFilename,
  finalizeNewStationFile,
  findStationFile,
  getStationsDir,
} from '../../utils/station-files.js';

/** @type {Map<string, string>|null} Cached short_code → ID map */
let _shortCodeMap = null;

/**
 * Build short_code → ID map from remote stations (fetched once per push session).
 * Falls back to local files if the API call fails.
 * @returns {Promise<Map<string, string>>}
 */
async function getShortCodeMap() {
  if (_shortCodeMap) return _shortCodeMap;

  _shortCodeMap = new Map();
  try {
    const response = await listStations();
    for (const s of response.data || []) {
      if (s.short_code) _shortCodeMap.set(s.short_code, s.id);
    }
  } catch {
    // Fallback: build from local files
    for (const id of listLocalStationIds()) {
      const station = loadStation(id);
      if (station?.short_code) _shortCodeMap.set(station.short_code, station.id);
    }
  }
  return _shortCodeMap;
}

/**
 * Resolve short_codes in a dependencies array to database IDs.
 * Values that are already IDs (not found as short_codes) pass through unchanged.
 * @param {string[]} dependencies
 * @returns {Promise<string[]>}
 */
async function resolveDependencies(dependencies) {
  if (!dependencies || dependencies.length === 0) return dependencies;

  const map = await getShortCodeMap();
  const resolved = dependencies.map(dep => map.get(dep) || dep);

  const changed = dependencies.filter((dep, i) => dep !== resolved[i]);
  if (changed.length > 0) {
    const mappings = changed.map(dep => `${dep} -> ${map.get(dep)}`);
    console.log(`  Dependencies resolved: ${mappings.join(', ')}`);
  }

  return resolved;
}

/**
 * Sync tags for a station after push.
 * Tags field is optional — missing means don't touch, empty array means clear all.
 */
async function syncTags(stationId, tags) {
  if (tags === undefined) return;

  if (tags.length === 0) {
    // 'processes' is the API URL segment — kept until the orchestrator API renames it.
    await setEntityTags('processes', stationId, []);
    console.log(`  Tags cleared`);
    return;
  }

  const { tagIds, createdNames } = await resolveTagNames(tags);
  await setEntityTags('processes', stationId, tagIds);
  if (createdNames.length > 0) {
    console.log(`  Auto-created tags: ${createdNames.join(', ')}`);
  }
  console.log(`  Tags synced: ${tags.join(', ')}`);
}

/**
 * Push a single station by filename — creates or updates based on JSON content.
 * If the file has an `id`, it's an update (PUT). If not, it's a create (POST).
 * With `force`, a 404 on update falls back to create with the same id.
 * @param {string} filename
 * @param {{ force?: boolean }} [options]
 */
async function pushByFilename(filename, { force = false } = {}) {
  const station = loadStationByFilename(filename);
  if (!station) {
    console.error(`Station file not found: ${filename}`);
    process.exit(1);
  }

  if (station.id) {
    // Existing station — update
    const { id, created_at, org, tags, ...updateData } = station;
    updateData.dependencies = await resolveDependencies(updateData.dependencies);

    try {
      await updateStation(id, updateData);
      console.log(`Updated: ${id}`);
      await syncTags(id, tags);
    } catch (err) {
      const is404 = err.message.includes('(404)');
      if (!is404) throw err;
      if (!force) {
        const label = station.short_code
          ? `station "${station.short_code}" (id: ${id})`
          : `station with id "${id}"`;
        throw new Error(
          `${label} does not exist in the orchestrator. ` +
          `Re-run with --force to create it remotely with this id ` +
          `(use this when promoting a config from one environment to another).`
        );
      }

      // --force: station not visible to this org — try create with same id
      console.log(`  Not visible to this org (${id}), creating with --force...`);
      const createData = { id, ...updateData };
      let response;
      try {
        response = await createStation(createData);
      } catch (createErr) {
        if (createErr.message.includes('(409)')) {
          const label = station.short_code
            ? `station "${station.short_code}"`
            : 'station';
          throw new Error(
            `Cannot create ${label} with id "${id}" — that id is already used by another org in the orchestrator (ids are globally unique across the multi-tenant database). ` +
            `Either change the id in the local file to a different alphanumeric (1-24 chars), or remove the "id" field entirely to let the orchestrator generate a fresh one — the file will be rewritten with the new id after push.`
          );
        }
        throw createErr;
      }
      const created = response.data;
      const newPath = finalizeNewStationFile(filename, created);
      console.log(`Created: ${created.id} -> ${newPath}`);
      await syncTags(created.id, tags);
    }
  } else {
    // New station — create
    const { created_at, org, tags, ...createData } = station;
    createData.dependencies = await resolveDependencies(createData.dependencies);
    const response = await createStation(createData);
    const created = response.data;
    const newPath = finalizeNewStationFile(filename, created);
    console.log(`Created: ${created.id} -> ${newPath}`);
    await syncTags(created.id, tags);
  }
}

export async function pushStationsHandler(argv) {
  const { id, all, force } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob stations push <filename>     (create or update based on content)');
    console.error('       fob stations push <id|short_code> (update by station ID or short_code)');
    console.error('       fob stations push --all');
    console.error('');
    console.error('Run "fob stations list" to see available stations');
    process.exit(1);
  }

  console.log(`Reading from: ${getStationsDir()}/`);

  try {
    if (id) {
      // Single — try as filename first, then resolve by ID/short_code
      const filename = id.endsWith('.json') ? id : `${id}.json`;
      const station = loadStationByFilename(filename);

      if (station) {
        await pushByFilename(filename, { force });
      } else {
        // Try by ID or short_code — resolve to filepath
        const filepath = findStationFile(id);
        if (filepath) {
          await pushByFilename(filepath, { force });
        } else {
          console.error(`station not found locally: ${id}`);
          console.error('Use a filename (e.g. AP1__document_intake.json) or a station ID/short_code');
          process.exit(1);
        }
      }
    } else {
      // Push all files — each one creates or updates based on content
      const allPaths = listAllStationFiles();

      if (allPaths.length === 0) {
        console.log('No local stations found');
        console.log('Run "fob stations pull --all" first, or create a new station file');
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const filepath of allPaths) {
        const station = loadStationByFilename(filepath);
        const hadId = !!station.id;
        await pushByFilename(filepath, { force });
        if (hadId) updatedCount++;
        else createdCount++;
      }

      console.log('');
      const parts = [];
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      if (createdCount > 0) parts.push(`${createdCount} created`);
      console.log(`Total: ${parts.join(', ')}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
