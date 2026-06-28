/**
 * Watch-mode renderer for snapshot commands (e.g. `fob lines status --watch`).
 *
 * Renders in place on the main screen: each tick sends cursor-home +
 * clear-to-end-of-display, then writes the next frame over the previous one.
 * Unlike `\x1b[2J` (full clear), `\x1b[J` does NOT scroll the old frame into
 * scrollback — so the watch session leaves no noise behind, and the last
 * rendered frame stays visible after Ctrl-C.
 *
 * If stdout isn't a TTY (e.g. piped to a file), falls back to plain append:
 * each frame is written below the last, no escape codes emitted.
 *
 * `render` is invoked once per tick and may be async. Errors are not caught —
 * the loop is meant to halt on programmer mistakes, not silently spin.
 */

export const DEFAULT_WATCH_INTERVAL_SECS = 1;

const CURSOR_HOME = '\x1b[H';
const CLEAR_TO_END = '\x1b[J';

export async function watchRender({ render, interval_secs = DEFAULT_WATCH_INTERVAL_SECS }) {
  process.on('SIGINT', () => { process.stdout.write('\n'); process.exit(0); });
  let first = true;
  while (true) {
    if (process.stdout.isTTY && !first) {
      process.stdout.write(CURSOR_HOME + CLEAR_TO_END);
    }
    first = false;
    await render();
    console.log(`\nupdated ${new Date().toLocaleTimeString()} — refresh every ${interval_secs}s (Ctrl-C to stop)`);
    await new Promise((r) => setTimeout(r, interval_secs * 1000));
  }
}
