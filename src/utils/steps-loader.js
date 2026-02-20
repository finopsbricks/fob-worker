/**
 * Steps registry loader
 *
 * Dynamically imports steps from the worker's steps index.
 */

import fs from 'fs';
import { pathToFileURL } from 'url';

/**
 * Load steps registry from the configured path
 * @param {string} stepsPath - Absolute path to steps index file
 * @returns {Promise<object>} Steps registry object
 */
export async function loadSteps(stepsPath) {
  if (!fs.existsSync(stepsPath)) {
    throw new Error(`Steps file not found: ${stepsPath}`);
  }

  // Convert to file URL for dynamic import (required for Windows compatibility)
  const stepsUrl = pathToFileURL(stepsPath).href;

  const module = await import(stepsUrl);

  if (!module.steps) {
    throw new Error(`Steps file must export "steps" object: ${stepsPath}`);
  }

  return module.steps;
}

/**
 * Get handler for a step slug
 * @param {object} steps - Steps registry
 * @param {string} slug - Step slug (e.g., 'alex/fetch_account_freshness')
 * @returns {Function|null} Step handler function
 */
export function getHandler(steps, slug) {
  return steps[slug] || null;
}

/**
 * Find previous step in registry (same org prefix)
 * @param {object} steps - Steps registry
 * @param {string} currentSlug - Current step slug
 * @returns {string|null} Previous step slug
 */
export function findPreviousStep(steps, currentSlug) {
  const slugs = Object.keys(steps);
  const currentIndex = slugs.indexOf(currentSlug);

  if (currentIndex <= 0) return null;

  // Look for previous step with same org prefix
  const prefix = currentSlug.split('/')[0];
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (slugs[i].startsWith(prefix + '/')) {
      return slugs[i];
    }
  }

  return null;
}
