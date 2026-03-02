/**
 * Interactive terminal picker using arrow keys
 */

import readline from 'readline';

/**
 * @typedef {Object} PickerOption
 * @property {string} label - Display label
 * @property {string} value - Value to return
 * @property {string} [type] - Type for grouping (process, scenario, temp, empty)
 */

/**
 * Interactive picker using arrow keys
 * @param {string} prompt - Prompt message
 * @param {PickerOption[]} options - Options to choose from
 * @returns {Promise<PickerOption|null>} Selected option or null if cancelled
 */
export async function interactivePicker(prompt, options) {
  if (options.length === 0) {
    return null;
  }

  // If only one option, return it directly
  if (options.length === 1) {
    console.log(`${prompt}`);
    console.log(`   Using: ${options[0].label}`);
    return options[0];
  }

  return new Promise((resolve) => {
    let selectedIndex = 0;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Enable raw mode for keypress detection
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin, rl);

    const render = () => {
      // Clear previous output and rerender
      console.clear();
      console.log(prompt);
      console.log('');

      let lastType = null;
      options.forEach((opt, i) => {
        // Add separator between types
        if (opt.type && opt.type !== lastType && lastType !== null) {
          console.log('   ─────────────────────────────');
        }
        lastType = opt.type;

        const prefix = i === selectedIndex ? ' ❯ ' : '   ';
        const highlight = i === selectedIndex ? '\x1b[36m' : '\x1b[0m'; // cyan
        const reset = '\x1b[0m';
        console.log(`${prefix}${highlight}${opt.label}${reset}`);
      });

      console.log('');
      console.log('   ↑/↓ to navigate, Enter to select, Esc to cancel');
    };

    render();

    const cleanup = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
    };

    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'down') {
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      } else if (key.name === 'return') {
        cleanup();
        console.clear();
        resolve(options[selectedIndex]);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        console.clear();
        resolve(null);
      }
    });
  });
}
