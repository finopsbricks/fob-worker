import { listProcesses, getOrchestratorConfig } from '../../utils/orchestrator.js';

export async function listProcessesHandler() {
  console.log('fob processes list');
  console.log('hello saar');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Org: ${orchestratorConfig.org || '(not set)'}`);
  console.log(`API Key: ${orchestratorConfig.hasApiKey ? '***' : '(not set)'}`);
  console.log('');

  try {
    const response = await listProcesses();
    const processes = response.data || [];

    if (processes.length === 0) {
      console.log('No processes found');
      return;
    }

    // Calculate column widths
    const idWidth = Math.max(4, ...processes.map(p => p.id.length));
    const nameWidth = Math.max(4, ...processes.map(p => (p.name || '').length));

    // Header
    const header = `${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  STEPS`;
    console.log(header);
    console.log('-'.repeat(header.length));

    // Rows
    for (const proc of processes) {
      const id = proc.id.padEnd(idWidth);
      const name = (proc.name || '-').padEnd(nameWidth);
      const steps = proc.steps ? proc.steps.length : 0;
      console.log(`${id}  ${name}  ${steps}`);
    }

    console.log('');
    console.log(`Total: ${processes.length} processes`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
