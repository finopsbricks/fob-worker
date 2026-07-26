import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockResolveRunningWorker = jest.fn();
const mockExecFileSync = jest.fn();

jest.unstable_mockModule('../../../src/utils/worker-processes.js', () => ({
  resolveRunningWorker: mockResolveRunningWorker,
}));

jest.unstable_mockModule('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

const { logsWorkerHandler } = await import('../../../src/cli/procs/logs.js');

describe('logsWorkerHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should call pm2 logs with the resolved pm2 name', async () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' });

    // Act
    await logsWorkerHandler({});

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith('pm2', ['logs', 'worker-alex'], expect.objectContaining({ stdio: 'inherit' }));
  });

  it('should exit 1 with a friendly message when pm2 is not on PATH', async () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' });
    const enoent = new Error('not found');
    enoent.code = 'ENOENT';
    mockExecFileSync.mockImplementation(() => { throw enoent; });

    // Act & Assert
    await expect(logsWorkerHandler({})).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('pm2 not found');
  });

  it('should swallow a non-ENOENT error (e.g. Ctrl-C / SIGINT exit)', async () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' });
    mockExecFileSync.mockImplementation(() => { throw new Error('SIGINT'); });

    // Act & Assert — should NOT throw
    await expect(logsWorkerHandler({})).resolves.toBeUndefined();
  });
});
