/**
 * CLI entry point using yargs
 *
 * Pattern: fob <resource> <action> [target] [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import 'dotenv/config';

import { loadConfig, ensureTempDir, loadRawConfig, getRelevantEnvVars, configFileExists, writeConfig } from './utils/config.js';
import readline from 'readline';
import { loadSteps, getHandler, findPreviousStep } from './utils/steps-loader.js';
import { loadStepOutput, saveStepOutput, loadStepConfig, slugToFilename } from './utils/output.js';
import { resolveTemplates } from './utils/templates.js';

/**
 * Show config command handler
 */
function showConfigHandler() {
  const rawConfig = loadRawConfig();
  const mergedConfig = loadConfig();
  const envVars = getRelevantEnvVars();

  console.log('fob config show');
  console.log('='.repeat(60));

  // .fob.json
  console.log('\n.fob.json:');
  if (rawConfig) {
    console.log(JSON.stringify(rawConfig, null, 2));
  } else {
    console.log('  (not found - using defaults)');
  }

  // Defaults
  console.log('\nDefaults:');
  console.log('  stepsPath: ./src/steps/index.js');
  console.log('  tempDir: ./temp');
  console.log('  orchestrator.url: http://localhost:3000');

  // Environment variables
  console.log('\nEnvironment:');
  for (const [key, value] of Object.entries(envVars)) {
    if (value !== undefined) {
      console.log(`  ${key}: ${value}`);
    }
  }
  const hasEnv = Object.values(envVars).some(v => v !== undefined);
  if (!hasEnv) {
    console.log('  (no relevant env vars set)');
  }

  // Merged result
  console.log('\nResolved config:');
  console.log(`  stepsPath: ${path.relative(process.cwd(), mergedConfig.stepsPath)}`);
  console.log(`  tempDir: ${path.relative(process.cwd(), mergedConfig.tempDir)}`);
  console.log(`  orchestrator.url: ${mergedConfig.orchestrator.url}`);
  console.log(`  orchestrator.org: ${mergedConfig.orchestrator.org || '(not set)'}`);

  console.log('\n' + '='.repeat(60));
}

/**
 * Prompt for input
 */
function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

/**
 * Init config command handler
 */
async function initConfigHandler() {
  console.log('fob config init');
  console.log('='.repeat(60));

  if (configFileExists()) {
    console.log('\n.fob.json already exists.');
    const overwrite = await prompt('Overwrite? (y/N)', 'n');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      return;
    }
  }

  console.log('\nEnter configuration values (press Enter for defaults):\n');

  const stepsPath = await prompt('stepsPath', './src/steps/index.js');
  const tempDir = await prompt('tempDir', './temp');
  const orchestratorUrl = await prompt('orchestrator.url', process.env.ORCHESTRATOR_URL || 'http://localhost:3000');
  const orchestratorOrg = await prompt('orchestrator.org', process.env.WORKER_ORG || '');

  const config = {
    stepsPath,
    tempDir,
  };

  // Only add orchestrator if non-default values
  if (orchestratorUrl !== 'http://localhost:3000' || orchestratorOrg) {
    config.orchestrator = {};
    if (orchestratorUrl !== 'http://localhost:3000') {
      config.orchestrator.url = orchestratorUrl;
    }
    if (orchestratorOrg) {
      config.orchestrator.org = orchestratorOrg;
    }
  }

  const configPath = writeConfig(config);
  console.log(`\nCreated: ${path.relative(process.cwd(), configPath)}`);
  console.log(JSON.stringify(config, null, 2));
}

/**
 * Get step slugs for completion
 */
async function getStepSlugs() {
  try {
    const config = loadConfig();
    const steps = await loadSteps(config.stepsPath);
    return Object.keys(steps);
  } catch {
    return [];
  }
}

/**
 * List steps command handler
 */
async function listStepsHandler() {
  const config = loadConfig();
  const steps = await loadSteps(config.stepsPath);
  const slugs = Object.keys(steps);

  console.log(`Steps from: ${path.relative(process.cwd(), config.stepsPath)}\n`);

  if (slugs.length === 0) {
    console.log('No steps found');
    return;
  }

  // Group by org prefix
  const grouped = {};
  for (const slug of slugs) {
    const [org] = slug.split('/');
    if (!grouped[org]) grouped[org] = [];
    grouped[org].push(slug);
  }

  for (const [org, orgSlugs] of Object.entries(grouped)) {
    console.log(`${org}/`);
    for (const slug of orgSlugs) {
      console.log(`  ${slug.split('/').slice(1).join('/')}`);
    }
    console.log('');
  }

  console.log(`Total: ${slugs.length} steps`);
}

/**
 * Run step command handler
 */
async function runStepHandler(argv) {
  const { slug } = argv;

  const config = loadConfig();
  ensureTempDir(config.tempDir);

  const steps = await loadSteps(config.stepsPath);
  const handler = getHandler(steps, slug);

  if (!handler) {
    console.error(`Unknown step: ${slug}`);
    console.error('Run "fob steps list" to see available steps');
    process.exit(1);
  }

  console.log('fob steps run');
  console.log('='.repeat(60));
  console.log(`Step: ${slug}`);
  console.log(`Steps: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log(`Temp: ${path.relative(process.cwd(), config.tempDir)}`);

  const task = { work_record_id: 'manual-test' };

  // Load previous step output
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

  // Load and resolve config
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

  const savedPath = saveStepOutput(config.tempDir, slug, output);
  console.log(`\n   Output saved: ${path.relative(process.cwd(), savedPath)}`);

  console.log('\n' + '='.repeat(60));
  console.log('Step completed successfully');
  console.log('='.repeat(60));
}

/**
 * Build and run CLI
 */
export function run(args) {
  const cli = yargs(args)
    .scriptName('fob')
    .usage('$0 <resource> <action> [options]')
    .command('steps', 'Work with step handlers', (yargs) => {
      return yargs
        .usage('$0 steps <action> [options]')
        .command('list', 'List available steps', {}, listStepsHandler)
        .command(
          'run [slug]',
          'Run a step locally',
          (yargs) => {
            return yargs.positional('slug', {
              describe: 'Step slug (e.g., alex/fetch_account_freshness)',
              type: 'string',
            });
          },
          (argv) => {
            // Skip if in completion mode
            if (argv.getYargsCompletions) return;

            if (!argv.slug) {
              console.error('Usage: fob steps run <slug>');
              console.error('Run "fob steps list" to see available steps');
              process.exit(1);
            }
            return runStepHandler(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, run');
    })
    .command('config', 'Manage CLI configuration', (yargs) => {
      return yargs
        .usage('$0 config <action>')
        .command('show', 'Show current configuration', {}, showConfigHandler)
        .command('init', 'Create .fob.json interactively', {}, initConfigHandler)
        .demandCommand(1, 'Specify an action: show, init');
    })
    .completion('completion', 'Generate shell completion script', function (current, argv) {
      // argv._ includes the script name 'fob' as first element
      const args = argv._.slice(1).filter(a => a !== '');

      // Resource level completions (fob <tab>)
      if (args.length === 0) {
        return ['steps', 'config'];
      }

      // Config action level completions (fob config <tab>)
      if (args[0] === 'config') {
        if (args.length === 1) {
          return ['show', 'init'];
        }
        return [];
      }

      // Steps action level completions (fob steps <tab>)
      if (args[0] === 'steps') {
        if (args.length === 1) {
          return ['list', 'run'];
        }

        // Step slug completions (fob steps run <tab>)
        if (args[1] === 'run') {
          return getStepSlugs().then(slugs => {
            if (args.length === 2) {
              return slugs;
            }
            return slugs.filter(s => s.startsWith(current));
          });
        }
      }

      return [];
    })
    .demandCommand(1, 'Specify a resource: steps, config')
    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .wrap(null)
    .fail((msg, err, yargs) => {
      if (err) {
        console.error(`Error: ${err.message}`);
        if (process.env.DEBUG) console.error(err.stack);
      } else {
        console.error(msg);
        console.error('');
        yargs.showHelp();
      }
      process.exit(1);
    });

  cli.parse();
}
