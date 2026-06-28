/**
 * CLI entry point using yargs
 *
 * Pattern: fob <resource> <action> [target] [options]
 */

import yargs from 'yargs';
import 'dotenv/config';

import { showConfigHandler } from './config/show.js';
import { listStationsHandler } from './stations/list.js';
import { showStationHandler } from './stations/show.js';
import { runStationHandler } from './stations/run.js';
import { pullStationsHandler } from './stations/pull.js';
import { pushStationsHandler } from './stations/push.js';
import { updateStepMetadataHandler } from './stations/update-step-metadata.js';
import { listWorkRecordsHandler } from './work-records/list.js';
import { showWorkRecordHandler } from './work-records/show.js';
import { workerStatusHandler } from './worker/status.js';
import { listStepsHandler } from './steps/list.js';
import { runStepHandler } from './steps/run.js';
import { listTagsHandler } from './tags/list.js';
import { createTagHandler } from './tags/create.js';
import { deleteTagHandler } from './tags/delete.js';
import { editTagHandler } from './tags/edit.js';
import { editStationHandler } from './stations/edit.js';
import { deleteStationHandler } from './stations/delete.js';
import { unarchiveStationHandler } from './stations/unarchive.js';
import { listLinesHandler } from './lines/list.js';
import { showLineHandler } from './lines/show.js';
import { statusLineHandler } from './lines/status.js';
import { statusStationHandler } from './stations/status.js';
import { listWorkpiecesHandler } from './workpieces/list.js';
import { showWorkpieceHandler } from './workpieces/show.js';
import { watchHandler } from './workpieces/watch.js';
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
 * Build the subcommand tree for `fob stations`.
 */
function buildStationSubcommands(yargs) {
  return yargs
    .usage('$0 stations <action> [options]')
    .command(
      'list',
      'List stations from orchestrator',
      (yargs) => {
        return yargs
          .option('tag', { describe: 'Filter by tag name', type: 'string' })
          .option('line', { describe: 'Filter by line slug (e.g. VM, BR)', type: 'string' })
          .option('include-archived', { describe: 'Include archived stations', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' });
      },
      withSeparator(listStationsHandler),
    )
    .command(
      'show [id]',
      'Show station definition (config from .orchestrator/)',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('work-records', { describe: 'Include recent work records', type: 'boolean' })
          .option('all', { describe: 'Include all linked entities', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations show <id|short_code>');
          console.error('Run "fob stations list" to see available stations.');
          console.error('For live bin state, use "fob stations status <short_code>".');
          process.exit(1);
        }
        return withSeparator(showStationHandler)(argv);
      },
    )
    .command(
      'status [id]',
      'Snapshot of live bin state for one station (reads temp/stations/)',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station short_code (e.g. VM3)', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' })
          .option('watch', { alias: 'w', describe: 'Re-render on an interval (clear-screen between frames). Mutually exclusive with --json.', type: 'boolean' })
          .option('interval', { describe: 'Watch refresh interval in seconds (default 1)', type: 'number' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations status <short_code>');
          console.error('Pass the station short_code (e.g. VM3). Run "fob lines status" to see active lines.');
          process.exit(1);
        }
        return withSeparator(statusStationHandler)(argv);
      },
    )
    .command(
      'run [id]',
      'Trigger a remote station execution',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('item', { describe: 'Item ID to run the station on', type: 'string' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations run <id|short_code> --item <item-id>');
          process.exit(1);
        }
        return withSeparator(runStationHandler)(argv);
      },
    )
    .command(
      'pull [id]',
      'Pull stations from orchestrator to local files',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('all', { alias: 'a', describe: 'Pull all stations', type: 'boolean' });
      },
      withSeparator(pullStationsHandler),
    )
    .command(
      'push [id]',
      'Push local stations to orchestrator (creates new or updates existing)',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID (existing) or filename (new)', type: 'string' })
          .option('all', { alias: 'a', describe: 'Push all local stations (creates new + updates existing)', type: 'boolean' })
          .option('force', { alias: 'f', describe: "Create station if it doesn't exist remotely (upsert)", type: 'boolean' });
      },
      withSeparator(pushStationsHandler),
    )
    .command(
      'edit [id]',
      'Edit station properties (e.g., tags, short_code)',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('short-code', { describe: 'Set the station short_code (e.g., P1, P9b)', type: 'string' })
          .option('add-tag', { describe: 'Add tag by name (repeatable)', type: 'string', array: true })
          .option('remove-tag', { describe: 'Remove tag by name (repeatable)', type: 'string', array: true });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations edit <id|short_code> --short-code P1 --add-tag <name>');
          process.exit(1);
        }
        return withSeparator(editStationHandler)(argv);
      },
    )
    .command(
      'update-step-metadata',
      'Update step name/description in local stations from code',
      {},
      withSeparator(updateStepMetadataHandler),
    )
    .command(
      'delete [id]',
      'Delete a station (interactive: preview, confirm, choose archive/cascade)',
      (yargs) => {
        return yargs
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('archive', { describe: 'Archive instead of delete (preserves history)', type: 'boolean' })
          .option('force-delete', { describe: 'Skip the choose-action prompt; cascade if work records exist', type: 'boolean' })
          .option('yes', { alias: 'y', describe: 'Skip the type-the-short-code guard (still respects --archive)', type: 'boolean' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations delete <id|short_code> [--archive | --force-delete]');
          console.error('Run "fob stations list" to see available stations.');
          process.exit(1);
        }
        return withSeparator(deleteStationHandler)(argv);
      },
    )
    .command(
      'unarchive [id]',
      'Restore an archived station (does not auto-re-enable schedule)',
      (yargs) => {
        return yargs.positional('id', { describe: 'Station ID or short_code', type: 'string' });
      },
      (argv) => {
        if (argv.getYargsCompletions) return;
        if (!argv.id) {
          console.error('Usage: fob stations unarchive <id|short_code>');
          console.error('Run "fob stations list --include-archived" to see archived stations.');
          process.exit(1);
        }
        return withSeparator(unarchiveStationHandler)(argv);
      },
    )
    .demandCommand(1, 'Specify an action: list, show, status, run, pull, push, edit, delete, unarchive, update-step-metadata');
}

/**
 * Build and run CLI
 */
export function run(args) {
  const cli = yargs(args)
    .scriptName('fob')
    .usage('$0 <resource> <action> [options]')
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
              .option('json', { describe: 'Output raw JSON', type: 'boolean' })
              .option('watch', { alias: 'w', describe: 'Re-render on an interval (clear-screen between frames). Mutually exclusive with --json.', type: 'boolean' })
              .option('interval', { describe: 'Watch refresh interval in seconds (default 1)', type: 'number' });
          },
          withSeparator(statusLineHandler),
        )
        .demandCommand(1, 'Specify an action: list, show, status');
    })
    .command('stations', 'Work with orchestrator stations', (yargs) =>
      buildStationSubcommands(yargs),
    )
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
              .option('station', {
                describe: 'Use config from this station',
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
              .option('station', {
                describe: 'Filter by station ID',
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
    .command('config', 'Show CLI configuration', (yargs) => {
      return yargs
        .usage('$0 config <action>')
        .command('show', 'Show resolved paths and environment variables', {}, withSeparator(showConfigHandler))
        .demandCommand(1, 'Specify an action: show');
    })
    .completion('completion', 'Generate shell completion script', function (current, argv) {
      // argv._ includes the script name 'fob' as first element
      const args = argv._.slice(1).filter(a => a !== '');

      // Resource level completions (fob <tab>)
      if (args.length === 0) {
        return ['lines', 'stations', 'steps', 'workpieces', 'work-records', 'supporting-docs', 'tags', 'worker', 'config'];
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

      // Stations action level completions (fob stations <tab>)
      if (args[0] === 'stations') {
        if (args.length === 1) {
          return ['list', 'show', 'status', 'run', 'pull', 'push', 'edit', 'delete', 'unarchive', 'update-step-metadata'];
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
    .demandCommand(1, 'Specify a resource: lines, stations, steps, workpieces, work-records, supporting-docs, tags, worker, config')
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
