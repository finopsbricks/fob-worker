import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetWorkRecord = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getWorkRecord: mockGetWorkRecord,
}));

const { showWorkRecordHandler } = await import('../../../src/cli/work-records/show.js');

// ============================================================================
// showWorkRecordHandler()
// ============================================================================

describe('showWorkRecordHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should print the work record as JSON', async () => {
    // Arrange
    const record = { id: 'wr-1', status: 'completed', data: { amount: 42 } };
    mockGetWorkRecord.mockResolvedValue({ data: record });

    // Act
    await showWorkRecordHandler({ id: 'wr-1' });

    // Assert
    expect(out.stdout).toContain('"id": "wr-1"');
    expect(out.stdout).toContain('"status": "completed"');
  });

  it('should exit 1 with the error message on failure', async () => {
    // Arrange
    mockGetWorkRecord.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showWorkRecordHandler({ id: 'wr-1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
