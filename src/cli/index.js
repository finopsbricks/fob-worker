/**
 * CLI entry point using yargs
 *
 * Pattern: fob <resource> <action> [target] [options]
 */

import yargs from 'yargs';
import 'dotenv/config';

import { showConfigHandler } from './config/show.js';
import { listProcessesHandler } from './processes/list.js';
import { showProcessHandler } from './processes/show.js';
import { pullProcessesHandler } from './processes/pull.js';
import { pushProcessesHandler } from './processes/push.js';
import { updateStepMetadataHandler } from './processes/update-step-metadata.js';
import { listWorkRecordsHandler } from './work-records/list.js';
import { showWorkRecordHandler } from './work-records/show.js';
import { workerStatusHandler } from './worker/status.js';
import { listStepsHandler } from './steps/list.js';
import { runStepHandler } from './steps/run.js';
import { listTagsHandler } from './tags/list.js';
import { createTagHandler } from './tags/create.js';
import { deleteTagHandler } from './tags/delete.js';
import { editProcessHandler } from './processes/edit.js';
import { editItemHandler } from './items/edit.js';
import { editWorkRecordHandler } from './work-records/edit.js';
import { getStepSlugs } from '../utils/steps-loader.js';

function withSeparator(handler) {
  return async (argv) => {
    // console.log('='.repeat(60));
    // console.log('test');
    // console.log(process.env.ORCHESTRATOR_URL);
    console.log('='.repeat(60));
    await handler(argv);
    console.log('='.repeat(60));
  };
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
        .command('list', 'List available steps', {}, withSeparator(listStepsHandler))
        .command(
          'run [slug]',
          'Run a step locally',
          (yargs) => {
            return yargs
              .positional('slug', {
                describe: 'Step slug (e.g., alex/fetch_account_freshness)',
                type: 'string',
              })
              .option('process', {
                alias: 'p',
                describe: 'Use config from this process',
                type: 'string',
              })
              .option('scenario', {
                alias: 's',
                describe: 'Use config from this scenario',
                type: 'string',
              })
              .option('empty', {
                alias: 'e',
                describe: 'Use empty config (no picker)',
                type: 'boolean',
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
            return withSeparator(runStepHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, run');
    })
    .command('config', 'Show CLI configuration', (yargs) => {
      return yargs
        .usage('$0 config <action>')
        .command('show', 'Show resolved paths and environment variables', {}, withSeparator(showConfigHandler))
        .demandCommand(1, 'Specify an action: show');
    })
    .command('processes', 'Work with orchestrator processes', (yargs) => {
      return yargs
        .usage('$0 processes <action> [options]')
        .command('list', 'List processes from orchestrator', {}, withSeparator(listProcessesHandler))
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
            return withSeparator(showProcessHandler)(argv);
          }
        )
        .command(
          'pull [id]',
          'Pull process(es) from orchestrator to local files',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Process ID',
                type: 'string',
              })
              .option('all', {
                alias: 'a',
                describe: 'Pull all processes',
                type: 'boolean',
              });
          },
          withSeparator(pullProcessesHandler)
        )
        .command(
          'push [id]',
          'Push local process(es) to orchestrator (creates new or updates existing)',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Process ID (existing) or filename (new)',
                type: 'string',
              })
              .option('all', {
                alias: 'a',
                describe: 'Push all local processes (creates new + updates existing)',
                type: 'boolean',
              });
          },
          withSeparator(pushProcessesHandler)
        )
        .command(
          'edit [id]',
          'Edit process properties (e.g., tags)',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Process ID',
                type: 'string',
              })
              .option('add-tag', {
                describe: 'Add tag by name (repeatable)',
                type: 'string',
                array: true,
              })
              .option('remove-tag', {
                describe: 'Remove tag by name (repeatable)',
                type: 'string',
                array: true,
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob processes edit <id> --add-tag <name>');
              process.exit(1);
            }
            return withSeparator(editProcessHandler)(argv);
          }
        )
        .command(
          'update-step-metadata',
          'Update step name/description in local processes from code',
          {},
          withSeparator(updateStepMetadataHandler)
        )
        .demandCommand(1, 'Specify an action: list, show, pull, push, edit, update-step-metadata');
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
          withSeparator(listWorkRecordsHandler)
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
            return withSeparator(showWorkRecordHandler)(argv);
          }
        )
        .command(
          'edit [id]',
          'Edit work record properties (e.g., tags)',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Work record ID',
                type: 'string',
              })
              .option('add-tag', {
                describe: 'Add tag by name (repeatable)',
                type: 'string',
                array: true,
              })
              .option('remove-tag', {
                describe: 'Remove tag by name (repeatable)',
                type: 'string',
                array: true,
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob work-records edit <id> --add-tag <name>');
              process.exit(1);
            }
            return withSeparator(editWorkRecordHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, show, edit');
    })
    .command('items', 'Work with orchestrator items', (yargs) => {
      return yargs
        .usage('$0 items <action> [options]')
        .command(
          'edit [id]',
          'Edit item properties (e.g., tags)',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Item ID',
                type: 'string',
              })
              .option('add-tag', {
                describe: 'Add tag by name (repeatable)',
                type: 'string',
                array: true,
              })
              .option('remove-tag', {
                describe: 'Remove tag by name (repeatable)',
                type: 'string',
                array: true,
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob items edit <id> --add-tag <name>');
              process.exit(1);
            }
            return withSeparator(editItemHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: edit');
    })
    .command('tags', 'Manage organization tags', (yargs) => {
      return yargs
        .usage('$0 tags <action> [options]')
        .command('list', 'List all tags', {}, withSeparator(listTagsHandler))
        .command(
          'create [name]',
          'Create a new tag',
          (yargs) => {
            return yargs
              .positional('name', {
                describe: 'Tag name',
                type: 'string',
              })
              .option('color', {
                describe: "Hex color (e.g., '#ef4444')",
                type: 'string',
              })
              .option('description', {
                describe: 'Tag description',
                type: 'string',
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.name) {
              console.error('Usage: fob tags create <name> [--color "#hex"] [--description "..."]');
              process.exit(1);
            }
            return withSeparator(createTagHandler)(argv);
          }
        )
        .command(
          'delete [id]',
          'Delete a tag',
          (yargs) => {
            return yargs.positional('id', {
              describe: 'Tag ID',
              type: 'string',
            });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob tags delete <id>');
              console.error('Run "fob tags list" to see available tags');
              process.exit(1);
            }
            return withSeparator(deleteTagHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, create, delete');
    })
    .command('worker', 'Worker management', (yargs) => {
      return yargs
        .usage('$0 worker <action>')
        .command('status', 'Check connection to orchestrator', {}, withSeparator(workerStatusHandler))
        .demandCommand(1, 'Specify an action: status');
    })
    .completion('completion', 'Generate shell completion script', function (current, argv) {
      // argv._ includes the script name 'fob' as first element
      const args = argv._.slice(1).filter(a => a !== '');

      // Resource level completions (fob <tab>)
      if (args.length === 0) {
        return ['steps', 'config', 'processes', 'items', 'work-records', 'tags', 'worker'];
      }

      // Config action level completions (fob config <tab>)
      if (args[0] === 'config') {
        if (args.length === 1) {
          return ['show'];
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
          return ['list', 'show', 'pull', 'push', 'edit', 'update-step-metadata'];
        }
        return [];
      }

      // Work-records action level completions (fob work-records <tab>)
      if (args[0] === 'work-records') {
        if (args.length === 1) {
          return ['list', 'show', 'edit'];
        }
        return [];
      }

      // Items action level completions (fob items <tab>)
      if (args[0] === 'items') {
        if (args.length === 1) {
          return ['edit'];
        }
        return [];
      }

      // Tags action level completions (fob tags <tab>)
      if (args[0] === 'tags') {
        if (args.length === 1) {
          return ['list', 'create', 'delete'];
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
    .demandCommand(1, 'Specify a resource: steps, config, processes, items, work-records, tags, worker')
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
