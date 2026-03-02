import { getWorkRecord } from '../../utils/orchestrator.js';

export async function showWorkRecordHandler(argv) {
  const { id } = argv;

  console.log('fob work-records show');
  console.log('='.repeat(60));
  console.log(`Work Record: ${id}`);
  console.log('');

  try {
    const response = await getWorkRecord(id);
    const record = response.data;

    console.log(JSON.stringify(record, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
