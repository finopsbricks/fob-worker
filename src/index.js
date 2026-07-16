/**
 * @fob/cli-fob
 *
 * Developer CLI for FinOpsBricks workers.
 *
 * Primary usage is via the `fob` command line tool.
 * This module exports utilities for programmatic use if needed.
 */

export { run } from './cli.js';
export { loadConfig } from './utils/config.js';
export { loadSteps } from './utils/steps-loader.js';
export { resolveTemplates } from './utils/templates.js';
