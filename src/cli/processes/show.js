import { getProcess } from '../../utils/orchestrator.js';

export async function showProcessHandler(argv) {
  const { id } = argv;

  console.log(`Process: ${id}`);

  try {
    const response = await getProcess(id);
    const proc = response.data;

    console.log(JSON.stringify(proc, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
