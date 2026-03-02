import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockUpdateProcess = jest.fn();
const mockGetOrchestratorConfig = jest.fn();
const mockLoadProcess = jest.fn();
const mockListLocalProcesses = jest.fn();
const mockGetProcessesDir = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  updateProcess: mockUpdateProcess,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

jest.unstable_mockModule('../../../src/utils/process-files.js', () => ({
  loadProcess: mockLoadProcess,
  listLocalProcesses: mockListLocalProcesses,
  getProcessesDir: mockGetProcessesDir,
}));

const { pushProcessesHandler } = await import('../../../src/cli/processes/push.js');

// ============================================================================
// pushProcessesHandler()
// ============================================================================

describe('pushProcessesHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({ url: 'https://orchestrator.example.com' });
    mockGetProcessesDir.mockReturnValue('.orchestrator/processes');
    mockUpdateProcess.mockResolvedValue({});
  });

  afterEach(() => {
    out.restore();
  });

  it('should push a single process stripping id, created_at, and org', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Monthly Billing',
      created_at: '2024-01-01',
      org: 'acme',
      steps: [],
    });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'proc-abc',
      { name: 'Monthly Billing', steps: [] }
    );
    expect(out.stdout).toContain('Pushed: proc-abc');
  });

  it('should exit 1 when the process is not found locally', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue(null);

    // Act & Assert
    await expect(pushProcessesHandler({ id: 'proc-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Process not found locally: proc-abc');
  });

  it('should push all local processes', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue(['proc-1', 'proc-2']);
    mockLoadProcess
      .mockReturnValueOnce({ id: 'proc-1', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] })
      .mockReturnValueOnce({ id: 'proc-2', name: 'Onboarding', created_at: '2024-01-01', org: 'acme', steps: [] });

    // Act
    await pushProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(mockUpdateProcess).toHaveBeenCalledTimes(2);
    expect(out.stdout).toContain('Total: 2 processes pushed');
  });

  it('should print a message when there are no local processes', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue([]);

    // Act
    await pushProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(out.stdout).toContain('No local processes found');
    expect(mockUpdateProcess).not.toHaveBeenCalled();
  });

  it('should exit 1 with usage when neither id nor --all is provided', async () => {
    // Act & Assert
    await expect(pushProcessesHandler({ id: undefined, all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Usage: fob processes push <id>');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({ id: 'proc-abc', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] });
    mockUpdateProcess.mockRejectedValue(new Error('Unauthorized'));

    // Act & Assert
    await expect(pushProcessesHandler({ id: 'proc-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Unauthorized');
  });
});
