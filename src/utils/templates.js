/**
 * Template resolution for step configs
 *
 * Resolves {{env.VAR}} and {{step/slug.field}} patterns.
 */

import { loadStepOutput } from './output.js';

/**
 * Resolve template variables in a config object
 * @param {object} config - Config object with template variables
 * @param {string} tempDir - Temp directory for loading step outputs
 * @returns {object} Config with resolved values
 */
export function resolveTemplates(config, tempDir) {
  if (!config) return config;

  const resolve = (value) => {
    if (typeof value !== 'string') return value;

    return value.replace(/\{\{([^}]+)\}\}/g, (match, templatePath) => {
      const parts = templatePath.trim().split('.');

      // Environment variable: {{env.VAR_NAME}}
      if (parts[0] === 'env') {
        const envVar = parts.slice(1).join('.');
        const envValue = process.env[envVar];
        if (envValue === undefined) {
          console.warn(`   Warning: env.${envVar} is not set`);
          return match;
        }
        return envValue;
      }

      // Step output reference: {{acme/step_name.field}} or {{acme/step_name.nested.field}}
      // The slug contains '/', so we need to find where the slug ends and field begins
      const fullPath = templatePath.trim();

      // Find the slug by looking for pattern: org/step_name
      const slashIndex = fullPath.indexOf('/');
      if (slashIndex === -1) {
        console.warn(`   Warning: Could not resolve {{${templatePath}}}`);
        return match;
      }

      // Find the first dot after the slash to separate slug from field
      const dotAfterSlash = fullPath.indexOf('.', slashIndex);
      if (dotAfterSlash === -1) {
        console.warn(`   Warning: Could not resolve {{${templatePath}}} - missing field`);
        return match;
      }

      const slug = fullPath.substring(0, dotAfterSlash);
      const fieldPath = fullPath.substring(dotAfterSlash + 1).split('.');

      const stepOutput = loadStepOutput(tempDir, slug);
      if (!stepOutput) {
        console.warn(`   Warning: No output found for step ${slug}`);
        return match;
      }

      // Navigate to the field
      let result = stepOutput;
      for (const field of fieldPath) {
        result = result?.[field];
      }

      if (result === undefined) {
        console.warn(`   Warning: Field "${fieldPath.join('.')}" not found in ${slug} output`);
        return match;
      }

      return result;
    });
  };

  // Deep resolve all string values in config
  const resolveDeep = (obj) => {
    if (typeof obj === 'string') return resolve(obj);
    if (Array.isArray(obj)) return obj.map(resolveDeep);
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = resolveDeep(value);
      }
      return result;
    }
    return obj;
  };

  return resolveDeep(config);
}
