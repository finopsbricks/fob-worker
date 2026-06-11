/**
 * Local station/process and scenario file management
 *
 * Two flat folder layouts are supported (CLI reads both):
 *   Legacy: .orchestrator/processes/<short_code>__<name>.json
 *   New:    .orchestrator/stations/<short_code>__<name>.json
 *
 * Line membership is encoded by the `line` field inside each JSON, not by folder
 * hierarchy — this avoids the redundant-data drift risk of nesting by line.
 *
 * Scenarios: .orchestrator/scenarios/<slug>/
 */

import fs from 'fs';
import path from 'path';

const PROCESSES_DIR = '.orchestrator/processes';
const STATIONS_DIR = '.orchestrator/stations';
const SCENARIOS_DIR = '.orchestrator/scenarios';

/**
 * Get all station/process JSON file paths from both legacy and new layouts.
 * @returns {string[]} Array of relative file paths
 */
function getAllStationFilePaths() {
  const paths = [];
  for (const dir of [PROCESSES_DIR, STATIONS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.json')) paths.push(path.join(dir, f));
    }
  }
  return paths;
}

/**
 * Ensure the processes directory exists
 */
function ensureProcessesDir() {
  if (!fs.existsSync(PROCESSES_DIR)) {
    fs.mkdirSync(PROCESSES_DIR, { recursive: true });
  }
}

/**
 * Convert process name to snake_case for filename
 * "Update Rules" -> "update_rules"
 * @param {string} name
 * @returns {string}
 */
function nameToSnakeCase(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Build filename for a process
 * Uses short_code as prefix when available, otherwise falls back to id.
 * @param {object} process - Process with id, name, and optionally short_code
 * @returns {string} Filename like "P1__discover_pending_msas.json" or "0flNNmVLV5Dg__update_rules.json"
 */
function buildFilename(process) {
  const snakeName = nameToSnakeCase(process.name || 'unnamed');
  const prefix = process.short_code || process.id;
  return `${prefix}__${snakeName}.json`;
}

/**
 * Find process file by ID or short_code (handles name changes and prefix migration)
 * @param {string} identifier - Process ID or short_code
 * @returns {string|null} Full filepath or null if not found
 */
export function findProcessFile(identifier) {
  const all = getAllStationFilePaths();

  // Try filename prefix match (works for both ID-prefixed and short_code-prefixed files)
  for (const p of all) {
    const filename = path.basename(p);
    if (filename.startsWith(`${identifier}__`)) return p;
  }

  // Fall back to JSON `id` field match (when file is short_code-prefixed and caller passed an id)
  for (const p of all) {
    try {
      const content = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (content.id === identifier) return p;
    } catch {
      // skip malformed files
    }
  }

  return null;
}

/**
 * Save a process/station to a local file.
 * Removes old files (in either layout) before writing.
 * @param {object} process - Process/station definition with id, name, and optionally short_code + line
 * @param {object} [options]
 * @param {'processes'|'stations'} [options.layout='processes'] - 'processes' → legacy `.orchestrator/processes/`; 'stations' → new `.orchestrator/stations/`
 * @returns {string} Saved filepath
 */
export function saveProcess(process, options = {}) {
  const { layout = 'processes' } = options;

  // Remove any existing files for this process (handles both layouts and both id/short_code prefix forms)
  const toRemove = new Set();
  const existingById = findProcessFile(process.id);
  if (existingById) toRemove.add(existingById);
  if (process.short_code) {
    const existingByCode = findProcessFile(process.short_code);
    if (existingByCode) toRemove.add(existingByCode);
  }
  for (const f of toRemove) {
    fs.unlinkSync(f);
  }

  const targetDir = layout === 'stations' ? STATIONS_DIR : PROCESSES_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = buildFilename(process);
  const filepath = path.join(targetDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(process, null, 2));
  return filepath;
}

/**
 * Load a process from local file by ID or short_code
 * @param {string} identifier - Process ID or short_code
 * @returns {object|null} Process definition or null if not found
 */
export function loadProcess(identifier) {
  const filepath = findProcessFile(identifier);

  if (!filepath) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * List all process/station JSON files from both layouts (legacy flat + new nested-by-line).
 * Returns relative paths so callers can distinguish location.
 * @returns {string[]} Array of relative paths (e.g. '.orchestrator/processes/foo.json' or '.orchestrator/stations/VM/foo.json')
 */
export function listAllProcessFiles() {
  return getAllStationFilePaths();
}

/**
 * List all locally saved process IDs (files whose JSON contains an `id` field)
 * @returns {string[]} Array of process IDs
 */
export function listLocalProcesses() {
  const ids = [];
  for (const p of getAllStationFilePaths()) {
    try {
      const content = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (content.id) ids.push(content.id);
    } catch {
      // skip malformed files
    }
  }
  return ids;
}

/**
 * Load every local station/process JSON, returning the parsed objects with their source paths.
 * Used by fob stations / fob lines to derive line topology from local files.
 * @returns {Array<{filepath: string, dir: string, line: string|null, data: object}>}
 */
export function listLocalStations() {
  const stations = [];
  for (const filepath of getAllStationFilePaths()) {
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      stations.push({
        filepath,
        dir: path.dirname(filepath),
        line: data.line ?? null,
        data,
      });
    } catch {
      // skip malformed files
    }
  }
  return stations;
}

/**
 * Load a process/station from a filename or relative path.
 * Accepts either a bare filename (searches both layouts by basename) or a relative path
 * (treats as direct path).
 * @param {string} arg - Bare filename (e.g. 'P1__foo.json') or path (e.g. '.orchestrator/stations/VM/foo.json')
 * @returns {object|null} Process definition or null if not found
 */
export function loadProcessByFilename(arg) {
  // Path form — use directly
  if (arg.includes(path.sep) || arg.includes('/')) {
    if (!fs.existsSync(arg)) return null;
    return JSON.parse(fs.readFileSync(arg, 'utf8'));
  }

  // Bare filename — search both layouts by basename
  for (const filepath of getAllStationFilePaths()) {
    if (path.basename(filepath) === arg) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  }
  return null;
}

/**
 * Write the server-assigned ID back into a new process/station file and rename it
 * to the standard naming format. Preserves the original file's directory so files
 * created in the new stations layout stay there.
 * @param {string} originalArg - Original bare filename or relative path
 * @param {object} process - Process with id, name, and optionally short_code (as returned by server)
 * @returns {string} New filepath
 */
export function finalizeNewProcessFile(originalArg, process) {
  // Locate the original file — accept either a path or a bare filename
  let originalPath;
  if (originalArg.includes(path.sep) || originalArg.includes('/')) {
    originalPath = originalArg;
  } else {
    originalPath = getAllStationFilePaths().find(p => path.basename(p) === originalArg)
      || path.join(PROCESSES_DIR, originalArg);
  }

  // Remove the original file
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Write the renamed file into the same directory as the original (defaults to legacy if it was missing)
  const targetDir = fs.existsSync(path.dirname(originalPath)) ? path.dirname(originalPath) : PROCESSES_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const newFilename = buildFilename(process);
  const newPath = path.join(targetDir, newFilename);
  fs.writeFileSync(newPath, JSON.stringify(process, null, 2));
  return newPath;
}

/**
 * Get step config from a process definition
 * @param {object} process - Process definition
 * @param {string} stepSlug - Step slug to find
 * @returns {object|null} Step config or null if step not found
 */
export function getStepConfigFromProcess(process, stepSlug) {
  const step = process.steps?.find(s => s.slug === stepSlug);
  return step?.config || null;
}

/**
 * Get the processes directory path (legacy flat layout)
 * @returns {string}
 */
export function getProcessesDir() {
  return PROCESSES_DIR;
}

/**
 * Get the stations directory path (new nested-by-line layout)
 * @returns {string}
 */
export function getStationsDir() {
  return STATIONS_DIR;
}

/**
 * Get the scenarios directory path
 * @returns {string}
 */
export function getScenariosDir() {
  return SCENARIOS_DIR;
}

// ============================================================================
// Process Discovery
// ============================================================================

/**
 * Find all local processes that contain a specific step
 * @param {string} stepSlug - Step slug to search for
 * @returns {Array<{id: string, name: string}>} Processes containing the step
 */
export function findProcessesWithStep(stepSlug) {
  const processIds = listLocalProcesses();
  const matches = [];

  for (const id of processIds) {
    const proc = loadProcess(id);
    if (proc?.steps?.some(s => s.slug === stepSlug)) {
      matches.push({ id: proc.id, name: proc.name });
    }
  }

  return matches;
}

// ============================================================================
// Scenario Management
// ============================================================================

/**
 * Convert step slug to scenario directory name
 * alex/send_email -> alex__send_email
 * @param {string} slug
 * @returns {string}
 */
function slugToScenarioDir(slug) {
  return slug.replace(/\//g, '__');
}

/**
 * Get scenario directory path for a step
 * @param {string} stepSlug
 * @returns {string}
 */
function getScenarioDirForStep(stepSlug) {
  return path.join(SCENARIOS_DIR, slugToScenarioDir(stepSlug));
}

/**
 * List all scenarios for a step
 * @param {string} stepSlug - Step slug
 * @returns {string[]} Array of scenario names (without .json extension)
 */
export function listScenarios(stepSlug) {
  const scenarioDir = getScenarioDirForStep(stepSlug);

  if (!fs.existsSync(scenarioDir)) {
    return [];
  }

  return fs.readdirSync(scenarioDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Load a scenario config
 * @param {string} stepSlug - Step slug
 * @param {string} scenarioName - Scenario name (without .json)
 * @returns {object|null} Scenario config or null if not found
 */
export function loadScenario(stepSlug, scenarioName) {
  const filepath = path.join(getScenarioDirForStep(stepSlug), `${scenarioName}.json`);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * Save a scenario config
 * @param {string} stepSlug - Step slug
 * @param {string} scenarioName - Scenario name
 * @param {object} config - Config to save
 * @returns {string} Saved filepath
 */
export function saveScenario(stepSlug, scenarioName, config) {
  const scenarioDir = getScenarioDirForStep(stepSlug);

  if (!fs.existsSync(scenarioDir)) {
    fs.mkdirSync(scenarioDir, { recursive: true });
  }

  const filepath = path.join(scenarioDir, `${scenarioName}.json`);
  fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
  return filepath;
}
