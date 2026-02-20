/**
 * fob step <slug> command
 *
 * Run a step locally for debugging.
 */

import path from 'path';
import 'dotenv/config';

import { loadConfig, ensureTempDir } from '../utils/config.js';
import { loadSteps, getHandler, findPreviousStep } from '../utils/steps-loader.js';
import { loadStepOutput, saveStepOutput, loadStepConfig, slugToFilename } from '../utils/output.js';
import { resolveTemplates } from '../utils/templates.js';

/**
 * Run a step by slug
 * @param {string[]} args - Command arguments
 */
export async function runStep(args) {
  const slug = args[0];

  if (!slug) {
    console.error('Usage: fob step <slug>');
    console.error('Run "fob steps" to see available steps');
    process.exit(1);
  }

  // Load configuration
  const config = loadConfig();
  ensureTempDir(config.tempDir);

  // Load steps registry
  const steps = await loadSteps(config.stepsPath);

  // Get handler for the slug
  const handler = getHandler(steps, slug);
  if (!handler) {
    console.error(`Unknown step: ${slug}`);
    console.error('Run "fob steps" to see available steps');
    process.exit(1);
  }

  console.log('fob step');
  console.log('='.repeat(60));
  console.log(`Step: ${slug}`);
  console.log(`Steps: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log(`Temp: ${path.relative(process.cwd(), config.tempDir)}`);

  // Build task object
  const task = {
    work_record_id: 'manual-test',
  };

  // Load previous step output if available
  const previousSlug = findPreviousStep(steps, slug);
  if (previousSlug) {
    const previousOutput = loadStepOutput(config.tempDir, previousSlug);
    if (previousOutput) {
      console.log(`\n   Loading previous_output from: ${slugToFilename(previousSlug)}`);
      task.previous_output = previousOutput;
    } else {
      console.log(`\n   No previous output found for: ${previousSlug}`);
    }
  }

  // Load and resolve config if exists
  const rawConfig = loadStepConfig(config.tempDir, slug);
  if (rawConfig) {
    task.config = resolveTemplates(rawConfig, config.tempDir);
    console.log(`   Loaded config from: ${slug.replace(/\//g, '__')}.config.json`);
  }

  console.log('\n' + '-'.repeat(60));
  console.log('Running step...');
  console.log('-'.repeat(60));

  const output = await handler(task);

  console.log('\n' + '-'.repeat(60));
  console.log('Output:');
  console.log('-'.repeat(60));
  console.log(JSON.stringify(output, null, 2));

  // Save output
  const savedPath = saveStepOutput(config.tempDir, slug, output);
  console.log(`\n   Output saved: ${path.relative(process.cwd(), savedPath)}`);

  console.log('\n' + '='.repeat(60));
  console.log('Step completed successfully');
  console.log('='.repeat(60));
}
