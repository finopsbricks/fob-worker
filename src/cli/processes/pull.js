import { listProcesses, getProcess } from '../../utils/orchestrator.js';
import { saveProcess, getProcessesDir } from '../../utils/process-files.js';

/**
 * Convert dependency IDs to short_codes using a process map.
 * Values without a matching short_code pass through unchanged.
 * @param {string[]} dependencies
 * @param {Map<string, string>} idToShortCode - Map of process ID → short_code
 * @returns {string[]}
 */
function convertDependenciesToShortCodes(dependencies, idToShortCode) {
  if (!dependencies || dependencies.length === 0) return dependencies;
  return dependencies.map(dep => idToShortCode.get(dep) || dep);
}

export async function pullProcessesHandler(argv) {
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob processes pull <id|short_code>');
    console.error('       fob processes pull --all');
    console.error('');
    console.error('Run "fob processes list" to see available processes');
    process.exit(1);
  }

  console.log(`Saving to: ${getProcessesDir()}/`);


  try {
    if (id) {
      // Pull single process — also fetch process list for dependency resolution
      const [response, allResponse] = await Promise.all([
        getProcess(id),
        listProcesses(),
      ]);
      const proc = response.data;
      const idToShortCode = new Map(
        (allResponse.data || []).filter(p => p.short_code).map(p => [p.id, p.short_code])
      );
      // Convert tag objects to names for local storage
      if (proc.tags) {
        proc.tags = proc.tags.map(t => t.name);
      }
      proc.dependencies = convertDependenciesToShortCodes(proc.dependencies, idToShortCode);
      const filepath = saveProcess(proc);
      console.log(`Saved: ${filepath}`);
    } else {
      // Pull all processes
      const response = await listProcesses();
      const processes = response.data || [];

      if (processes.length === 0) {
        console.log('No processes found');
        return;
      }

      // Build ID → short_code map from the full list
      const idToShortCode = new Map(
        processes.filter(p => p.short_code).map(p => [p.id, p.short_code])
      );

      for (const proc of processes) {
        // Fetch full process details (list may not include all fields)
        const fullResponse = await getProcess(proc.id);
        const fullProc = fullResponse.data;
        // Convert tag objects to names for local storage
        if (fullProc.tags) {
          fullProc.tags = fullProc.tags.map(t => t.name);
        }
        fullProc.dependencies = convertDependenciesToShortCodes(fullProc.dependencies, idToShortCode);
        const filepath = saveProcess(fullProc);
        console.log(`Saved: ${filepath}`);
      }

      console.log('');
      console.log(`Total: ${processes.length} processes pulled`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
