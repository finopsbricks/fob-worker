import { checkConnection } from '../../utils/orchestrator.js';

export async function orchestratorStatusHandler() {
  console.log('Checking connection...');

  const result = await checkConnection();

  console.log('');
  if (result.connected) {
    console.log('Status: Connected');
    console.log(`HTTP: ${result.status}`);
  } else {
    console.log('Status: Not connected');
    if (result.error) {
      console.log(`Error: ${result.error}`);
    } else if (result.status) {
      console.log(`HTTP: ${result.status}`);
    }
  }

}

