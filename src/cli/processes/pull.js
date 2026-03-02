import { listProcesses, getProcess, getOrchestratorConfig } from '../../utils/orchestrator.js';
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

  console.log('fob processes pull');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Saving to: ${getProcessesDir()}/`);
  console.log('');

  try {
    if (id) {
      // Pull single process
      const response = await getProcess(id);
      const proc = response.data;
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
