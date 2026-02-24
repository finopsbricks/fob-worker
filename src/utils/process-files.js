/**
 * Local process and scenario file management
 *
 * Processes: .orchestrator/processes/<id>__<name>.json
 * Scenarios: .orchestrator/scenarios/<slug>/
 */

import fs from 'fs';
import path from 'path';

const PROCESSES_DIR = '.orchestrator/processes';
const SCENARIOS_DIR = '.orchestrator/scenarios';

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
 * @param {object} process - Process with id and name
 * @returns {string} Filename like "0flNNmVLV5Dg__update_rules.json"
 */
function buildFilename(process) {
  const snakeName = nameToSnakeCase(process.name || 'unnamed');
  return `${process.id}__${snakeName}.json`;
}

/**
 * Extract process ID from filename
 * "0flNNmVLV5Dg__update_rules.json" -> "0flNNmVLV5Dg"
 * @param {string} filename
 * @returns {string}
 */
function extractIdFromFilename(filename) {
  const basename = filename.replace('.json', '');
  const parts = basename.split('__');
  return parts[0];
}

/**
 * Find process file by ID (handles name changes)
 * @param {string} id - Process ID
 * @returns {string|null} Full filepath or null if not found
 */
function findProcessFile(id) {
  if (!fs.existsSync(PROCESSES_DIR)) {
    return null;
  }

  const files = fs.readdirSync(PROCESSES_DIR);
  const match = files.find(f => f.startsWith(`${id}__`) && f.endsWith('.json'));
  return match ? path.join(PROCESSES_DIR, match) : null;
}

/**
 * Save a process to local file
 * Removes old file if name changed
 * @param {object} process - Process definition with id and name
 * @returns {string} Saved filepath
 */
export function saveProcess(process) {
  ensureProcessesDir();

  // Remove old file if exists (in case name changed)
  const existingFile = findProcessFile(process.id);
  if (existingFile) {
    fs.unlinkSync(existingFile);
  }

  const filename = buildFilename(process);
  const filepath = path.join(PROCESSES_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(process, null, 2));
  return filepath;
}

/**
 * Load a process from local file
 * @param {string} id - Process ID
 * @returns {object|null} Process definition or null if not found
 */
export function loadProcess(id) {
  const filepath = findProcessFile(id);

  if (!filepath) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * List all locally saved process IDs
 * @returns {string[]} Array of process IDs
 */
export function listLocalProcesses() {
  if (!fs.existsSync(PROCESSES_DIR)) {
    return [];
  }

  return fs.readdirSync(PROCESSES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(extractIdFromFilename);
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
 * Get the processes directory path
 * @returns {string}
 */
export function getProcessesDir() {
  return PROCESSES_DIR;
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
