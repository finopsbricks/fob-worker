import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockExecFileSync = jest.fn();

jest.unstable_mockModule('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

const { monitWorkersHandler } = await import('../../../src/cli/workers/monit.js');

describe('monitWorkersHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should exec pm2 monit with inherited stdio', async () => {
    // Act
    await monitWorkersHandler();

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith('pm2', ['monit'], expect.objectContaining({ stdio: 'inherit' }));
  });

  it('should exit 1 with a friendly message when pm2 is not on PATH', async () => {
    // Arrange
    const enoent = new Error('not found');
    enoent.code = 'ENOENT';
    mockExecFileSync.mockImplementation(() => { throw enoent; });

    // Act & Assert
    await expect(monitWorkersHandler()).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('pm2 not found');
  });
});
