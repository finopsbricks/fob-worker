/**
 * Configuration loader
 *
 * Loads .fob.json from current working directory, falls back to defaults.
 */

import fs from 'fs';
import path from 'path';

const DEFAULTS = {
  stepsPath: './src/steps/index.js',
  tempDir: './temp',
};

/**
 * Load configuration from .fob.json or use defaults
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

  const config = {
    ...DEFAULTS,
    ...userConfig,
  };

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
