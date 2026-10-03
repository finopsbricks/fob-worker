/**
 * Configuration
 *
 * Convention-based paths resolved relative to cwd.
 * No config file — all worker repos follow the same structure.
 */

import fs from 'fs';
import path from 'path';

/**
 * Resolve convention-based paths for the current worker repo
 * @returns {{ stepsDir: string, tempDir: string }}
 */
export function loadConfig() {
  const cwd = process.cwd();
  return {
    stepsDir: path.resolve(cwd, './src/steps'),
    tempDir: path.resolve(cwd, './temp'),
  };
}

/**
 * Ensure temp directory exists
 * @param {string} tempDir
 */
export function ensureTempDir(tempDir) {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

/** Never show any part of a credential: only whether it is set. */
function maskSecret(value) {
  if (!value) return undefined;
  return '*** (set)';
}

/**
 * Get relevant environment variables for display
 */
export function getRelevantEnvVars() {
  return {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
    WORKER_LOCATION: process.env.WORKER_LOCATION,
    ORCHESTRATOR_API_KEY: maskSecret(process.env.ORCHESTRATOR_API_KEY),
    ORCHESTRATOR_API_SECRET: maskSecret(process.env.ORCHESTRATOR_API_SECRET),
  };
}
