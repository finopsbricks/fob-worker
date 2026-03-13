import { createProcess, updateProcess, setEntityTags, listProcesses } from '../../utils/orchestrator.js';
import { resolveTagNames } from '../../utils/tags.js';
import {
  loadProcess,
  listLocalProcesses,
  listNewProcessFiles,
  loadProcessByFilename,
  finalizeNewProcessFile,
  getProcessesDir,
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
 * Push a single existing process (has ID) — PUT update
 */
async function pushExistingProcess(processId) {
  const proc = loadProcess(processId);
  if (!proc) {
    console.error(`Process not found locally: ${processId}`);
    console.error(`Run "fob processes pull ${processId}" first`);
    process.exit(1);
  }

  const { id: _, created_at, org, tags, ...updateData } = proc;
  updateData.dependencies = await resolveDependencies(updateData.dependencies);
  await updateProcess(processId, updateData);
  console.log(`Updated: ${processId}`);
  await syncTags(processId, tags);
}

/**
 * Push a single new process (no ID yet) — POST create, then rename file
 */
async function pushNewProcess(filename) {
  const proc = loadProcessByFilename(filename);
  if (!proc) {
    console.error(`Process file not found: ${filename}`);
    process.exit(1);
  }

  // Strip fields that shouldn't be sent (id shouldn't exist, but be safe)
  const { id: _, created_at, org, tags, ...createData } = proc;
  createData.dependencies = await resolveDependencies(createData.dependencies);

  const response = await createProcess(createData);
  const created = response.data;

  // Write the server-assigned ID back and rename the file
  const newPath = finalizeNewProcessFile(filename, created);
  console.log(`Created: ${created.id} -> ${newPath}`);
  await syncTags(created.id, tags);
}

export async function pushProcessesHandler(argv) {
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob processes push <id>           (update existing)');
    console.error('       fob processes push <filename>     (create new)');
    console.error('       fob processes push --all');
    console.error('');
    console.error('Run "fob processes list" to see available processes');
    process.exit(1);
  }

  console.log(`Reading from: ${getProcessesDir()}/`);

  try {
    if (id) {
      // Single process — determine if existing (by ID) or new (by filename)
      const existingProc = loadProcess(id);

      if (existingProc) {
        // Existing process found by ID
        await pushExistingProcess(id);
      } else if (id.endsWith('.json')) {
        // Looks like a filename — try as new process
        await pushNewProcess(id);
      } else {
        // Could be a partial filename without .json
        const filename = `${id}.json`;
        const proc = loadProcessByFilename(filename);
        if (proc) {
          await pushNewProcess(filename);
        } else {
          console.error(`Process not found locally: ${id}`);
          console.error('For existing processes, use the process ID');
          console.error('For new processes, use the filename (e.g. nowapps_my_process.json)');
          process.exit(1);
        }
      }
    } else {
      // Push all — both existing and new
      const existingIds = listLocalProcesses();
      const newFiles = listNewProcessFiles();

      if (existingIds.length === 0 && newFiles.length === 0) {
        console.log('No local processes found');
        console.log('Run "fob processes pull --all" first, or create a new process file');
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      // Update existing processes
      for (const processId of existingIds) {
        const proc = loadProcess(processId);
        const { id: _, created_at, org, tags, ...updateData } = proc;
        updateData.dependencies = await resolveDependencies(updateData.dependencies);
        await updateProcess(processId, updateData);
        console.log(`Updated: ${processId}`);
        await syncTags(processId, tags);
        updatedCount++;
      }

      // Create new processes
      for (const filename of newFiles) {
        const proc = loadProcessByFilename(filename);
        const { id: _, created_at, org, tags, ...createData } = proc;
        createData.dependencies = await resolveDependencies(createData.dependencies);
        const response = await createProcess(createData);
        const created = response.data;
        const newPath = finalizeNewProcessFile(filename, created);
        console.log(`Created: ${created.id} -> ${newPath}`);
        await syncTags(created.id, tags);
        createdCount++;
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
