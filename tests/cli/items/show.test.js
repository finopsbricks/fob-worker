import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetItem = jest.fn();
const mockGetItemProcesses = jest.fn();
const mockListWorkRecords = jest.fn();
const mockGetEntityTags = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getItem: mockGetItem,
  getItemProcesses: mockGetItemProcesses,
  listWorkRecords: mockListWorkRecords,
  getEntityTags: mockGetEntityTags,
}));

const { showItemHandler } = await import('../../../src/cli/items/show.js');

describe('showItemHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetEntityTags.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    out.restore();
  });

  it('should display formatted item summary', async () => {
    // Arrange
    mockGetItem.mockResolvedValue({
      data: {
        id: 'item1',
        name: 'Fund A',
        type: 'msa_file',
        status: 'active',
        external_id: 'ext123',
        created_at: '2026-03-15T10:00:00Z',
        metadata: { key: 'value' },
      },
    });

    // Act
    await showItemHandler({ id: 'item1' });

    // Assert
    expect(out.stdout).toContain('Item: item1');
    expect(out.stdout).toContain('Fund A');
    expect(out.stdout).toContain('msa_file');
    expect(out.stdout).toContain('ext123');
    expect(out.stdout).toContain('key: value');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const item = { id: 'item1', name: 'Fund A' };
    mockGetItem.mockResolvedValue({ data: item });

    // Act
    await showItemHandler({ id: 'item1', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(item);
  });

  it('should include processes with --processes', async () => {
    // Arrange
    mockGetItem.mockResolvedValue({
      data: { id: 'item1', name: 'Fund A', type: 'msa_file', status: 'active', created_at: '2026-03-15T10:00:00Z' },
    });
    mockGetItemProcesses.mockResolvedValue({
      data: [{ short_code: 'P1', name: 'Monthly', execution_count: 5 }],
    });

    // Act
    await showItemHandler({ id: 'item1', processes: true });

    // Assert
    expect(out.stdout).toContain('Configured Processes');
    expect(out.stdout).toContain('P1');
    expect(out.stdout).toContain('Monthly');
  });

  it('should include work records with --work-records', async () => {
    // Arrange
    mockGetItem.mockResolvedValue({
      data: { id: 'item1', name: 'Fund A', type: 'msa_file', status: 'active', created_at: '2026-03-15T10:00:00Z' },
    });
    mockListWorkRecords.mockResolvedValue({
      data: [{ id: 'wr1', process: 'proc1', status: 'completed' }],
    });

    // Act
    await showItemHandler({ id: 'item1', workRecords: true });

    // Assert
    expect(out.stdout).toContain('Execution History');
    expect(out.stdout).toContain('wr1');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetItem.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showItemHandler({ id: 'item1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
