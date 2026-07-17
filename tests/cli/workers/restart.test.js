import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput } from '../helpers.js';

const mockResolveRunningWorker = jest.fn();
const mockExecFileSync = jest.fn();

jest.unstable_mockModule('../../../src/utils/worker-processes.js', () => ({
  resolveRunningWorker: mockResolveRunningWorker,
}));

jest.unstable_mockModule('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

const { restartWorkerHandler } = await import('../../../src/cli/workers/restart.js');

describe('restartWorkerHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should call pm2 restart with the resolved pm2 name', async () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' });

    // Act
    await restartWorkerHandler({});

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith('pm2', ['restart', 'worker-alex'], expect.objectContaining({ stdio: 'inherit' }));
  });
});
