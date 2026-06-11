import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetStation = jest.fn();
const mockListWorkRecords = jest.fn();
const mockGetStationItems = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getStation: mockGetStation,
  listWorkRecords: mockListWorkRecords,
  getStationItems: mockGetStationItems,
}));

const { showStationHandler } = await import('../../../src/cli/stations/show.js');

describe('showStationHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should display formatted station summary', async () => {
    // Arrange
    mockGetStation.mockResolvedValue({
      data: {
        id: 'st1',
        name: 'Monthly Station',
        short_code: 'P1',
        is_enabled: true,
        tags: [{ name: 'monthly' }],
        dependencies: [],
        applies_to: ['msa_file'],
        steps: [{ slug: 'step1' }, { slug: 'step2' }],
      },
    });

    // Act
    await showStationHandler({ id: 'st1' });

    // Assert
    expect(out.stdout).toContain('Station: st1');
    expect(out.stdout).toContain('Monthly Station');
    expect(out.stdout).toContain('P1');
    expect(out.stdout).toContain('enabled');
    expect(out.stdout).toContain('monthly');
    expect(out.stdout).toContain('step1');
    expect(out.stdout).toContain('step2');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const station = { id: 'st1', name: 'Test' };
    mockGetStation.mockResolvedValue({ data: station });

    // Act
    await showStationHandler({ id: 'st1', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(station);
  });

  it('should include work records with --work-records', async () => {
    // Arrange
    mockGetStation.mockResolvedValue({
      data: { id: 'st1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockListWorkRecords.mockResolvedValue({
      data: [{ id: 'wr1', status: 'completed', item: 'item1', created_at: '2026-03-15T10:00:00Z' }],
    });

    // Act
    await showStationHandler({ id: 'st1', workRecords: true });

    // Assert
    expect(out.stdout).toContain('Work Records');
    expect(out.stdout).toContain('wr1');
    expect(mockListWorkRecords).toHaveBeenCalledWith({ station: 'st1', limit: 10 });
  });

  it('should include items with --items', async () => {
    // Arrange
    mockGetStation.mockResolvedValue({
      data: { id: 'st1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockGetStationItems.mockResolvedValue({
      data: [{ id: 'item1', type: 'msa_file', name: 'Fund A', execution_count: 3 }],
    });

    // Act
    await showStationHandler({ id: 'st1', items: true });

    // Assert
    expect(out.stdout).toContain('Items');
    expect(out.stdout).toContain('item1');
    expect(out.stdout).toContain('Fund A');
    expect(mockGetStationItems).toHaveBeenCalledWith('st1');
  });

  it('should include all sections with --all', async () => {
    // Arrange
    mockGetStation.mockResolvedValue({
      data: { id: 'st1', name: 'Test', is_enabled: true, dependencies: [], applies_to: [] },
    });
    mockListWorkRecords.mockResolvedValue({ data: [] });
    mockGetStationItems.mockResolvedValue({ data: [] });

    // Act
    await showStationHandler({ id: 'st1', all: true });

    // Assert
    expect(mockListWorkRecords).toHaveBeenCalled();
    expect(mockGetStationItems).toHaveBeenCalled();
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetStation.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showStationHandler({ id: 'st1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
