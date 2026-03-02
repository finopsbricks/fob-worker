import path from 'path';
import { loadConfig } from '../../utils/config.js';
import { loadSteps } from '../../utils/steps-loader.js';
import { listLocalProcesses, loadProcess, saveProcess, getProcessesDir } from '../../utils/process-files.js';

export async function updateStepMetadataHandler() {
  const config = loadConfig();

  console.log(`Steps: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log(`Processes: ${getProcessesDir()}/`);
  console.log('');

  try {
    // Load step definitions
    const steps = await loadSteps(config.stepsPath);
    const stepMetadata = {};

    for (const [slug, step] of Object.entries(steps)) {
      if (step && step.name) {
        stepMetadata[slug] = {
          name: step.name,
          description: step.description || '',
        };
      }
    }

    console.log(`Loaded ${Object.keys(stepMetadata).length} step definitions`);
    console.log('');

    // Update each local process
    const localIds = listLocalProcesses();

    if (localIds.length === 0) {
      console.log('No local processes found');
      console.log('Run "fob processes pull" first');
      return;
    }

    let totalUpdated = 0;

    for (const processId of localIds) {
      const proc = loadProcess(processId);
      let updated = false;

      if (proc.steps && Array.isArray(proc.steps)) {
        for (const step of proc.steps) {
          const meta = stepMetadata[step.slug];
          if (meta) {
            if (step.name !== meta.name || step.description !== meta.description) {
              step.name = meta.name;
              step.description = meta.description;
              updated = true;
            }
          }
        }
      }

      if (updated) {
        saveProcess(proc);
        console.log(`Updated: ${proc.name} (${processId})`);
        totalUpdated++;
      }
    }

    console.log('');
    console.log(`Updated ${totalUpdated} of ${localIds.length} processes`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
