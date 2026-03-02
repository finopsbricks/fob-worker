import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListProcesses = jest.fn();
const mockGetProcess = jest.fn();
const mockGetOrchestratorConfig = jest.fn();
const mockSaveProcess = jest.fn();
const mockGetProcessesDir = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listProcesses: mockListProcesses,
  getProcess: mockGetProcess,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

jest.unstable_mockModule('../../../src/utils/process-files.js', () => ({
  saveProcess: mockSaveProcess,
  getProcessesDir: mockGetProcessesDir,
}));

const { pullProcessesHandler } = await import('../../../src/cli/processes/pull.js');

// ============================================================================
// pullProcessesHandler()
// ============================================================================

describe('pullProcessesHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({ url: 'https://orchestrator.example.com' });
    mockGetProcessesDir.mockReturnValue('.orchestrator/processes');
    mockSaveProcess.mockReturnValue('.orchestrator/processes/proc-abc.json');
  });

  afterEach(() => {
    out.restore();
  });

  it('should pull and save a single process by id', async () => {
    // Arrange
    const proc = { id: 'proc-abc', name: 'Monthly Billing' };
    mockGetProcess.mockResolvedValue({ data: proc });

    // Act
    await pullProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(mockGetProcess).toHaveBeenCalledWith('proc-abc');
    expect(mockSaveProcess).toHaveBeenCalledWith(proc);
    expect(out.stdout).toContain('Saved:');
  });

  it('should pull all processes when --all is passed', async () => {
    // Arrange
    mockListProcesses.mockResolvedValue({
      data: [{ id: 'proc-1' }, { id: 'proc-2' }],
    });
    mockGetProcess
      .mockResolvedValueOnce({ data: { id: 'proc-1', name: 'Billing' } })
      .mockResolvedValueOnce({ data: { id: 'proc-2', name: 'Onboarding' } });
    mockSaveProcess
      .mockReturnValueOnce('.orchestrator/processes/proc-1.json')
      .mockReturnValueOnce('.orchestrator/processes/proc-2.json');

    // Act
    await pullProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(mockGetProcess).toHaveBeenCalledTimes(2);
    expect(mockSaveProcess).toHaveBeenCalledTimes(2);
    expect(out.stdout).toContain('Total: 2 processes pulled');
  });

  it('should print "No processes found" when pulling all and the list is empty', async () => {
    // Arrange
    mockListProcesses.mockResolvedValue({ data: [] });

    // Act
    await pullProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(out.stdout).toContain('No processes found');
    expect(mockSaveProcess).not.toHaveBeenCalled();
  });

  it('should exit 1 with usage when neither id nor --all is provided', async () => {
    // Act & Assert
    await expect(pullProcessesHandler({ id: undefined, all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Usage: fob processes pull <id>');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockGetProcess.mockRejectedValue(new Error('Timeout'));

    // Act & Assert
    await expect(pullProcessesHandler({ id: 'proc-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Timeout');
  });
});
