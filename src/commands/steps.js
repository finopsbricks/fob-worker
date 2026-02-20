/**
 * fob steps command
 *
 * List available steps in current worker.
 */

import path from 'path';

import { loadConfig } from '../utils/config.js';
import { loadSteps } from '../utils/steps-loader.js';

/**
 * List available steps
 * @param {string[]} args - Command arguments (unused)
 */
export async function listSteps(args) {
  // Load configuration
  const config = loadConfig();

  // Load steps registry
  const steps = await loadSteps(config.stepsPath);

  const slugs = Object.keys(steps);

  console.log(`Steps from: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log('');

  if (slugs.length === 0) {
    console.log('No steps found');
    return;
  }

  // Group by org prefix
  const grouped = {};
  for (const slug of slugs) {
    const [org] = slug.split('/');
    if (!grouped[org]) {
      grouped[org] = [];
    }
    grouped[org].push(slug);
  }

  for (const [org, orgSlugs] of Object.entries(grouped)) {
    console.log(`${org}/`);
    for (const slug of orgSlugs) {
      const stepName = slug.split('/').slice(1).join('/');
      console.log(`  ${stepName}`);
    }
    console.log('');
  }

  console.log(`Total: ${slugs.length} steps`);
}
