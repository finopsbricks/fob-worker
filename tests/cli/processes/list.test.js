import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListProcesses = jest.fn();
const mockGetOrchestratorConfig = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listProcesses: mockListProcesses,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

const { listProcessesHandler } = await import('../../../src/cli/processes/list.js');

// ============================================================================
// listProcessesHandler()
// ============================================================================

describe('listProcessesHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({
      url: 'https://orchestrator.example.com',
      org: 'acme',
      hasApiKey: true,
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print a formatted table of processes', async () => {
    // Arrange
    mockListProcesses.mockResolvedValue({
      data: [
        { id: 'proc-abc', name: 'Monthly Billing', steps: [{}, {}] },
        { id: 'proc-xyz', name: 'Onboarding', steps: [{}] },
      ],
    });

    // Act
    await listProcessesHandler();

    // Assert
    expect(out.stdout).toContain('proc-abc');
    expect(out.stdout).toContain('Monthly Billing');
    expect(out.stdout).toContain('proc-xyz');
    expect(out.stdout).toContain('Onboarding');
    expect(out.stdout).toContain('Total: 2 processes');
  });

  it('should print "No processes found" when the list is empty', async () => {
    // Arrange
    mockListProcesses.mockResolvedValue({ data: [] });

    // Act
    await listProcessesHandler();

    // Assert
    expect(out.stdout).toContain('No processes found');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockListProcesses.mockRejectedValue(new Error('ECONNREFUSED'));

    // Act & Assert
    await expect(listProcessesHandler()).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('ECONNREFUSED');
  });
});
