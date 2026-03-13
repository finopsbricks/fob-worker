import { listProcesses } from '../../utils/orchestrator.js';

export async function listProcessesHandler(argv) {
  const { tag } = argv || {};

  if (tag) {
    console.log(`Filter: tag=${tag}`);
    console.log('');
  }

  try {
    const response = await listProcesses({ tag });
    const processes = response.data || [];

    if (processes.length === 0) {
      console.log('No processes found');
      return;
    }

    // Calculate column widths
    const codeWidth = Math.max(4, ...processes.map(p => (p.short_code || '').length));
    const idWidth = Math.max(4, ...processes.map(p => p.id.length));
    const nameWidth = Math.max(4, ...processes.map(p => (p.name || '').length));

    // Header
    const header = `${'CODE'.padEnd(codeWidth)}  ${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  STEPS`;
    console.log(header);
    console.log('-'.repeat(header.length));

    // Rows
    for (const proc of processes) {
      const code = (proc.short_code || '-').padEnd(codeWidth);
      const id = proc.id.padEnd(idWidth);
      const name = (proc.name || '-').padEnd(nameWidth);
      const steps = proc.steps ? proc.steps.length : 0;
      console.log(`${code}  ${id}  ${name}  ${steps}`);
    }

    console.log('');
    console.log(`Total: ${processes.length} processes`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
