/**
 * CLI entry point and command router
 */

import { runStep } from './commands/step.js';
import { listSteps } from './commands/steps.js';

const COMMANDS = {
  step: runStep,
  steps: listSteps,
};

function showHelp() {
  console.log(`
fob - FinOpsBricks Developer CLI

Usage:
  fob <command> [arguments]

Commands:
  step <slug>    Run a step locally (e.g., fob step alex/fetch_account_freshness)
  steps          List available steps in current worker
  help           Show this help message

Configuration:
  Place .fob.json in your worker directory to customize paths:
  {
    "stepsPath": "./src/steps/index.js",
    "tempDir": "./temp"
  }
`);
}

export async function run(args) {
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const handler = COMMANDS[command];

  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "fob help" for available commands');
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
