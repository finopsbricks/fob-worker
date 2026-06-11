import { cancelWorkRecord } from '../../utils/orchestrator.js';

export async function cancelWorkRecordHandler(argv) {
  const { id, json } = argv;

  try {
    const response = await cancelWorkRecord(id);
    const record = response.data;

    if (json) {
      console.log(JSON.stringify(record, null, 2));
      return;
    }

    console.log(`Cancelled work record ${record.id}`);
    console.log(`Status:   ${record.status}`);
    console.log(`Station:  ${record.process || '—'}`);
    if (record.error) console.log(`Error:    ${record.error}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
