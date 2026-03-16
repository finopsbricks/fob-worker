import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockRunProcess = jest.fn();
const mockGetItem = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  runProcess: mockRunProcess,
  getProcess: jest.fn(),
  getItem: mockGetItem,
}));

const { runProcessHandler } = await import('../../../src/cli/processes/run.js');

describe('runProcessHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should trigger a process and display result', async () => {
    // Arrange
    mockRunProcess.mockResolvedValue({
      data: { work_record_id: 'wr123' },
    });

    // Act
    await runProcessHandler({ id: 'proc1' });

    // Assert
    expect(out.stdout).toContain('Triggered: proc1');
    expect(out.stdout).toContain('wr123');
    expect(mockRunProcess).toHaveBeenCalledWith('proc1', undefined);
  });

  it('should display item name when --item provided', async () => {
    // Arrange
    mockRunProcess.mockResolvedValue({
      data: { work_record_id: 'wr456' },
    });
    mockGetItem.mockResolvedValue({
      data: { name: 'Fund A' },
    });

    // Act
    await runProcessHandler({ id: 'proc1', item: 'item1' });

    // Assert
    expect(out.stdout).toContain('Fund A');
    expect(out.stdout).toContain('item1');
    expect(mockRunProcess).toHaveBeenCalledWith('proc1', 'item1');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockRunProcess.mockRejectedValue(new Error('Process not found'));

    // Act & Assert
    await expect(runProcessHandler({ id: 'bad' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Process not found');
  });
});
