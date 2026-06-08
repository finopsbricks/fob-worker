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
import { runProcessHandler } from './processes/run.js';
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
import { editTagHandler } from './tags/edit.js';
import { editProcessHandler } from './processes/edit.js';
import { listLinesHandler } from './lines/list.js';
import { showLineHandler } from './lines/show.js';
import { statusLineHandler } from './lines/status.js';
import { statusProcessHandler } from './processes/status.js';
import { listWorkpiecesHandler } from './workpieces/list.js';
import { showWorkpieceHandler } from './workpieces/show.js';
import { watchHandler } from './workpieces/watch.js';
import { listItemsHandler } from './items/list.js';
import { showItemHandler } from './items/show.js';
import { editItemHandler } from './items/edit.js';
import { editWorkRecordHandler } from './work-records/edit.js';
import { cancelWorkRecordHandler } from './work-records/cancel.js';
import { showSupportingDocHandler } from './supporting-docs/show.js';
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
 * Build the subcommand tree shared by `fob processes` and `fob stations`.
 * Same handlers; the `names` arg threads vocab through user-visible strings.
 */
function buildProcessSubcommands(yargs, names) {
  const { plural, singular } = names;
  const Cap = singular.charAt(0).toUpperCase() + singular.slice(1);
  return yargs
    .usage(`$0 ${plural} <action> [options]`)
    .command(
      'list',
      `List ${plural} from orchestrator`,
      (yargs) => {
        return yargs
          .option('tag', { describe: 'Filter by tag name', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' });
      },
      withSeparator(listProcessesHandler),
    )
    .command(
      'show [id]',
      `Show ${singular} definition (config from .orchestrator/)`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} ID or short_code`, type: 'string' })
          .option('work-records', { describe: 'Include recent work records', type: 'boolean' })
          .option('items', { describe: 'Include linked items', type: 'boolean' })
          .option('all', { describe: 'Include all linked entities', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error(`Usage: fob ${plural} show <id|short_code>`);
          console.error(`Run "fob ${plural} list" to see available ${plural}.`);
          console.error(`For live bin state, use "fob ${plural} status <short_code>".`);
          process.exit(1);
        }
        // Thread the invoked alias through so handler hints can match it.
        argv._plural = plural;
        return withSeparator(showProcessHandler)(argv);
      },
    )
    .command(
      'status [id]',
      `Snapshot of live bin state for one ${singular} (reads temp/stations/)`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} short_code (e.g. VM3)`, type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error(`Usage: fob ${plural} status <short_code>`);
          console.error(`Pass the ${singular} short_code (e.g. VM3). Run "fob lines status" to see active lines.`);
          process.exit(1);
        }
        return withSeparator(statusProcessHandler)(argv);
      },
    )
    .command(
      'run [id]',
      `Trigger a remote ${singular} execution`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} ID or short_code`, type: 'string' })
          .option('item', { describe: `Item ID to run the ${singular} on`, type: 'string' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error(`Usage: fob ${plural} run <id|short_code> --item <item-id>`);
          process.exit(1);
        }
        return withSeparator(runProcessHandler)(argv);
      },
    )
    .command(
      'pull [id]',
      `Pull ${plural} from orchestrator to local files`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} ID or short_code`, type: 'string' })
          .option('all', { alias: 'a', describe: `Pull all ${plural}`, type: 'boolean' });
      },
      withSeparator(pullProcessesHandler),
    )
    .command(
      'push [id]',
      `Push local ${plural} to orchestrator (creates new or updates existing)`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} ID (existing) or filename (new)`, type: 'string' })
          .option('all', { alias: 'a', describe: `Push all local ${plural} (creates new + updates existing)`, type: 'boolean' })
          .option('force', { alias: 'f', describe: `Create ${singular} if it doesn't exist remotely (upsert)`, type: 'boolean' });
      },
      withSeparator(pushProcessesHandler),
    )
    .command(
      'edit [id]',
      `Edit ${singular} properties (e.g., tags, short_code)`,
      (yargs) => {
        return yargs
          .positional('id', { describe: `${Cap} ID or short_code`, type: 'string' })
          .option('short-code', { describe: `Set the ${singular} short_code (e.g., P1, P9b)`, type: 'string' })
          .option('add-tag', { describe: 'Add tag by name (repeatable)', type: 'string', array: true })
          .option('remove-tag', { describe: 'Remove tag by name (repeatable)', type: 'string', array: true });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error(`Usage: fob ${plural} edit <id|short_code> --short-code P1 --add-tag <name>`);
          process.exit(1);
        }
        return withSeparator(editProcessHandler)(argv);
      },
    )
    .command(
      'update-step-metadata',
      `Update step name/description in local ${plural} from code`,
      {},
      withSeparator(updateStepMetadataHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, status, run, pull, push, edit, update-step-metadata');
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
              })
              .option('item', {
                alias: 'i',
                describe: 'Fetch item from orchestrator to populate item_snapshot',
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
    .command('processes', 'Work with orchestrator processes', (yargs) =>
      buildProcessSubcommands(yargs, { plural: 'processes', singular: 'process' }),
    )
    .command('stations', 'Work with orchestrator stations (vocabulary alias for processes)', (yargs) =>
      buildProcessSubcommands(yargs, { plural: 'stations', singular: 'station' }),
    )
    .command('lines', 'Inspect assembly lines (config + live state)', (yargs) => {
      return yargs
        .usage('$0 lines <action> [options]')
        .command(
          'list',
          'List lines grouped from local station files (definitional)',
          (yargs) => yargs.option('json', { describe: 'Output raw JSON', type: 'boolean' }),
          withSeparator(listLinesHandler),
        )
        .command(
          'show [line]',
          'Show line config: stations in dependency order + conveyor topology (definitional)',
          (yargs) => {
            return yargs
              .positional('line', { describe: 'Line code (e.g. VM, P8)', type: 'string' })
              .option('json', { describe: 'Output raw JSON', type: 'boolean' });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.line) {
              console.error('Usage: fob lines show <line>');
              console.error('Run "fob lines list" to see available lines.');
              console.error('For live bin state, use "fob lines status <line>".');
              process.exit(1);
            }
            return withSeparator(showLineHandler)(argv);
          },
        )
        .command(
          'status [line]',
          'Snapshot of live bin state (reads temp/stations/). No arg = per-line summary.',
          (yargs) => {
            return yargs
              .positional('line', { describe: 'Line code to drill into (omit for cross-line summary)', type: 'string' })
              .option('json', { describe: 'Output raw JSON', type: 'boolean' });
          },
          withSeparator(statusLineHandler),
        )
        .demandCommand(1, 'Specify an action: list, show, status');
    })
    .command('workpieces', 'Inspect workpieces on the filesystem (temp/stations/)', (yargs) => {
      return yargs
        .usage('$0 workpieces <action> [options]')
        .command(
          'list',
          'Snapshot dashboard of workpieces on disk',
          (yargs) => yargs
            .option('line', { describe: 'Scope to a single line (e.g. VM)', type: 'string' })
            .option('bin', { describe: 'Scope to a specific bin (STATION/BIN, e.g. VM3/failed)', type: 'string' })
            .option('match', { describe: 'Substring filter on workpiece id', type: 'string' })
            .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
          withSeparator(listWorkpiecesHandler),
        )
        .command(
          'show [id]',
          'Deep view of one workpiece (substring matching >1 promotes to dashboard)',
          (yargs) => {
            return yargs
              .positional('id', { describe: 'Workpiece id (exact or substring)', type: 'string' })
              .option('json', { describe: 'Output raw JSON', type: 'boolean' });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob workpieces show <id-or-substring>');
              console.error('Run "fob workpieces list" to see workpieces on disk.');
              console.error('For live tail, use "fob workpieces watch <id>".');
              process.exit(1);
            }
            return withSeparator(showWorkpieceHandler)(argv);
          },
        )
        .command(
          'watch [id]',
          'Live tail: bin transitions and new log events as they happen',
          (yargs) => {
            return yargs
              .positional('id', { describe: 'Workpiece id (exact or substring)', type: 'string' })
              .option('line', { describe: 'Scope to a single line (mutually exclusive with --bin/--match)', type: 'string' })
              .option('bin', { describe: 'Scope to a specific bin (STATION/BIN)', type: 'string' })
              .option('match', { describe: 'Substring filter on workpiece id', type: 'string' })
              .option('interval', { describe: 'Poll interval in seconds (default 2)', type: 'number' });
          },
          withSeparator(watchHandler),
        )
        .demandCommand(1, 'Specify an action: list, show, watch');
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
              })
              .option('tag', {
                describe: 'Filter by tag name',
                type: 'string',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
              });
          },
          withSeparator(listWorkRecordsHandler)
        )
        .command(
          'show [id]',
          'Show work record details',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Work record ID',
                type: 'string',
              })
              .option('report', {
                describe: 'Include report',
                type: 'boolean',
              })
              .option('supporting-docs', {
                describe: 'List supporting documents',
                type: 'boolean',
              })
              .option('steps', {
                describe: 'Include step outputs',
                type: 'boolean',
              })
              .option('activity', {
                describe: 'Include activity log',
                type: 'boolean',
              })
              .option('all', {
                describe: 'Include all sections',
                type: 'boolean',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
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
        .command(
          'cancel [id]',
          'Cancel a running work record',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Work record ID',
                type: 'string',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob work-records cancel <id>');
              console.error('Run "fob work-records list" to see recent records');
              process.exit(1);
            }
            return withSeparator(cancelWorkRecordHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: list, show, edit, cancel');
    })
    .command('items', 'Work with orchestrator items', (yargs) => {
      return yargs
        .usage('$0 items <action> [options]')
        .command(
          'list',
          'List items',
          (yargs) => {
            return yargs
              .option('type', {
                alias: 't',
                describe: 'Filter by item type (e.g., msa_file, invoice)',
                type: 'string',
              })
              .option('status', {
                alias: 's',
                describe: 'Filter by status',
                type: 'string',
              })
              .option('tag', {
                describe: 'Filter by tag name',
                type: 'string',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
              });
          },
          withSeparator(listItemsHandler)
        )
        .command(
          'show [id]',
          'Show item details',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Item ID',
                type: 'string',
              })
              .option('processes', {
                describe: 'Include configured processes',
                type: 'boolean',
              })
              .option('work-records', {
                describe: 'Include execution history',
                type: 'boolean',
              })
              .option('all', {
                describe: 'Include all linked entities',
                type: 'boolean',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob items show <id>');
              console.error('Run "fob items list" to see available items');
              process.exit(1);
            }
            return withSeparator(showItemHandler)(argv);
          }
        )
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
        .demandCommand(1, 'Specify an action: list, show, edit');
    })
    .command('supporting-docs', 'Work with supporting documents', (yargs) => {
      return yargs
        .usage('$0 supporting-docs <action> [options]')
        .command(
          'show [id]',
          'Show supporting document content',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Supporting document ID',
                type: 'string',
              })
              .option('save', {
                describe: 'Download binary file to this path',
                type: 'string',
              })
              .option('json', {
                describe: 'Output raw JSON',
                type: 'boolean',
              });
          },
          (argv) => {
            if (argv.getYargsCompletions) return;
            if (!argv.id) {
              console.error('Usage: fob supporting-docs show <id>');
              process.exit(1);
            }
            return withSeparator(showSupportingDocHandler)(argv);
          }
        )
        .demandCommand(1, 'Specify an action: show');
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
          'edit [id]',
          'Edit a tag',
          (yargs) => {
            return yargs
              .positional('id', {
                describe: 'Tag ID',
                type: 'string',
              })
              .option('name', {
                describe: 'New tag name',
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
            if (!argv.id) {
              console.error('Usage: fob tags edit <id> [--name "..."] [--color "#hex"] [--description "..."]');
              console.error('Run "fob tags list" to see available tags');
              process.exit(1);
            }
            return withSeparator(editTagHandler)(argv);
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
        .demandCommand(1, 'Specify an action: list, create, edit, delete');
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
        return ['steps', 'config', 'processes', 'stations', 'lines', 'workpieces', 'items', 'work-records', 'tags', 'supporting-docs', 'worker'];
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

      // Processes / Stations action level completions (fob processes <tab>, fob stations <tab>)
      if (args[0] === 'processes' || args[0] === 'stations') {
        if (args.length === 1) {
          return ['list', 'show', 'status', 'run', 'pull', 'push', 'edit', 'update-step-metadata'];
        }
        return [];
      }

      // Lines action level completions (fob lines <tab>)
      if (args[0] === 'lines') {
        if (args.length === 1) {
          return ['list', 'show', 'status'];
        }
        return [];
      }

      // Workpieces action level completions (fob workpieces <tab>)
      if (args[0] === 'workpieces') {
        if (args.length === 1) {
          return ['list', 'show', 'watch'];
        }
        return [];
      }

      // Work-records action level completions (fob work-records <tab>)
      if (args[0] === 'work-records') {
        if (args.length === 1) {
          return ['list', 'show', 'edit', 'cancel'];
        }
        return [];
      }

      // Items action level completions (fob items <tab>)
      if (args[0] === 'items') {
        if (args.length === 1) {
          return ['list', 'show', 'edit'];
        }
        return [];
      }

      // Supporting-docs action level completions (fob supporting-docs <tab>)
      if (args[0] === 'supporting-docs') {
        if (args.length === 1) {
          return ['show'];
        }
        return [];
      }

      // Tags action level completions (fob tags <tab>)
      if (args[0] === 'tags') {
        if (args.length === 1) {
          return ['list', 'create', 'edit', 'delete'];
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
    .demandCommand(1, 'Specify a resource: steps, config, processes, stations, lines, workpieces, items, work-records, supporting-docs, tags, worker')
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
