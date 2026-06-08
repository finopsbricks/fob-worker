/**
 * Line state — operational view of the assembly-line filesystem.
 *
 * Line topology is sourced from `.orchestrator/stations/*.json` (the `line` field
 * on each station is the authoritative line membership). Bin contents are read
 * from `temp/stations/{STATION}/{BIN}/{workpiece_id}/`.
 *
 * This module answers:
 *   - which lines exist (the distinct `line` values across local station JSONs)
 *   - how many workpieces sit in each bin of each station
 *   - where a given workpiece is right now (most-advanced live bin)
 *   - what events fired on its journey (parsed from log.jsonl)
 *
 * Mental model (see fde-handbook/patterns/structural/assembly-line-processing.md):
 *   - Live bins (workpiece's current location): input | doing | output | failed
 *   - Archive bin (receipt of a successful forward move): done — NOT a position
 *   - Position rule: walk stations terminal → source; at each, check
 *     output > doing > input > failed; first match wins. done ignored.
 */

import fs from 'node:fs';
import path from 'node:path';

import { listLocalStations } from './process-files.js';

const ALL_BINS = ['input', 'doing', 'output', 'failed', 'done'];
const LIVE_BINS = ['input', 'doing', 'output', 'failed'];
const LIVE_PRIORITY = ['output', 'doing', 'input', 'failed']; // most-advanced first

export { ALL_BINS, LIVE_BINS, LIVE_PRIORITY };

/**
 * @typedef {object} LineState
 * @property {string} code - 2-letter line code (e.g. 'VM')
 * @property {string[]} stations - Station codes sorted by numeric suffix
 * @property {string} terminal - Highest-numbered station code
 * @property {Object<string, Object<string, Set<string>|null>>} bins -
 *   bins[station][bin] is a Set of workpiece ids, or null if the bin
 *   directory does not exist on disk.
 */

/**
 * @typedef {object} Position
 * @property {string} line
 * @property {string} station
 * @property {string} bin
 * @property {boolean} terminal - true if station is the line's terminal
 * @property {boolean} [anomaly] - true when only present in done (not live)
 */

/**
 * Default stations_root: `temp/stations/` relative to cwd. The CLI runs from
 * a worker repo's root; that's where `temp/stations/` lives.
 */
export function defaultStationsRoot() {
  return path.resolve(process.cwd(), 'temp', 'stations');
}

/**
 * Build per-line operational state.
 *
 * Topology (line membership, station ordering, terminal) is derived from
 * `.orchestrator/stations/*.json` — the `line` field is the authoritative
 * grouping, and dependency edges drive topo ordering. Bin contents come from
 * `temp/stations/{station}/{bin}/`. Stations defined in JSON but with no on-disk
 * bin dirs render as `null` bins (— in the table); on-disk station dirs with no
 * matching JSON are ignored (they're orphans of a renamed/deleted station).
 *
 * @param {object} [opts]
 * @param {string} [opts.stations_root] - Override the default temp/stations path.
 * @returns {Object<string, LineState>} Lines keyed by the JSON `line` value.
 */
export function loadLineState({ stations_root = defaultStationsRoot() } = {}) {
  const station_defs = listLocalStations();

  /** @type {Map<string, Array>} */
  const grouped = new Map();
  for (const def of station_defs) {
    if (!def.line) continue; // station not assigned to any line — skip
    if (!grouped.has(def.line)) grouped.set(def.line, []);
    grouped.get(def.line).push(def);
  }

  /** @type {Object<string, LineState>} */
  const lines = {};
  for (const [line_code, members] of grouped) {
    const ordered = topoSortStations(members);
    const station_codes = ordered.map(codeOf);
    const terminal = computeTerminal(ordered);

    const bins = {};
    for (const station of station_codes) {
      bins[station] = {};
      for (const bin of ALL_BINS) {
        const dir = path.join(stations_root, station, bin);
        if (!fs.existsSync(dir)) { bins[station][bin] = null; continue; }
        const ids = fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
        bins[station][bin] = new Set(ids);
      }
    }

    lines[line_code] = { code: line_code, stations: station_codes, terminal, bins };
  }
  return lines;
}

/**
 * Stable code accessor for a station def — prefers short_code, falls back to id.
 * Exported so callers ordering station defs (lines/list, lines/show) agree on
 * what a station's "code" is.
 */
export const codeOf = (s) => s.data.short_code || s.data.id;

/**
 * Topologically sort station defs within a single line by their `dependencies`
 * edges. Exported and shared across `lines list`, `lines show`, and `lines
 * status` so all three present the same execution order.
 *
 * Dependencies may reference peers by short_code OR orchestrator id; we index
 * both forms to avoid silently dropping id-based edges (which would fall back
 * to alphabetical luck — fine for AP2..AP6 by accident, wrong for TR1 in AP).
 *
 * @param {Array<{data: object}>} members - Station defs (from listLocalStations)
 *   belonging to one line.
 * @returns {Array<{data: object}>} Same defs, ordered.
 */
export function topoSortStations(members) {
  const byRef = new Map();
  for (const s of members) {
    const code = codeOf(s);
    byRef.set(code, s);
    if (s.data.id) byRef.set(s.data.id, s);
    if (s.data.short_code) byRef.set(s.data.short_code, s);
  }

  const depsOf = (s) => (s.data.dependencies || [])
    .map((d) => (typeof d === 'string' ? d : d.short_code || d.id))
    .map((ref) => byRef.get(ref))
    .filter(Boolean);

  // Alphabetical pre-sort gives stable sibling order when topo has ties.
  const sorted = [...members].sort((a, b) => codeOf(a).localeCompare(codeOf(b)));
  const visited = new Set();
  const result = [];
  const visit = (s) => {
    const code = codeOf(s);
    if (visited.has(code)) return;
    visited.add(code);
    for (const dep of depsOf(s)) visit(dep);
    result.push(s);
  };
  for (const s of sorted) visit(s);
  return result;
}

/**
 * Terminal = station that no in-line peer depends on (sink of the DAG).
 * When the line has multiple sinks (rare — branching that never rejoins),
 * pick the one latest in topo order so summaries pick a stable "last".
 */
function computeTerminal(ordered) {
  if (ordered.length === 0) return '';
  const codes = new Set(ordered.map(codeOf));
  const idToCode = new Map();
  for (const s of ordered) {
    if (s.data.id) idToCode.set(s.data.id, codeOf(s));
  }

  const depended_on = new Set();
  for (const s of ordered) {
    for (const d of s.data.dependencies || []) {
      const ref = typeof d === 'string' ? d : d.short_code || d.id;
      if (codes.has(ref)) depended_on.add(ref);
      else if (idToCode.has(ref)) depended_on.add(idToCode.get(ref));
    }
  }

  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = codeOf(ordered[i]);
    if (!depended_on.has(c)) return c;
  }
  // Fully cyclic (shouldn't happen in a DAG); fall back to the last in topo order.
  return codeOf(ordered[ordered.length - 1]);
}

/**
 * Resolve a workpiece's live position. Walks every line terminal → source;
 * at each station checks output → doing → input → failed; first match wins.
 * Falls back to a done-only anomaly position if no live bin holds the id.
 *
 * @param {string} workpiece_id
 * @param {Object<string, LineState>} lines
 * @returns {Position|null}
 */
export function resolvePosition(workpiece_id, lines) {
  for (const line of Object.values(lines)) {
    for (let i = line.stations.length - 1; i >= 0; i--) {
      const station = line.stations[i];
      for (const bin of LIVE_PRIORITY) {
        if (line.bins[station][bin]?.has(workpiece_id)) {
          return { line: line.code, station, bin, terminal: station === line.terminal };
        }
      }
    }
  }
  // Fall back to done: anomaly path.
  for (const line of Object.values(lines)) {
    for (let i = line.stations.length - 1; i >= 0; i--) {
      const station = line.stations[i];
      if (line.bins[station].done?.has(workpiece_id)) {
        return {
          line: line.code,
          station,
          bin: 'done',
          terminal: station === line.terminal,
          anomaly: true,
        };
      }
    }
  }
  return null;
}

/**
 * Find every distinct workpiece id whose name contains the query substring,
 * across every bin of every line. Each match is resolved to its live position.
 *
 * @param {string} query - substring to match against workpiece ids
 * @param {Object<string, LineState>} lines
 * @returns {Map<string, Position>} id → live position
 */
export function findWorkpieceMatches(query, lines) {
  const ids = new Set();
  for (const line of Object.values(lines)) {
    for (const station of line.stations) {
      for (const bin of ALL_BINS) {
        const set = line.bins[station][bin];
        if (!set) continue;
        for (const id of set) if (id.includes(query)) ids.add(id);
      }
    }
  }
  const matches = new Map();
  for (const id of ids) {
    const pos = resolvePosition(id, lines);
    if (pos) matches.set(id, pos);
  }
  return matches;
}

/**
 * Collect every workpiece id currently sitting in a specific bin.
 *
 * @param {string} bin_spec - STATION/BIN form, e.g. 'VM3/failed'
 * @param {Object<string, LineState>} lines
 * @returns {{ok: true, ids: string[]} | {ok: false, error: string}}
 */
export function collectIdsForBin(bin_spec, lines) {
  const m = bin_spec.match(/^([A-Z]{2}\d+)\/(input|doing|output|done|failed)$/);
  if (!m) {
    return {
      ok: false,
      error: `Invalid bin spec "${bin_spec}". Use STATION/BIN (e.g. VM3/failed).`,
    };
  }
  const [, station, bin] = m;
  let line_found = null;
  for (const line of Object.values(lines)) {
    if (line.stations.includes(station)) { line_found = line; break; }
  }
  if (!line_found) {
    return { ok: false, error: `Station "${station}" not found on disk.` };
  }
  const ids = line_found.bins[station][bin];
  return { ok: true, ids: ids ? [...ids] : [] };
}

/**
 * Read and parse a workpiece's log.jsonl. Blank lines skipped; malformed
 * lines dropped silently (the log is best-effort, not a typed payload).
 *
 * @param {string} workpiece_dir - Path to {STATION}/{BIN}/{workpiece_id}/
 * @returns {Array<{ts: string, station: string, event: string}>}
 */
export function readWorkpieceLog(workpiece_dir) {
  const log_path = path.join(workpiece_dir, 'log.jsonl');
  if (!fs.existsSync(log_path)) return [];
  return fs
    .readFileSync(log_path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Build the absolute path to a workpiece directory given a resolved position.
 *
 * @param {Position} pos
 * @param {string} workpiece_id
 * @param {string} [stations_root]
 * @returns {string}
 */
export function workpieceDir(pos, workpiece_id, stations_root = defaultStationsRoot()) {
  return path.join(stations_root, pos.station, pos.bin, workpiece_id);
}

/**
 * Cmd-clickable file:// URL for a workpiece directory. Spaces in workpiece
 * ids are URL-encoded; `/` preserved.
 */
export function workpieceLink(workpiece_dir_path) {
  return `file://${encodeURI(workpiece_dir_path)}`;
}

/**
 * Per-line operational totals derived from live bins only. `done` ignored.
 *
 * - in_flight = (input + doing + output) across non-terminal stations
 * - stuck     = sum of failed across the line
 * - finished  = terminal-station output count
 *
 * @param {LineState} line
 * @returns {{in_flight: number, stuck: number, finished: number,
 *   stuck_locations: string[], biggest_flow: {count: number, at: string|null}}}
 */
export function summarizeLine(line) {
  let in_flight = 0;
  let stuck = 0;
  let finished = 0;
  const stuck_locations = [];
  let biggest_flow = { count: 0, at: null };

  for (const station of line.stations) {
    const bins = line.bins[station];
    const is_terminal = station === line.terminal;
    for (const bin of LIVE_BINS) {
      const ids = bins[bin];
      if (!ids) continue;
      const n = ids.size;
      if (bin === 'failed') {
        stuck += n;
        if (n > 0) stuck_locations.push(`${n} at ${station}/failed`);
      } else if (is_terminal && bin === 'output') {
        finished += n;
      } else {
        in_flight += n;
        if (n > biggest_flow.count) biggest_flow = { count: n, at: `${station}/${bin}` };
      }
    }
  }
  return { in_flight, stuck, finished, stuck_locations, biggest_flow };
}
