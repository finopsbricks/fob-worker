import {
  loadLineState,
  resolvePosition,
  workpieceDir,
  workpieceLink,
  readWorkpieceLog,
} from '../../utils/line-state.js';

/**
 * Append-style watch helpers for `fob workpieces show/list --watch`.
 *
 * Append-style means: print only new events / position changes as they happen.
 * Friendly to scrollback and `>` redirection. Initial render is the caller's
 * responsibility — these loops pick up right after that.
 */

const DEFAULT_INTERVAL_SECS = 2;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function installSigintExit() {
  process.on('SIGINT', () => { console.log('\nStopped.'); process.exit(0); });
}

/**
 * Watch a single workpiece. Caller has already rendered the initial deep view.
 *
 * @param {string} workpiece_id
 * @param {object} [opts]
 * @param {number} [opts.interval_secs=2]
 */
export async function watchSingle(workpiece_id, { interval_secs = DEFAULT_INTERVAL_SECS } = {}) {
  installSigintExit();
  console.log(`\n--- watching ${workpiece_id} (interval ${interval_secs}s, Ctrl-C to stop) ---`);

  // Initialize state from current snapshot.
  let lines = loadLineState();
  let pos = resolvePosition(workpiece_id, lines);
  if (!pos) {
    console.log(`${new Date().toISOString()}  ${workpiece_id}  not on disk`);
    return;
  }
  let last_pos_key = `${pos.station}/${pos.bin}`;
  let last_log_count = readWorkpieceLog(workpieceDir(pos, workpiece_id)).length;

  while (true) {
    await sleep(interval_secs * 1000);
    lines = loadLineState();
    pos = resolvePosition(workpiece_id, lines);
    if (!pos) {
      console.log(`${new Date().toISOString()}  ${workpiece_id}  no longer on disk`);
      return;
    }
    const wp_dir = workpieceDir(pos, workpiece_id);
    const pos_key = `${pos.station}/${pos.bin}`;

    if (pos_key !== last_pos_key) {
      console.log(`${new Date().toISOString()}  → moved from ${last_pos_key} to ${pos_key}`);
      console.log(`Folder: ${workpieceLink(wp_dir)}`);
      last_pos_key = pos_key;
      last_log_count = readWorkpieceLog(wp_dir).length;
      continue;
    }

    const events = readWorkpieceLog(wp_dir);
    if (events.length > last_log_count) {
      for (const e of events.slice(last_log_count)) {
        console.log(`${e.ts}  ${e.station.padEnd(3)}  ${e.event}`);
      }
      last_log_count = events.length;
    }
  }
}

/**
 * Watch a fixed set of workpieces. Caller has already rendered the initial
 * dashboard. Notices are tagged with the workpiece id so a streaming reader
 * can attribute each event.
 *
 * Workpieces that reach terminal output emit a one-time `✓ finished` notice
 * and stop being polled for the remainder of the watch session.
 *
 * @param {string[]} ids - workpieces to follow (fixed set, no auto-discovery)
 * @param {object} [opts]
 * @param {number} [opts.interval_secs=2]
 */
export async function watchMulti(ids, { interval_secs = DEFAULT_INTERVAL_SECS } = {}) {
  installSigintExit();
  console.log(`\n--- watching ${ids.length} workpiece${ids.length === 1 ? '' : 's'} (interval ${interval_secs}s, Ctrl-C to stop) ---`);

  // Per-workpiece tracking state, seeded from current snapshot.
  let lines = loadLineState();
  const state = new Map();
  for (const id of ids) {
    const pos = resolvePosition(id, lines);
    if (!pos) continue;
    const wp_dir = workpieceDir(pos, id);
    state.set(id, {
      pos_key: `${pos.station}/${pos.bin}`,
      log_count: readWorkpieceLog(wp_dir).length,
      finished: pos.bin === 'output' && pos.terminal,
    });
  }

  while (true) {
    await sleep(interval_secs * 1000);
    lines = loadLineState();

    for (const id of ids) {
      const prev = state.get(id);
      if (!prev || prev.finished) continue;

      const pos = resolvePosition(id, lines);
      if (!pos) {
        console.log(`${new Date().toISOString()}  ${id}  no longer on disk`);
        state.delete(id);
        continue;
      }
      const wp_dir = workpieceDir(pos, id);
      const pos_key = `${pos.station}/${pos.bin}`;

      if (pos_key !== prev.pos_key) {
        console.log(`${new Date().toISOString()}  ${id}  → moved from ${prev.pos_key} to ${pos_key}`);
        console.log(`                          ${workpieceLink(wp_dir)}`);
        prev.pos_key = pos_key;
        prev.log_count = readWorkpieceLog(wp_dir).length;
      } else {
        const events = readWorkpieceLog(wp_dir);
        if (events.length > prev.log_count) {
          for (const e of events.slice(prev.log_count)) {
            console.log(`${e.ts}  ${id}  ${e.station}  ${e.event}`);
          }
          prev.log_count = events.length;
        }
      }

      if (pos.bin === 'output' && pos.terminal && !prev.finished) {
        console.log(`${new Date().toISOString()}  ${id}  ✓ finished (terminal output)`);
        prev.finished = true;
      }
    }
  }
}
