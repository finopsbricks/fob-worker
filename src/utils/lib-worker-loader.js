/**
 * lib-worker Loader
 *
 * Dynamically imports @fob/lib-worker from the worker's node_modules
 * (not the CLI's own copy). This ensures a single module instance is
 * shared between CLI code and step handlers, avoiding dual-instance
 * state bugs (e.g. initTemplates setting state on one copy while
 * renderTemplate reads from another).
 *
 * Usage:
 *   // Async — first call loads and caches the module
 *   const libWorker = await loadLibWorker();
 *   const { initTemplates, resolveConfig } = libWorker;
 *
 *   // Sync — returns cached module (throws if not yet loaded)
 *   const { createHandler } = getLibWorker();
 */

import path from 'path';
import { pathToFileURL } from 'url';

let cached = null;

/**
 * Load @fob/lib-worker from the worker's node_modules.
 * Caches the module — subsequent calls return the same instance.
 *
 * @returns {Promise<object>} The lib-worker module exports
 */
export async function loadLibWorker() {
  if (cached) return cached;

  const workerRoot = process.cwd();
  const libWorkerEntry = path.join(workerRoot, 'node_modules', '@fob', 'lib-worker', 'src', 'index.js');
  const libWorkerUrl = pathToFileURL(libWorkerEntry).href;

  try {
    cached = await import(libWorkerUrl);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ENOENT') {
      console.error('@fob/lib-worker not found in this worker repo.');
      console.error(`Expected: ${libWorkerEntry}`);
      console.error('Run "npm install" in your worker repo first.');
      process.exit(1);
    }
    throw err;
  }

  return cached;
}

/**
 * Get the cached lib-worker module synchronously.
 * Must call loadLibWorker() first.
 *
 * @returns {object} The lib-worker module exports
 */
export function getLibWorker() {
  if (!cached) {
    throw new Error('lib-worker not loaded yet. Call loadLibWorker() first.');
  }
  return cached;
}
