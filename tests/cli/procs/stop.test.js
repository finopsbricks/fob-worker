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

const { stopWorkerHandler, requirePm2Target } = await import('../../../src/cli/procs/stop.js');

describe('requirePm2Target()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should exit 1 when no running worker matches the target', () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue(null);

    // Act & Assert
    expect(() => requirePm2Target({ target: 'nope' })).toThrow(ExitError);
    expect(out.stderr).toContain('No running worker matches "nope"');
  });

  it('should exit 1 when the match is running directly, not under pm2', () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'direct' });

    // Act & Assert
    expect(() => requirePm2Target({})).toThrow(ExitError);
    expect(out.stderr).toContain('running directly, not under pm2');
    expect(out.stderr).toContain('kill 123');
  });

  it('should return the match when it is pm2-managed', () => {
    // Arrange
    const match = { worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' };
    mockResolveRunningWorker.mockReturnValue(match);

    // Act
    const result = requirePm2Target({});

    // Assert
    expect(result).toBe(match);
  });
});

describe('stopWorkerHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should call pm2 stop with the resolved pm2 name', async () => {
    // Arrange
    mockResolveRunningWorker.mockReturnValue({ worker: 'worker-alex', pid: '123', mode: 'pm2', pm2: 'worker-alex' });

    // Act
    await stopWorkerHandler({});

    // Assert
    expect(mockExecFileSync).toHaveBeenCalledWith('pm2', ['stop', 'worker-alex'], expect.objectContaining({ stdio: 'inherit' }));
  });
});
