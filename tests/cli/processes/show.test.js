import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetProcess = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getProcess: mockGetProcess,
}));

const { showProcessHandler } = await import('../../../src/cli/processes/show.js');

// ============================================================================
// showProcessHandler()
// ============================================================================

describe('showProcessHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should print the process as JSON', async () => {
    // Arrange
    const proc = { id: 'proc-abc', name: 'Monthly Billing', steps: [] };
    mockGetProcess.mockResolvedValue({ data: proc });

    // Act
    await showProcessHandler({ id: 'proc-abc' });

    // Assert
    expect(out.stdout).toContain('"id": "proc-abc"');
    expect(out.stdout).toContain('"name": "Monthly Billing"');
  });

  it('should exit 1 with the error message on failure', async () => {
    // Arrange
    mockGetProcess.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showProcessHandler({ id: 'proc-abc' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
