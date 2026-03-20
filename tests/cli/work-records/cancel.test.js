import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockCancelWorkRecord = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  cancelWorkRecord: mockCancelWorkRecord,
}));

const { cancelWorkRecordHandler } = await import('../../../src/cli/work-records/cancel.js');

describe('cancelWorkRecordHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should print confirmation on successful cancel', async () => {
    // Arrange
    mockCancelWorkRecord.mockResolvedValue({
      data: {
        id: 'wr_abc123',
        status: 'cancelled',
        process: 'proc_xyz',
        error: 'Cancelled via API',
      },
    });

    // Act
    await cancelWorkRecordHandler({ id: 'wr_abc123' });

    // Assert
    expect(mockCancelWorkRecord).toHaveBeenCalledWith('wr_abc123');
    expect(out.stdout).toContain('Cancelled work record wr_abc123');
    expect(out.stdout).toContain('Status:   cancelled');
    expect(out.stdout).toContain('Process:  proc_xyz');
    expect(out.stdout).toContain('Error:    Cancelled via API');
  });

  it('should output raw JSON with --json flag', async () => {
    // Arrange
    const record = {
      id: 'wr_abc123',
      status: 'cancelled',
      process: 'proc_xyz',
      error: 'Cancelled via API',
    };
    mockCancelWorkRecord.mockResolvedValue({ data: record });

    // Act
    await cancelWorkRecordHandler({ id: 'wr_abc123', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(record);
  });

  it('should exit 1 when work record is in terminal state', async () => {
    // Arrange
    mockCancelWorkRecord.mockRejectedValue(
      new Error('Orchestrator API error (400): {"error":"Work record is already in terminal state: completed","code":"INVALID_STATE"}')
    );

    // Act & Assert
    await expect(cancelWorkRecordHandler({ id: 'wr_abc123' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Error:');
    expect(out.stderr).toContain('400');
  });

  it('should exit 1 when work record is not found', async () => {
    // Arrange
    mockCancelWorkRecord.mockRejectedValue(
      new Error('Orchestrator API error (404): {"error":"Not found"}')
    );

    // Act & Assert
    await expect(cancelWorkRecordHandler({ id: 'wr_missing' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Error:');
    expect(out.stderr).toContain('404');
  });
});
