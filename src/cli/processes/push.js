import { updateProcess, getOrchestratorConfig } from '../../utils/orchestrator.js';
import { loadProcess, listLocalProcesses, getProcessesDir } from '../../utils/process-files.js';

export async function pushProcessesHandler(argv) {
  const { id, all } = argv;

  // Require explicit id or --all
  if (!id && !all) {
    console.error('Usage: fob processes push <id>');
    console.error('       fob processes push --all');
    console.error('');
    console.error('Run "fob processes list" to see available processes');
    process.exit(1);
  }

  console.log('fob processes push');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Reading from: ${getProcessesDir()}/`);
  console.log('');

  try {
    if (id) {
      // Push single process
      const proc = loadProcess(id);
      if (!proc) {
        console.error(`Process not found locally: ${id}`);
        console.error(`Run "fob processes pull ${id}" first`);
        process.exit(1);
      }

      // Remove fields that shouldn't be sent in update
      const { id: processId, created_at, org, ...updateData } = proc;

      await updateProcess(processId, updateData);
      console.log(`Pushed: ${processId}`);
    } else {
      // Push all local processes
      const localIds = listLocalProcesses();

      if (localIds.length === 0) {
        console.log('No local processes found');
        console.log('Run "fob processes pull --all" first');
        return;
      }

      for (const processId of localIds) {
        const proc = loadProcess(processId);
        const { id: _, created_at, org, ...updateData } = proc;

        await updateProcess(processId, updateData);
        console.log(`Pushed: ${processId}`);
      }

      console.log('');
      console.log(`Total: ${localIds.length} processes pushed`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
