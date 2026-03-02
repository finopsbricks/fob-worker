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
 * @returns {{ stepsPath: string, tempDir: string }}
 */
export function loadConfig() {
  const cwd = process.cwd();
  return {
    stepsPath: path.resolve(cwd, './src/steps/index.js'),
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

function maskSecret(value) {
  if (!value) return undefined;
  if (value.length <= 15) return '***';
  const masked = value.length - 10 - 5;
  return `${value.slice(0, 10)}${'*'.repeat(masked)}${value.slice(-5)}`;
}

/**
 * Get relevant environment variables for display
 */
export function getRelevantEnvVars() {
  return {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
    STEP_PREFIX: process.env.STEP_PREFIX,
    ORCHESTRATOR_API_KEY: maskSecret(process.env.ORCHESTRATOR_API_KEY),
    ORCHESTRATOR_API_SECRET: maskSecret(process.env.ORCHESTRATOR_API_SECRET),
  };
}
