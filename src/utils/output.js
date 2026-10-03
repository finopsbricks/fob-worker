/**
 * Step output file management
 *
 * Saves and loads step outputs to/from temp directory.
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert step slug to filename
 * acme/fetch_account_freshness -> acme__fetch_account_freshness.json
 * @param {string} slug
 * @returns {string}
 */
export function slugToFilename(slug) {
  return slug.replace(/\//g, '__') + '.json';
}

/**
 * Convert step slug to config filename
 * acme/send_email -> acme__send_email.config.json
 * @param {string} slug
 * @returns {string}
 */
export function slugToConfigFilename(slug) {
  return slug.replace(/\//g, '__') + '.config.json';
}

/**
 * Load step output from temp directory
 * @param {string} tempDir - Temp directory path
 * @param {string} slug - Step slug
 * @returns {object|null} Step output or null if not found
 */
export function loadStepOutput(tempDir, slug) {
  const filename = slugToFilename(slug);
  const filepath = path.join(tempDir, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * Save step output to temp directory
 * @param {string} tempDir - Temp directory path
 * @param {string} slug - Step slug
 * @param {object} data - Step output data
 * @returns {string} Saved filepath
 */
export function saveStepOutput(tempDir, slug, data) {
  const filename = slugToFilename(slug);
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

/**
 * Load step config from temp directory
 * @param {string} tempDir - Temp directory path
 * @param {string} slug - Step slug
 * @returns {object|null} Config object or null if not found
 */
export function loadStepConfig(tempDir, slug) {
  const filename = slugToConfigFilename(slug);
  const filepath = path.join(tempDir, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * Convert filename back to step slug
 * acme__fetch_account_freshness.json -> acme/fetch_account_freshness
 * @param {string} filename
 * @returns {string}
 */
export function filenameToSlug(filename) {
  return filename.replace('.json', '').replace(/__/g, '/');
}

/**
 * Load all step outputs from temp directory as a map
 * Returns: { 'acme/fetch_data': {...}, 'acme/generate_email': {...} }
 * @param {string} tempDir - Temp directory path
 * @returns {Object<string, object>} Map of slug -> output
 */
export function loadAllStepOutputs(tempDir) {
  if (!fs.existsSync(tempDir)) {
    return {};
  }

  const outputs = {};
  const files = fs.readdirSync(tempDir).filter(f =>
    f.endsWith('.json') && !f.endsWith('.config.json')
  );

  for (const file of files) {
    const slug = filenameToSlug(file);
    const filepath = path.join(tempDir, file);
    try {
      outputs[slug] = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      // Skip invalid JSON files
      console.warn(`Warning: Could not parse ${file}`);
    }
  }

  return outputs;
}
