import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetProcess = jest.fn();
const mockListWorkRecords = jest.fn();
const mockGetProcessItems = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getProcess: mockGetProcess,
  listWorkRecords: mockListWorkRecords,
  getProcessItems: mockGetProcessItems,
}));

const { showProcessHandler } = await import('../../../src/cli/processes/show.js');

describe('showProcessHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should display formatted process summary', async () => {
    // Arrange
    mockGetProcess.mockResolvedValue({
      data: {
        id: 'proc1',
        name: 'Monthly Process',
        short_code: 'P1',
        is_enabled: true,
        tags: [{ name: 'monthly' }],
        dependencies: [],
        applies_to: ['msa_file'],
        steps: [{ slug: 'step1' }, { slug: 'step2' }],
      },
    });

    // Act
    await showProcessHandler({ id: 'proc1' });

    // Assert
    expect(out.stdout).toContain('Process: proc1');
    expect(out.stdout).toContain('Monthly Process');
    expect(out.stdout).toContain('P1');
    expect(out.stdout).toContain('enabled');
    expect(out.stdout).toContain('monthly');
    expect(out.stdout).toContain('step1');
    expect(out.stdout).toContain('step2');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const proc = { id: 'proc1', name: 'Test' };
    mockGetProcess.mockResolvedValue({ data: proc });

    // Act
    await showProcessHandler({ id: 'proc1', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(proc);
  });

  it('should include work records with --work-records', async () => {
    // Arrange
    mockGetProcess.mockResolvedValue({
      data: { id: 'proc1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockListWorkRecords.mockResolvedValue({
      data: [{ id: 'wr1', status: 'completed', item: 'item1', created_at: '2026-03-15T10:00:00Z' }],
    });

    // Act
    await showProcessHandler({ id: 'proc1', workRecords: true });

    // Assert
    expect(out.stdout).toContain('Work Records');
    expect(out.stdout).toContain('wr1');
    expect(mockListWorkRecords).toHaveBeenCalledWith({ process: 'proc1', limit: 10 });
  });

  it('should include items with --items', async () => {
    // Arrange
    mockGetProcess.mockResolvedValue({
      data: { id: 'proc1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockGetProcessItems.mockResolvedValue({
      data: [{ id: 'item1', type: 'msa_file', name: 'Fund A', execution_count: 3 }],
    });

    // Act
    await showProcessHandler({ id: 'proc1', items: true });

    // Assert
    expect(out.stdout).toContain('Items');
    expect(out.stdout).toContain('item1');
    expect(out.stdout).toContain('Fund A');
    expect(mockGetProcessItems).toHaveBeenCalledWith('proc1');
  });

  it('should include all sections with --all', async () => {
    // Arrange
    mockGetProcess.mockResolvedValue({
      data: { id: 'proc1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockListWorkRecords.mockResolvedValue({ data: [] });
    mockGetProcessItems.mockResolvedValue({ data: [] });

    // Act
    await showProcessHandler({ id: 'proc1', all: true });

    // Assert
    expect(mockListWorkRecords).toHaveBeenCalled();
    expect(mockGetProcessItems).toHaveBeenCalled();
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetProcess.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showProcessHandler({ id: 'proc1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
