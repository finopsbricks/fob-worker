import { listProcesses, getProcess } from '../../utils/orchestrator.js';
import { saveProcess, getProcessesDir } from '../../utils/process-files.js';

export async function pullProcessesHandler(argv) {
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob processes pull <id>');
    console.error('       fob processes pull --all');
    console.error('');
    console.error('Run "fob processes list" to see available processes');
    process.exit(1);
  }

  console.log(`Saving to: ${getProcessesDir()}/`);


  try {
    if (id) {
      // Pull single process
      const response = await getProcess(id);
      const proc = response.data;
      // Convert tag objects to names for local storage
      if (proc.tags) {
        proc.tags = proc.tags.map(t => t.name);
      }
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

      for (const proc of processes) {
        // Fetch full process details (list may not include all fields)
        const fullResponse = await getProcess(proc.id);
        const fullProc = fullResponse.data;
        // Convert tag objects to names for local storage
        if (fullProc.tags) {
          fullProc.tags = fullProc.tags.map(t => t.name);
        }
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
