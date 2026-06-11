/**
 * Local station and scenario file management
 *
 * Station files live in: .orchestrator/stations/<short_code>__<name>.json
 *
 * Legacy: prior to the station-vocabulary rename, files lived in
 * .orchestrator/processes/. Reads still fall back to that directory so
 * existing worker repos keep working; writes always go to .orchestrator/stations/.
 *
 * Line membership is encoded by the `line` field inside each JSON, not by folder
 * hierarchy — this avoids the redundant-data drift risk of nesting by line.
 *
 * Scenarios: .orchestrator/scenarios/<slug>/
 */

import fs from 'fs';
import path from 'path';

const STATIONS_DIR = '.orchestrator/stations';
const LEGACY_DIR = '.orchestrator/processes';
const SCENARIOS_DIR = '.orchestrator/scenarios';

/**
 * Get all station JSON file paths from the new and legacy layouts.
 * @returns {string[]} Array of relative file paths
 */
function getAllStationFilePaths() {
  const paths = [];
  for (const dir of [STATIONS_DIR, LEGACY_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.json')) paths.push(path.join(dir, f));
    }
  }
  return paths;
}

/**
 * Convert a station name to snake_case for filenames
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
 * Build a filename for a station.
 * Uses short_code as prefix when available, otherwise falls back to id.
 * @param {object} station - Station with id, name, and optionally short_code
 * @returns {string} Filename like "P1__discover_pending_msas.json" or "0flNNmVLV5Dg__update_rules.json"
 */
function buildFilename(station) {
  const snakeName = nameToSnakeCase(station.name || 'unnamed');
  const prefix = station.short_code || station.id;
  return `${prefix}__${snakeName}.json`;
}

/**
 * Find a station file by ID or short_code (handles name changes and prefix migration).
 * @param {string} identifier - Station ID or short_code
 * @returns {string|null} Full filepath or null if not found
 */
export function findStationFile(identifier) {
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
 * Save a station to a local file under .orchestrator/stations/.
 * Removes any existing file for this station (in either the new or legacy layout) before writing.
 * @param {object} station - Station definition with id, name, and optionally short_code + line
 * @returns {string} Saved filepath
 */
export function saveStation(station) {
  // Remove any existing files for this station (handles both layouts and both id/short_code prefix forms)
  const toRemove = new Set();
  const existingById = findStationFile(station.id);
  if (existingById) toRemove.add(existingById);
  if (station.short_code) {
    const existingByCode = findStationFile(station.short_code);
    if (existingByCode) toRemove.add(existingByCode);
  }
  for (const f of toRemove) {
    fs.unlinkSync(f);
  }

  if (!fs.existsSync(STATIONS_DIR)) {
    fs.mkdirSync(STATIONS_DIR, { recursive: true });
  }

  const filename = buildFilename(station);
  const filepath = path.join(STATIONS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(station, null, 2));
  return filepath;
}

/**
 * Load a station from a local file by ID or short_code.
 * @param {string} identifier - Station ID or short_code
 * @returns {object|null} Station definition or null if not found
 */
export function loadStation(identifier) {
  const filepath = findStationFile(identifier);

  if (!filepath) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * List all station JSON files from both new and legacy layouts.
 * @returns {string[]} Array of relative paths
 */
export function listAllStationFiles() {
  return getAllStationFilePaths();
}

/**
 * List all locally saved station IDs (files whose JSON contains an `id` field).
 * @returns {string[]} Array of station IDs
 */
export function listLocalStationIds() {
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
 * Load every local station JSON, returning the parsed objects with their source paths.
 * Used by `fob stations` / `fob lines` to derive line topology from local files.
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
 * Load a station from a filename or relative path.
 * Accepts either a bare filename (searches both layouts by basename) or a relative path
 * (treats as direct path).
 * @param {string} arg - Bare filename (e.g. 'P1__foo.json') or path (e.g. '.orchestrator/stations/foo.json')
 * @returns {object|null} Station definition or null if not found
 */
export function loadStationByFilename(arg) {
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
 * Write the server-assigned ID back into a new station file and rename it
 * to the standard naming format. New files always land in `.orchestrator/stations/`
 * even if the original draft lived in the legacy directory.
 * @param {string} originalArg - Original bare filename or relative path
 * @param {object} station - Station with id, name, and optionally short_code (as returned by server)
 * @returns {string} New filepath
 */
export function finalizeNewStationFile(originalArg, station) {
  // Locate the original file — accept either a path or a bare filename
  let originalPath;
  if (originalArg.includes(path.sep) || originalArg.includes('/')) {
    originalPath = originalArg;
  } else {
    originalPath = getAllStationFilePaths().find(p => path.basename(p) === originalArg)
      || path.join(STATIONS_DIR, originalArg);
  }

  // Remove the original file
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  if (!fs.existsSync(STATIONS_DIR)) {
    fs.mkdirSync(STATIONS_DIR, { recursive: true });
  }

  const newFilename = buildFilename(station);
  const newPath = path.join(STATIONS_DIR, newFilename);
  fs.writeFileSync(newPath, JSON.stringify(station, null, 2));
  return newPath;
}

/**
 * Get step config from a station definition.
 * @param {object} station - Station definition
 * @param {string} stepSlug - Step slug to find
 * @returns {object|null} Step config or null if step not found
 */
export function getStepConfigFromStation(station, stepSlug) {
  const step = station.steps?.find(s => s.slug === stepSlug);
  return step?.config || null;
}

/**
 * Get the stations directory path.
 * @returns {string}
 */
export function getStationsDir() {
  return STATIONS_DIR;
}

/**
 * Get the scenarios directory path.
 * @returns {string}
 */
export function getScenariosDir() {
  return SCENARIOS_DIR;
}

// ============================================================================
// Station Discovery
// ============================================================================

/**
 * Find all local stations that contain a specific step.
 * @param {string} stepSlug - Step slug to search for
 * @returns {Array<{id: string, name: string}>} Stations containing the step
 */
export function findStationsWithStep(stepSlug) {
  const stationIds = listLocalStationIds();
  const matches = [];

  for (const id of stationIds) {
    const station = loadStation(id);
    if (station?.steps?.some(s => s.slug === stepSlug)) {
      matches.push({ id: station.id, name: station.name });
    }
  }

  return matches;
}

// ============================================================================
// Scenario Management
// ============================================================================

/**
 * Convert step slug to scenario directory name.
 * alex/send_email -> alex__send_email
 * @param {string} slug
 * @returns {string}
 */
function slugToScenarioDir(slug) {
  return slug.replace(/\//g, '__');
}

/**
 * Get scenario directory path for a step.
 * @param {string} stepSlug
 * @returns {string}
 */
function getScenarioDirForStep(stepSlug) {
  return path.join(SCENARIOS_DIR, slugToScenarioDir(stepSlug));
}

/**
 * List all scenarios for a step.
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
 * Load a scenario config.
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
 * Save a scenario config.
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
