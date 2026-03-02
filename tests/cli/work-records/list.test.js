import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListWorkRecords = jest.fn();
const mockGetOrchestratorConfig = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listWorkRecords: mockListWorkRecords,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

const { listWorkRecordsHandler } = await import('../../../src/cli/work-records/list.js');

// ============================================================================
// listWorkRecordsHandler()
// ============================================================================

describe('listWorkRecordsHandler()', () => {
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

  it('should print a formatted table of work records with formatted dates', async () => {
    // Arrange
    mockListWorkRecords.mockResolvedValue({
      data: [
        { id: 'wr-1', status: 'completed', created_at: '2024-06-15T10:30:00.000Z' },
        { id: 'wr-2', status: 'failed', created_at: '2024-06-16T08:00:00.000Z' },
      ],
    });

    // Act
    await listWorkRecordsHandler({ limit: undefined, status: undefined, process: undefined });

    // Assert
    expect(out.stdout).toContain('wr-1');
    expect(out.stdout).toContain('completed');
    expect(out.stdout).toContain('2024-06-15 10:30:00');
    expect(out.stdout).toContain('wr-2');
    expect(out.stdout).toContain('failed');
    expect(out.stdout).toContain('Total: 2 records');
  });

  it('should include active filters in the output', async () => {
    // Arrange
    mockListWorkRecords.mockResolvedValue({ data: [] });

    // Act
    await listWorkRecordsHandler({ limit: 10, status: 'failed', process: 'proc-1' });

    // Assert
    expect(out.stdout).toContain('limit=10');
    expect(out.stdout).toContain('status=failed');
    expect(out.stdout).toContain('process=proc-1');
  });

  it('should print "No work records found" when the list is empty', async () => {
    // Arrange
    mockListWorkRecords.mockResolvedValue({ data: [] });

    // Act
    await listWorkRecordsHandler({ limit: undefined, status: undefined, process: undefined });

    // Assert
    expect(out.stdout).toContain('No work records found');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockListWorkRecords.mockRejectedValue(new Error('Forbidden'));

    // Act & Assert
    await expect(
      listWorkRecordsHandler({ limit: undefined, status: undefined, process: undefined })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Forbidden');
  });
});
