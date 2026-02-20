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
  orchestrator: {
    url: 'http://localhost:3000',
    org: null,
  },
};

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  ORCHESTRATOR_URL: 'orchestrator.url',
  WORKER_ORG: 'orchestrator.org',
};

/**
 * Get relevant environment variables for display
 */
export function getRelevantEnvVars() {
  return {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
    WORKER_ORG: process.env.WORKER_ORG,
    WORKER_SECRET: process.env.WORKER_SECRET ? '***' : undefined,
    FOB_TXN_API_URL: process.env.FOB_TXN_API_URL,
    TXN_ORG_ID: process.env.TXN_ORG_ID,
  };
}

/**
 * Set nested property by dot path
 */
function setByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
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

  // Apply environment variable overrides
  for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
    if (process.env[envVar]) {
      setByPath(config, configPath, process.env[envVar]);
    }
  }

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
