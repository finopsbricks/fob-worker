import { getProcess } from '../../utils/orchestrator.js';

export async function showProcessHandler(argv) {
  const { id } = argv;

  console.log('fob processes show');
  console.log('='.repeat(60));
  console.log(`Process: ${id}`);
  console.log('');

  try {
    const response = await getProcess(id);
    const proc = response.data;

    console.log(JSON.stringify(proc, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
