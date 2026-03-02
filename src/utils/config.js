/**
 * Configuration loader
 *
 * Loads .fob.json from current working directory, falls back to defaults.
 * Environment variables override file config.
 */

import fs from 'fs';
import path from 'path';

const DEFAULTS = {
  stepsPath: './src/steps/index.js',
  tempDir: './temp',
};

/**
 * Get relevant environment variables for display
 */
export function getRelevantEnvVars() {
  return {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
    STEP_PREFIX: process.env.STEP_PREFIX,
    ORCHESTRATOR_API_KEY: process.env.ORCHESTRATOR_API_KEY ? '***' : undefined,
    ORCHESTRATOR_API_SECRET: process.env.ORCHESTRATOR_API_SECRET ? '***' : undefined,
  };
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Load raw config from .fob.json (for display purposes)
 */
export function loadRawConfig() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.fob.json');

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if .fob.json exists
 */
export function configFileExists() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.fob.json');
  return fs.existsSync(configPath);
}

/**
 * Write .fob.json
 */
export function writeConfig(config) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.fob.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return configPath;
}

/**
 * Load configuration from .fob.json or use defaults
 * Environment variables override file config.
 * @returns {object} Configuration object
 */
export function loadConfig() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.fob.json');

  let userConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not parse .fob.json: ${error.message}`);
    }
  }

  // Start with defaults, merge user config
  let config = deepMerge(DEFAULTS, userConfig);

  // Resolve paths relative to cwd
  config.stepsPath = path.resolve(cwd, config.stepsPath);
  config.tempDir = path.resolve(cwd, config.tempDir);

  return config;
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
