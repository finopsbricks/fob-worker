import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListStations = jest.fn();
const mockGetStation = jest.fn();
const mockGetOrchestratorConfig = jest.fn();
const mockSaveStation = jest.fn();
const mockGetStationsDir = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listStations: mockListStations,
  getStation: mockGetStation,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

jest.unstable_mockModule('../../../src/utils/station-files.js', () => ({
  saveStation: mockSaveStation,
  getStationsDir: mockGetStationsDir,
}));

const { pullStationsHandler } = await import('../../../src/cli/stations/pull.js');

describe('pullStationsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({ url: 'https://orchestrator.example.com' });
    mockGetStationsDir.mockReturnValue('.orchestrator/stations');
    mockSaveStation.mockReturnValue('.orchestrator/stations/st-abc.json');
    mockListStations.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    out.restore();
  });

  it('should pull and save a single station by id', async () => {
    // Arrange
    const station = { id: 'st-abc', name: 'Monthly Billing' };
    mockGetStation.mockResolvedValue({ data: station });

    // Act
    await pullStationsHandler({ id: 'st-abc', all: false });

    // Assert
    expect(mockGetStation).toHaveBeenCalledWith('st-abc');
    expect(mockSaveStation).toHaveBeenCalledWith(station);
    expect(out.stdout).toContain('Saved:');
  });

  it('should pull all stations when --all is passed', async () => {
    // Arrange
    mockListStations.mockResolvedValue({
      data: [{ id: 'st-1' }, { id: 'st-2' }],
    });
    mockGetStation
      .mockResolvedValueOnce({ data: { id: 'st-1', name: 'Billing' } })
      .mockResolvedValueOnce({ data: { id: 'st-2', name: 'Onboarding' } });
    mockSaveStation
      .mockReturnValueOnce('.orchestrator/stations/st-1.json')
      .mockReturnValueOnce('.orchestrator/stations/st-2.json');

    // Act
    await pullStationsHandler({ id: undefined, all: true });

    // Assert
    expect(mockGetStation).toHaveBeenCalledTimes(2);
    expect(mockSaveStation).toHaveBeenCalledTimes(2);
    expect(out.stdout).toContain('Total: 2 stations pulled');
  });

  it('should print "No stations found" when pulling all and the list is empty', async () => {
    // Arrange
    mockListStations.mockResolvedValue({ data: [] });

    // Act
    await pullStationsHandler({ id: undefined, all: true });

    // Assert
    expect(out.stdout).toContain('No stations found');
    expect(mockSaveStation).not.toHaveBeenCalled();
  });

  it('should exit 1 with usage when neither id nor --all is provided', async () => {
    // Act & Assert
    await expect(pullStationsHandler({ id: undefined, all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Usage: fob stations pull <id');
  });

  it('should convert tag objects to names before saving', async () => {
    // Arrange
    const station = {
      id: 'st-abc',
      name: 'Monthly Billing',
      tags: [{ id: 't1', name: 'monthly', color: '#ff0000' }, { id: 't2', name: 'finance', color: '#00ff00' }],
    };
    mockGetStation.mockResolvedValue({ data: station });

    // Act
    await pullStationsHandler({ id: 'st-abc', all: false });

    // Assert — tags saved as name strings, not objects
    expect(mockSaveStation).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['monthly', 'finance'] }),
    );
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockGetStation.mockRejectedValue(new Error('Timeout'));

    // Act & Assert
    await expect(pullStationsHandler({ id: 'st-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Timeout');
  });
});
