import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockRunStation = jest.fn();
const mockGetItem = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  runStation: mockRunStation,
  getItem: mockGetItem,
}));

const { runStationHandler } = await import('../../../src/cli/stations/run.js');

describe('runStationHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should trigger a station and display result', async () => {
    // Arrange
    mockRunStation.mockResolvedValue({
      data: { work_record_id: 'wr123' },
    });

    // Act
    await runStationHandler({ id: 'st1' });

    // Assert
    expect(out.stdout).toContain('Triggered: st1');
    expect(out.stdout).toContain('wr123');
    expect(mockRunStation).toHaveBeenCalledWith('st1', undefined);
  });

  it('should display item name when --item provided', async () => {
    // Arrange
    mockRunStation.mockResolvedValue({
      data: { work_record_id: 'wr456' },
    });
    mockGetItem.mockResolvedValue({
      data: { name: 'Fund A' },
    });

    // Act
    await runStationHandler({ id: 'st1', item: 'item1' });

    // Assert
    expect(out.stdout).toContain('Fund A');
    expect(out.stdout).toContain('item1');
    expect(mockRunStation).toHaveBeenCalledWith('st1', 'item1');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockRunStation.mockRejectedValue(new Error('Station not found'));

    // Act & Assert
    await expect(runStationHandler({ id: 'bad' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Station not found');
  });
});
