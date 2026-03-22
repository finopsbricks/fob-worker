import { createProcess, updateProcess, setEntityTags, listProcesses } from '../../utils/orchestrator.js';
import { resolveTagNames } from '../../utils/tags.js';
import path from 'path';
import {
  loadProcess,
  listLocalProcesses,
  listAllProcessFiles,
  loadProcessByFilename,
  finalizeNewProcessFile,
  findProcessFile,
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
 * Push a single process by filename — creates or updates based on JSON content.
 * If the file has an `id`, it's an update (PUT). If not, it's a create (POST).
 */
async function pushByFilename(filename) {
  const proc = loadProcessByFilename(filename);
  if (!proc) {
    console.error(`Process file not found: ${filename}`);
    process.exit(1);
  }

  if (proc.id) {
    // Existing process — update
    const { id: _, created_at, org, tags, ...updateData } = proc;
    updateData.dependencies = await resolveDependencies(updateData.dependencies);
    await updateProcess(proc.id, updateData);
    console.log(`Updated: ${proc.id}`);
    await syncTags(proc.id, tags);
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
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob processes push <filename>     (create or update based on content)');
    console.error('       fob processes push <id|short_code> (update by process ID or short_code)');
    console.error('       fob processes push --all');
    console.error('');
    console.error('Run "fob processes list" to see available processes');
    process.exit(1);
  }

  console.log(`Reading from: ${getProcessesDir()}/`);

  try {
    if (id) {
      // Single process — try as filename first, then resolve by ID/short_code
      const filename = id.endsWith('.json') ? id : `${id}.json`;
      const proc = loadProcessByFilename(filename);

      if (proc) {
        await pushByFilename(filename);
      } else {
        // Try by ID or short_code — resolve to filename
        const filepath = findProcessFile(id);
        if (filepath) {
          await pushByFilename(path.basename(filepath));
        } else {
          console.error(`Process not found locally: ${id}`);
          console.error('Use a filename (e.g. AP1__document_intake.json) or a process ID/short_code');
          process.exit(1);
        }
      }
    } else {
      // Push all process files — each one creates or updates based on content
      const allFiles = listAllProcessFiles();

      if (allFiles.length === 0) {
        console.log('No local processes found');
        console.log('Run "fob processes pull --all" first, or create a new process file');
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const filename of allFiles) {
        const proc = loadProcessByFilename(filename);
        const hadId = !!proc.id;
        await pushByFilename(filename);
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
