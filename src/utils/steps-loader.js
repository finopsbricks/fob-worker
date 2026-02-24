/**
 * Steps registry loader
 *
 * Dynamically imports steps from the worker's steps index.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Parse index file to extract slug -> file path mappings
 * @param {string} stepsPath - Absolute path to steps index file
 * @returns {object} Map of slug to relative file path
 */
function parseStepFileMappings(stepsPath) {
  const content = fs.readFileSync(stepsPath, 'utf8');
  const stepsDir = path.dirname(stepsPath);

  // Extract imports: import name from './path.js'
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports = {};
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports[match[1]] = match[2];
  }

  // Extract step mappings: 'org/step_name': importName
  const mappingRegex = /['"]([^'"]+\/[^'"]+)['"]\s*:\s*(\w+)/g;
  const mappings = {};
  while ((match = mappingRegex.exec(content)) !== null) {
    const slug = match[1];
    const importName = match[2];
    if (imports[importName]) {
      mappings[slug] = imports[importName];
    }
  }

  return mappings;
}

/**
 * Load steps registry from the configured path
 * @param {string} stepsPath - Absolute path to steps index file
 * @returns {Promise<object>} Steps registry object with handlers and file mappings
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
 * Load steps with file path mappings
 * @param {string} stepsPath - Absolute path to steps index file
 * @returns {Promise<{steps: object, files: object}>}
 */
export async function loadStepsWithFiles(stepsPath) {
  const steps = await loadSteps(stepsPath);
  const files = parseStepFileMappings(stepsPath);
  return { steps, files };
}

/**
 * Check if a value is a StepDefinition (created with defineStep())
 * @param {any} value
 * @returns {boolean}
 */
function isStepDefinition(value) {
  return value && value.__isStepDefinition === true && typeof value.execute === 'function';
}

/**
 * Create a task handler from a StepDefinition.
 * Wraps execute() with input/output validation.
 * @param {object} definition - StepDefinition object
 * @returns {Function} Handler function
 */
function createHandler(definition) {
  const { slug, inputSchema, outputSchema, execute } = definition;

  return async function handler(task) {
    const { step, work_record, step_queue_id, org_id } = task;
    const raw_config = step.config || {};

    // --- Input validation ---
    let config = raw_config;
    if (inputSchema) {
      const result = inputSchema.safeParse(raw_config);
      if (!result.success) {
        const errors = result.error.issues
          .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
          .join('\n');
        throw new Error(`[${slug}] Invalid input config:\n${errors}`);
      }
      config = result.data;
    }

    // --- Build context ---
    const context = {
      work_record,
      step_queue_id,
      org_id,
      step,
    };

    // --- Execute ---
    const output = await execute(config, context);

    // --- Output validation ---
    if (outputSchema) {
      const result = outputSchema.safeParse(output);
      if (!result.success) {
        const errors = result.error.issues
          .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
          .join('\n');
        throw new Error(`[${slug}] Invalid output:\n${errors}`);
      }
      return result.data;
    }

    return output;
  };
}

/**
 * Get handler for a step slug.
 * @param {object} steps - Steps registry
 * @param {string} slug - Step slug (e.g., 'alex/fetch_account_freshness')
 * @returns {Function|null} Step handler function
 */
export function getHandler(steps, slug) {
  const step = steps[slug];

  if (!step) {
    return null;
  }

  if (!isStepDefinition(step)) {
    throw new Error(
      `Step "${slug}" must be a StepDefinition created with defineStep(). ` +
        `Plain function handlers are no longer supported.`
    );
  }

  return createHandler(step);
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
