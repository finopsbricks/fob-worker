/**
 * Steps registry loader
 *
 * Discovers steps by scanning the worker's steps directory.
 * Uses lib-worker's discoverSteps() for filesystem-based discovery.
 */

import fs from 'fs';
import { loadLibWorker, getLibWorker } from './lib-worker-loader.js';
import { loadConfig } from './config.js';

/**
 * Load steps registry by discovering step files in the steps directory
 * @param {string} stepsDir - Absolute path to steps directory
 * @returns {Promise<object>} Steps registry object (slug → StepDefinition)
 */
export async function loadSteps(stepsDir) {
  if (!fs.existsSync(stepsDir)) {
    throw new Error(`Steps directory not found: ${stepsDir}`);
  }

  const libWorker = await loadLibWorker();
  return libWorker.discoverSteps(stepsDir);
}

/**
 * Load steps with file path mappings
 * @param {string} stepsDir - Absolute path to steps directory
 * @returns {Promise<{steps: object, files: object}>}
 */
export async function loadStepsWithFiles(stepsDir) {
  const steps = await loadSteps(stepsDir);
  return { steps, files: {} };
}

/**
 * Get handler for a step slug.
 * @param {object} steps - Steps registry
 * @param {string} slug - Step slug (e.g., 'alex/fetch_account_freshness')
 * @returns {Function|null} Step handler function
 */
export function getHandler(steps, slug) {
  const step = steps[slug];
  if (!step) return null;

  const { createHandler } = getLibWorker();
  return createHandler(step);
}

/**
 * Get step slugs for shell completion
 * @returns {Promise<string[]>} Array of step slugs
 */
export async function getStepSlugs() {
  try {
    const config = loadConfig();
    const steps = await loadSteps(config.stepsDir);
    return Object.keys(steps);
  } catch {
    return [];
  }
}

/**
 * Find previous step in registry (by discovery order)
 * @param {object} steps - Steps registry
 * @param {string} currentSlug - Current step slug
 * @returns {string|null} Previous step slug
 */
export function findPreviousStep(steps, currentSlug) {
  const slugs = Object.keys(steps);
  const currentIndex = slugs.indexOf(currentSlug);

  if (currentIndex <= 0) return null;
  return slugs[currentIndex - 1];
}
