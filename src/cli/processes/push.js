import { createProcess, updateProcess, setEntityTags, listProcesses } from '../../utils/orchestrator.js';
import { resolveTagNames } from '../../utils/tags.js';
import {
  loadProcess,
  listLocalProcesses,
  listAllProcessFiles,
  loadProcessByFilename,
  finalizeNewProcessFile,
  findProcessFile,
  getProcessesDir,
  getStationsDir,
} from '../../utils/process-files.js';

/** @type {Map<string, string>|null} Cached short_code → ID map */
let _shortCodeMap = null;

/**
 * Build short_code → ID map from remote processes (fetched once per push session).
 * Falls back to local files if the API call fails.
 * @returns {Promise<Map<string, string>>}
 */
async function getShortCodeMap() {
  if (_shortCodeMap) return _shortCodeMap;

  _shortCodeMap = new Map();
  try {
    const response = await listProcesses();
    for (const p of response.data || []) {
      if (p.short_code) _shortCodeMap.set(p.short_code, p.id);
    }
  } catch {
    // Fallback: build from local files
    for (const id of listLocalProcesses()) {
      const proc = loadProcess(id);
      if (proc?.short_code) _shortCodeMap.set(proc.short_code, proc.id);
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
 * Sync tags for a process after push.
 * Tags field is optional — missing means don't touch, empty array means clear all.
 */
async function syncTags(processId, tags) {
  if (tags === undefined) return;

  if (tags.length === 0) {
    await setEntityTags('processes', processId, []);
    console.log(`  Tags cleared`);
    return;
  }

  const { tagIds, createdNames } = await resolveTagNames(tags);
  await setEntityTags('processes', processId, tagIds);
  if (createdNames.length > 0) {
    console.log(`  Auto-created tags: ${createdNames.join(', ')}`);
  }
  console.log(`  Tags synced: ${tags.join(', ')}`);
}

/**
 * Push a single process by filename — creates or updates based on JSON content.
 * If the file has an `id`, it's an update (PUT). If not, it's a create (POST).
 * With `force`, a 404 on update falls back to create with the same id.
 * @param {string} filename
 * @param {{ force?: boolean }} [options]
 */
async function pushByFilename(filename, { force = false } = {}) {
  const proc = loadProcessByFilename(filename);
  if (!proc) {
    console.error(`Process file not found: ${filename}`);
    process.exit(1);
  }

  if (proc.id) {
    // Existing process — update
    const { id, created_at, org, tags, ...updateData } = proc;
    updateData.dependencies = await resolveDependencies(updateData.dependencies);

    try {
      await updateProcess(id, updateData);
      console.log(`Updated: ${id}`);
      await syncTags(id, tags);
    } catch (err) {
      const is404 = err.message.includes('(404)');
      if (!is404 || !force) throw err;

      // --force: process doesn't exist remotely — create with same id
      console.log(`  Not found remotely (${id}), creating with --force...`);
      const createData = { id, ...updateData };
      const response = await createProcess(createData);
      const created = response.data;
      const newPath = finalizeNewProcessFile(filename, created);
      console.log(`Created: ${created.id} -> ${newPath}`);
      await syncTags(created.id, tags);
    }
  } else {
    // New process — create
    const { created_at, org, tags, ...createData } = proc;
    createData.dependencies = await resolveDependencies(createData.dependencies);
    const response = await createProcess(createData);
    const created = response.data;
    const newPath = finalizeNewProcessFile(filename, created);
    console.log(`Created: ${created.id} -> ${newPath}`);
    await syncTags(created.id, tags);
  }
}

export async function pushProcessesHandler(argv) {
  const { id, all, force } = argv;
  // argv._[0] is 'processes' or 'stations' — controls vocab in user-visible strings
  const resource = argv._?.[0] === 'stations' ? 'stations' : 'processes';

  // Require explicit id or --all
  if (!id && !all) {
    console.error(`Usage: fob ${resource} push <filename>     (create or update based on content)`);
    console.error(`       fob ${resource} push <id|short_code> (update by ${resource.replace(/s$/, '')} ID or short_code)`);
    console.error(`       fob ${resource} push --all`);
    console.error('');
    console.error(`Run "fob ${resource} list" to see available ${resource}`);
    process.exit(1);
  }

  console.log(`Reading from: ${getProcessesDir()}/ and ${getStationsDir()}/`);

  try {
    if (id) {
      // Single — try as filename first, then resolve by ID/short_code
      const filename = id.endsWith('.json') ? id : `${id}.json`;
      const proc = loadProcessByFilename(filename);

      if (proc) {
        await pushByFilename(filename, { force });
      } else {
        // Try by ID or short_code — resolve to filepath
        const filepath = findProcessFile(id);
        if (filepath) {
          await pushByFilename(filepath, { force });
        } else {
          console.error(`${resource.replace(/s$/, '')} not found locally: ${id}`);
          console.error(`Use a filename (e.g. AP1__document_intake.json) or a ${resource.replace(/s$/, '')} ID/short_code`);
          process.exit(1);
        }
      }
    } else {
      // Push all files (from both layouts) — each one creates or updates based on content
      const allPaths = listAllProcessFiles();

      if (allPaths.length === 0) {
        console.log(`No local ${resource} found`);
        console.log(`Run "fob ${resource} pull --all" first, or create a new ${resource.replace(/s$/, '')} file`);
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const filepath of allPaths) {
        const proc = loadProcessByFilename(filepath);
        const hadId = !!proc.id;
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
