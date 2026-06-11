import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockLoadSteps = jest.fn();
const mockListLocalStationIds = jest.fn();
const mockLoadStation = jest.fn();
const mockSaveStation = jest.fn();
const mockGetStationsDir = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule('../../../src/utils/steps-loader.js', () => ({
  loadSteps: mockLoadSteps,
}));

jest.unstable_mockModule('../../../src/utils/station-files.js', () => ({
  listLocalStationIds: mockListLocalStationIds,
  loadStation: mockLoadStation,
  saveStation: mockSaveStation,
  getStationsDir: mockGetStationsDir,
}));

const { updateStepMetadataHandler } = await import('../../../src/cli/stations/update-step-metadata.js');

describe('updateStepMetadataHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockLoadConfig.mockReturnValue({
      stepsDir: path.join(process.cwd(), 'src/steps'),
    });
    mockGetStationsDir.mockReturnValue('.orchestrator/stations');
    mockLoadSteps.mockResolvedValue({
      'acme/fetch_data': { name: 'Fetch Data', description: 'Fetches data' },
      'acme/process_data': { name: 'Process Data', description: 'Processes data' },
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should update steps where name or description differ and save the station', async () => {
    // Arrange
    mockListLocalStationIds.mockReturnValue(['st-1']);
    mockLoadStation.mockReturnValue({
      id: 'st-1',
      name: 'My Station',
      steps: [
        { slug: 'acme/fetch_data', name: 'Old Name', description: 'Old description' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveStation).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [expect.objectContaining({ name: 'Fetch Data', description: 'Fetches data' })],
      })
    );
    expect(out.stdout).toContain('Updated: My Station (st-1)');
    expect(out.stdout).toContain('Updated 1 of 1 stations');
  });

  it('should not save a station when step metadata is already up to date', async () => {
    // Arrange
    mockListLocalStationIds.mockReturnValue(['st-1']);
    mockLoadStation.mockReturnValue({
      id: 'st-1',
      name: 'My Station',
      steps: [
        { slug: 'acme/fetch_data', name: 'Fetch Data', description: 'Fetches data' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveStation).not.toHaveBeenCalled();
    expect(out.stdout).toContain('Updated 0 of 1 stations');
  });

  it('should skip steps whose slug is not in the step registry', async () => {
    // Arrange
    mockListLocalStationIds.mockReturnValue(['st-1']);
    mockLoadStation.mockReturnValue({
      id: 'st-1',
      name: 'My Station',
      steps: [
        { slug: 'acme/unknown_step', name: 'Old Name', description: '' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveStation).not.toHaveBeenCalled();
  });

  it('should print a message when there are no local stations', async () => {
    // Arrange
    mockListLocalStationIds.mockReturnValue([]);

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(out.stdout).toContain('No local stations found');
    expect(mockSaveStation).not.toHaveBeenCalled();
  });
});
