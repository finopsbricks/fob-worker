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
import { loadSteps, loadStepsWithFiles, getHandler, findPreviousStep } from './utils/steps-loader.js';
import { loadStepOutput, saveStepOutput, loadStepConfig, slugToFilename, loadAllStepOutputs } from './utils/output.js';
import { resolveTemplates } from './utils/templates.js';
import { listProcesses, getProcess, listWorkRecords, getWorkRecord, checkConnection, getOrchestratorConfig } from './utils/orchestrator.js';

/**
 * Show config command handler
 */
function showConfigHandler() {
  const rawConfig = loadRawConfig();
  const mergedConfig = loadConfig();
  const envVars = getRelevantEnvVars();

  console.log('fob config show');
  console.log('='.repeat(60));

  // Resolved config table
  console.log('\nResolved Configuration:');
  const configRows = [
    ['stepsPath', path.relative(process.cwd(), mergedConfig.stepsPath)],
    ['tempDir', path.relative(process.cwd(), mergedConfig.tempDir)],
    ['orchestrator.url', mergedConfig.orchestrator.url],
    ['orchestrator.org', mergedConfig.orchestrator.org || '(not set)'],
  ];

  const keyWidth = Math.max(...configRows.map(r => r[0].length));
  console.log(`${'KEY'.padEnd(keyWidth)}  VALUE`);
  console.log('-'.repeat(60));
  for (const [key, value] of configRows) {
    console.log(`${key.padEnd(keyWidth)}  ${value}`);
  }

  // Environment variables table
  const envEntries = Object.entries(envVars).filter(([, v]) => v !== undefined);
  if (envEntries.length > 0) {
    console.log('\nEnvironment Variables:');
    const envKeyWidth = Math.max(...envEntries.map(([k]) => k.length));
    console.log(`${'VAR'.padEnd(envKeyWidth)}  VALUE`);
    console.log('-'.repeat(60));
    for (const [key, value] of envEntries) {
      console.log(`${key.padEnd(envKeyWidth)}  ${value}`);
    }
  }

  // Config file status
  console.log('\nConfig File:');
  if (rawConfig) {
    console.log('.fob.json found');
  } else {
    console.log('.fob.json not found (using defaults)');
  }

  console.log('');
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
 * List processes command handler
 */
async function listProcessesHandler() {
  console.log('fob processes list');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Org: ${orchestratorConfig.org || '(not set)'}`);
  console.log(`API Key: ${orchestratorConfig.hasApiKey ? '***' : '(not set)'}`);
  console.log('');

  try {
    const response = await listProcesses();
    const processes = response.data || [];

    if (processes.length === 0) {
      console.log('No processes found');
      return;
    }

    // Calculate column widths
    const idWidth = Math.max(4, ...processes.map(p => p.id.length));
    const nameWidth = Math.max(4, ...processes.map(p => (p.name || '').length));

    // Header
    const header = `${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  STEPS`;
    console.log(header);
    console.log('-'.repeat(header.length));

    // Rows
    for (const proc of processes) {
      const id = proc.id.padEnd(idWidth);
      const name = (proc.name || '-').padEnd(nameWidth);
      const steps = proc.steps ? proc.steps.length : 0;
      console.log(`${id}  ${name}  ${steps}`);
    }

    console.log('');
    console.log(`Total: ${processes.length} processes`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show process command handler
 */
async function showProcessHandler(argv) {
  const { id } = argv;

  console.log('fob processes show');
  console.log('='.repeat(60));
  console.log(`Process: ${id}`);
  console.log('');

  try {
    const response = await getProcess(id);
    const proc = response.data;

    console.log(JSON.stringify(proc, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List work records command handler
 */
async function listWorkRecordsHandler(argv) {
  const { limit, status, process: processId } = argv;

  console.log('fob work-records list');
  console.log('='.repeat(60));

  const orchestratorConfig = getOrchestratorConfig();
  console.log(`Orchestrator: ${orchestratorConfig.url}`);
  console.log(`Org: ${orchestratorConfig.org || '(not set)'}`);
  console.log(`API Key: ${orchestratorConfig.hasApiKey ? '***' : '(not set)'}`);

  const filters = [];
  if (limit) filters.push(`limit=${limit}`);
  if (status) filters.push(`status=${status}`);
  if (processId) filters.push(`process=${processId}`);
  if (filters.length > 0) {
    console.log(`Filters: ${filters.join(', ')}`);
  }
  console.log('');

  try {
    const response = await listWorkRecords({ limit, status, process: processId });
    const records = response.data || [];

    if (records.length === 0) {
      console.log('No work records found');
      return;
    }

    // Calculate column widths
    const idWidth = Math.max(2, ...records.map(r => r.id.length));
    const statusWidth = Math.max(6, ...records.map(r => (r.status || '').length));

    // Format date helper
    const formatDate = (iso) => {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toISOString().replace('T', ' ').slice(0, 19);
    };

    // Header
    const header = `${'ID'.padEnd(idWidth)}  ${'STATUS'.padEnd(statusWidth)}  CREATED`;
    console.log(header);
    console.log('-'.repeat(header.length + 10));

    // Rows
    for (const record of records) {
      const id = record.id.padEnd(idWidth);
      const recStatus = (record.status || '-').padEnd(statusWidth);
      const created = formatDate(record.created_at);
      console.log(`${id}  ${recStatus}  ${created}`);
    }

    console.log('');
    console.log(`Total: ${records.length} records`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show work record command handler
 */
async function showWorkRecordHandler(argv) {
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

/**
 * Worker status command handler
 */
async function workerStatusHandler() {
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
  const { steps, files } = await loadStepsWithFiles(config.stepsPath);
  const slugs = Object.keys(steps);

  console.log('fob steps list');
  console.log('='.repeat(60));
  console.log(`Source: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log('');

  if (slugs.length === 0) {
    console.log('No steps found');
    return;
  }

  // Parse folder and file from paths
  const parsed = slugs.map(slug => {
    const filePath = files[slug] || '';
    const parts = filePath.replace(/^\.\//, '').split('/');
    const file = parts.pop() || '-';
    const folder = parts.join('/') || '-';
    return { slug, folder, file };
  });

  // Calculate column widths
  const slugWidth = Math.max(4, ...parsed.map(p => p.slug.length));
  const folderWidth = Math.max(6, ...parsed.map(p => p.folder.length));

  // Header
  console.log(`${'SLUG'.padEnd(slugWidth)}  ${'FOLDER'.padEnd(folderWidth)}  FILE`);
  console.log('-'.repeat(slugWidth + folderWidth + 30));

  // Rows (sorted)
  for (const { slug, folder, file } of parsed.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`${slug.padEnd(slugWidth)}  ${folder.padEnd(folderWidth)}  ${file}`);
  }

  console.log('');
  console.log(`Total: ${slugs.length} steps`);
}

/**
 * Run step command handler
 *
 * Constructs a task matching the orchestrator's Task typedef:
 * - step_queue_id: string
 * - step: { slug, config }
 * - work_record: { id, item_snapshot, step_outputs }
 * - org_id: string
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

  // Load all step outputs from temp directory
  const step_outputs = loadAllStepOutputs(config.tempDir);
  const step_output_slugs = Object.keys(step_outputs);

  if (step_output_slugs.length > 0) {
    console.log(`\n   Loaded step_outputs: ${step_output_slugs.join(', ')}`);
  } else {
    console.log(`\n   No previous step outputs found in temp/`);
  }

  // Load and resolve step config
  const rawConfig = loadStepConfig(config.tempDir, slug);
  const stepConfig = rawConfig ? resolveTemplates(rawConfig, config.tempDir) : {};

  if (rawConfig) {
    console.log(`   Loaded config from: ${slug.replace(/\//g, '__')}.config.json`);
  }

  // Construct task matching orchestrator structure
  const task = {
    step_queue_id: `local-${Date.now()}`,
    step: {
      slug: slug,
      config: stepConfig,
    },
    work_record: {
      id: `local-wr-${Date.now()}`,
      item_snapshot: null,
      step_outputs: step_outputs,
    },
    org_id: process.env.WORKER_ORG || 'local',
  };

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
    .command('processes', 'Work with orchestrator processes', (yargs) => {
      return yargs
        .usage('$0 processes <action> [options]')
        .command('list', 'List processes from orchestrator', {}, listProcessesHandler)
        .command(
          'show [id]',
          'Show process definition',
          (yargs) => {
            return yargs.positional('id', {
              describe: 'Process ID',
              type: 'string',
            });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob processes show <id>');
              console.error('Run "fob processes list" to see available processes');
              process.exit(1);
            }
            return showProcessHandler(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, show');
    })
    .command('work-records', 'Work with orchestrator work records', (yargs) => {
      return yargs
        .usage('$0 work-records <action> [options]')
        .command(
          'list',
          'List recent work records',
          (yargs) => {
            return yargs
              .option('limit', {
                alias: 'l',
                describe: 'Maximum number of records',
                type: 'number',
              })
              .option('status', {
                alias: 's',
                describe: 'Filter by status',
                type: 'string',
              })
              .option('process', {
                alias: 'p',
                describe: 'Filter by process ID',
                type: 'string',
              });
          },
          listWorkRecordsHandler
        )
        .command(
          'show [id]',
          'Show work record details',
          (yargs) => {
            return yargs.positional('id', {
              describe: 'Work record ID',
              type: 'string',
            });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob work-records show <id>');
              console.error('Run "fob work-records list" to see recent records');
              process.exit(1);
            }
            return showWorkRecordHandler(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, show');
    })
    .command('worker', 'Worker management', (yargs) => {
      return yargs
        .usage('$0 worker <action>')
        .command('status', 'Check connection to orchestrator', {}, workerStatusHandler)
        .demandCommand(1, 'Specify an action: status');
    })
    .completion('completion', 'Generate shell completion script', function (current, argv) {
      // argv._ includes the script name 'fob' as first element
      const args = argv._.slice(1).filter(a => a !== '');

      // Resource level completions (fob <tab>)
      if (args.length === 0) {
        return ['steps', 'config', 'processes', 'work-records', 'worker'];
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

      // Processes action level completions (fob processes <tab>)
      if (args[0] === 'processes') {
        if (args.length === 1) {
          return ['list', 'show'];
        }
        return [];
      }

      // Work-records action level completions (fob work-records <tab>)
      if (args[0] === 'work-records') {
        if (args.length === 1) {
          return ['list', 'show'];
        }
        return [];
      }

      // Worker action level completions (fob worker <tab>)
      if (args[0] === 'worker') {
        if (args.length === 1) {
          return ['status'];
        }
        return [];
      }

      return [];
    })
    .demandCommand(1, 'Specify a resource: steps, config, processes, work-records, worker')
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
