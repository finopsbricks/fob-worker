import { checkConnection, getOrchestratorConfig } from '../../utils/orchestrator.js';

export async function workerStatusHandler() {
  console.log('fob worker status');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Org: ${orchestratorConfig.org || '(not set)'}`);
  console.log(`Worker Secret: ${orchestratorConfig.hasSecret ? '***' : '(not set)'}`);
  console.log(`API Key: ${orchestratorConfig.hasApiKey ? '***' : '(not set)'}`);
  console.log('');

  console.log('Checking connection...');

  const result = await checkConnection();

  console.log('');
  console.log(result);
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

  console.log('');
  console.log('='.repeat(60));
}
