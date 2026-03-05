import { createProcess, updateProcess } from '../../utils/orchestrator.js';
import {
  loadProcess,
  listLocalProcesses,
  listNewProcessFiles,
  loadProcessByFilename,
  finalizeNewProcessFile,
  getProcessesDir,
} from '../../utils/process-files.js';

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

  const { id: _, created_at, org, ...updateData } = proc;
  await updateProcess(processId, updateData);
  console.log(`Updated: ${processId}`);
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
  const { id: _, created_at, org, ...createData } = proc;

  const response = await createProcess(createData);
  const created = response.data;

  // Write the server-assigned ID back and rename the file
  const newPath = finalizeNewProcessFile(filename, created);
  console.log(`Created: ${created.id} -> ${newPath}`);
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
        const { id: _, created_at, org, ...updateData } = proc;
        await updateProcess(processId, updateData);
        console.log(`Updated: ${processId}`);
        updatedCount++;
      }

      // Create new processes
      for (const filename of newFiles) {
        const proc = loadProcessByFilename(filename);
        const { id: _, created_at, org, ...createData } = proc;
        const response = await createProcess(createData);
        const created = response.data;
        const newPath = finalizeNewProcessFile(filename, created);
        console.log(`Created: ${created.id} -> ${newPath}`);
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
