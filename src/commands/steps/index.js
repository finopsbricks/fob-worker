/**
 * Steps resource handler
 *
 * Routes: fob steps <action> [target]
 */

import { listSteps } from './list.js';
import { runStep } from './run.js';

const ACTIONS = {
  list: listSteps,
  run: runStep,
};

function showHelp() {
  console.log(`
fob steps - Work with step handlers

Usage:
  fob steps <action> [target]

Actions:
  list                    List available steps in current worker
  run <slug>              Run a step locally

Examples:
  fob steps list
  fob steps run alex/fetch_account_freshness
`);
}

export async function stepsResource(args) {
  const action = args[0];

  if (!action || action === 'help' || action === '--help' || action === '-h') {
    showHelp();
    process.exit(0);
  }

  const handler = ACTIONS[action];

  if (!handler) {
    console.error(`Unknown action: ${action}`);
    console.error('Run "fob steps" for available actions');
    process.exit(1);
  }

  await handler(args.slice(1));
}
