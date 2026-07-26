import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListRunningWorkers = jest.fn();
const mockGetWorkerPackageInfo = jest.fn();
const mockIsPm2Available = jest.fn();
const mockExecFileSync = jest.fn();

jest.unstable_mockModule('../../../src/utils/worker-processes.js', () => ({
  listRunningWorkers: mockListRunningWorkers,
  getWorkerPackageInfo: mockGetWorkerPackageInfo,
  isPm2Available: mockIsPm2Available,
}));

jest.unstable_mockModule('child_process', () => ({
  execFileSync: mockExecFileSync,
}));

const { startWorkerHandler } = await import('../../../src/cli/procs/start.js');

describe('startWorkerHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockListRunningWorkers.mockReturnValue([]);
    mockIsPm2Available.mockReturnValue(true);
  });

  afterEach(() => {
    out.restore();
  });

  it('should exit 1 when the target is not a fob worker repo', async () => {
    // Arrange
    mockGetWorkerPackageInfo.mockReturnValue(null);

    // Act & Assert
    await expect(startWorkerHandler({ target: '/some/random/dir' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain("doesn't look like a fob worker repo");
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should exit 1 when the worker is already running', async () => {
    // Arrange
    mockGetWorkerPackageInfo.mockReturnValue({ main: 'src/index.js' });
    mockListRunningWorkers.mockReturnValue([
      { pid: '999', worker: 'worker-alex', mode: 'pm2', cwd: '/workers/worker-alex' },
    ]);

    // Act & Assert
    await expect(startWorkerHandler({ target: '/workers/worker-alex' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('already running (pid 999, mode pm2)');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should exit 1 with a friendly message when pm2 is not installed', async () => {
    // Arrange
    mockGetWorkerPackageInfo.mockReturnValue({ main: 'src/index.js' });
    mockIsPm2Available.mockReturnValue(false);

    // Act & Assert
    await expect(startWorkerHandler({ target: '/workers/worker-alex' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('pm2 not found');
  });

  it('should start the worker under pm2 with the directory basename as name and cwd', async () => {
    // Arrange
    mockGetWorkerPackageInfo.mockReturnValue({ main: 'src/index.js' });

    // Act
    await startWorkerHandler({ target: '/workers/worker-alex' });

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'pm2',
      ['start', 'src/index.js', '--name', 'worker-alex'],
      expect.objectContaining({ cwd: '/workers/worker-alex' }),
    );
  });
});
