import { jest } from '@jest/globals';

/**
 * Thrown by the mocked process.exit so execution halts inside handlers
 * and tests can assert on both the exit code and captured output.
 */
export class ExitError extends Error {
  constructor(code) {
    super(`process.exit called with code ${code}`);
    this.name = 'ExitError';
    this.code = code;
  }
}

/**
 * Spy on console.log, console.error, and process.exit.
 * Returns an object with stdout/stderr accessors and a restore() method.
 *
 * Usage:
 *   let out;
 *   beforeEach(() => { out = captureOutput(); });
 *   afterEach(() => { out.restore(); });
 */
export function captureOutput() {
  const lines = { stdout: [], stderr: [] };

  const spies = [
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      lines.stdout.push(args.join(' '));
    }),
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      lines.stderr.push(args.join(' '));
    }),
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitError(code ?? 0);
    }),
  ];

  return {
    get stdout() {
      return lines.stdout.join('\n');
    },
    get stderr() {
      return lines.stderr.join('\n');
    },
    restore() {
      spies.forEach(spy => spy.mockRestore());
    },
  };
}
