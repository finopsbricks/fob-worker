import { runProcess, getProcess, getItem } from '../../utils/orchestrator.js';

export async function runProcessHandler(argv) {
  const { id, item: itemId } = argv;

  try {
    const response = await runProcess(id, itemId);
    const result = response.data;

    console.log(`Triggered: ${id}`);
    if (itemId) {
      try {
        const itemResponse = await getItem(itemId);
        const item = itemResponse.data;
        console.log(`Item:      ${item.name || itemId} (${itemId})`);
      } catch {
        console.log(`Item:      ${itemId}`);
      }
    }
    console.log(`Work Record: ${result.work_record_id}`);
    console.log('');
    console.log(`Use \`fob work-records show ${result.work_record_id}\` to check status.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
