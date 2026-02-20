/**
 * CLI entry point and command router
 *
 * Pattern: fob <resource> <action> [target] [options]
 */

import { stepsResource } from './commands/steps/index.js';

const RESOURCES = {
  steps: stepsResource,
};

function showHelp() {
  console.log(`
fob - FinOpsBricks Developer CLI

Usage:
  fob <resource> <action> [target] [options]

Resources:
  steps          Work with step handlers

Examples:
  fob steps list                              List available steps
  fob steps run alex/fetch_account_freshness  Run a step locally

Run "fob <resource>" to see available actions for that resource.
`);
}

export async function run(args) {
  const resource = args[0];

  if (!resource || resource === 'help' || resource === '--help' || resource === '-h') {
    showHelp();
    process.exit(0);
  }

  const handler = RESOURCES[resource];

  if (!handler) {
    console.error(`Unknown resource: ${resource}`);
    console.error('Run "fob help" for available resources');
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
