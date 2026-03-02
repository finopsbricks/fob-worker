import path from 'path';
import { loadConfig, getRelevantEnvVars } from '../../utils/config.js';

export function showConfigHandler() {
  const config = loadConfig();
  const envVars = getRelevantEnvVars();

  console.log('\nPaths:');
  console.log(`stepsPath  ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log(`tempDir    ${path.relative(process.cwd(), config.tempDir)}`);

  const envEntries = Object.entries(envVars).filter(([, v]) => v !== undefined);
  if (envEntries.length > 0) {
    console.log('\nEnvironment Variables:');
    const keyWidth = Math.max(...envEntries.map(([k]) => k.length));
    for (const [key, value] of envEntries) {
      console.log(`${key.padEnd(keyWidth)}  ${value}`);
    }
  }

  console.log('');
}
