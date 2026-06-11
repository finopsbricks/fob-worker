import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockUpdateStation = jest.fn();
const mockCreateStation = jest.fn();
const mockSetEntityTags = jest.fn();
const mockListStations = jest.fn();
const mockGetOrchestratorConfig = jest.fn();
const mockLoadStation = jest.fn();
const mockListLocalStationIds = jest.fn();
const mockLoadStationByFilename = jest.fn();
const mockFinalizeNewStationFile = jest.fn();
const mockGetStationsDir = jest.fn();
const mockFindStationFile = jest.fn();
const mockListAllStationFiles = jest.fn();
const mockResolveTagNames = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  updateStation: mockUpdateStation,
  createStation: mockCreateStation,
  setEntityTags: mockSetEntityTags,
  listStations: mockListStations,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

jest.unstable_mockModule('../../../src/utils/tags.js', () => ({
  resolveTagNames: mockResolveTagNames,
}));

jest.unstable_mockModule('../../../src/utils/station-files.js', () => ({
  loadStation: mockLoadStation,
  listLocalStationIds: mockListLocalStationIds,
  listAllStationFiles: mockListAllStationFiles,
  loadStationByFilename: mockLoadStationByFilename,
  finalizeNewStationFile: mockFinalizeNewStationFile,
  findStationFile: mockFindStationFile,
  getStationsDir: mockGetStationsDir,
}));

const { pushStationsHandler } = await import('../../../src/cli/stations/push.js');

describe('pushStationsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({ url: 'https://orchestrator.example.com' });
    mockGetStationsDir.mockReturnValue('.orchestrator/stations');
    mockUpdateStation.mockResolvedValue({});
    mockListStations.mockResolvedValue({ data: [] });
    mockResolveTagNames.mockResolvedValue({ tagIds: [], createdNames: [] });
    mockSetEntityTags.mockResolvedValue({});
  });

  afterEach(() => {
    out.restore();
  });

  it('should push a single station stripping id, created_at, and org', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-abc',
      name: 'Monthly Billing',
      created_at: '2024-01-01',
      org: 'acme',
      steps: [],
    });

    // Act
    await pushStationsHandler({ id: 'st-abc', all: false });

    // Assert
    expect(mockUpdateStation).toHaveBeenCalledWith(
      'st-abc',
      { name: 'Monthly Billing', steps: [] }
    );
    expect(out.stdout).toContain('Updated: st-abc');
  });

  it('should exit 1 when the station is not found locally', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue(null);
    mockFindStationFile.mockReturnValue(null);

    // Act & Assert
    await expect(pushStationsHandler({ id: 'st-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('station not found locally: st-abc');
  });

  it('should push all local stations', async () => {
    // Arrange
    mockListAllStationFiles.mockReturnValue([
      '.orchestrator/stations/st-1.json',
      '.orchestrator/stations/st-2.json',
    ]);
    mockLoadStationByFilename
      .mockReturnValueOnce({ id: 'st-1', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] })
      .mockReturnValueOnce({ id: 'st-1', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] })
      .mockReturnValueOnce({ id: 'st-2', name: 'Onboarding', created_at: '2024-01-01', org: 'acme', steps: [] })
      .mockReturnValueOnce({ id: 'st-2', name: 'Onboarding', created_at: '2024-01-01', org: 'acme', steps: [] });

    // Act
    await pushStationsHandler({ id: undefined, all: true });

    // Assert
    expect(mockUpdateStation).toHaveBeenCalledTimes(2);
    expect(out.stdout).toContain('Total: 2 updated');
  });

  it('should print a message when there are no local stations', async () => {
    // Arrange
    mockListAllStationFiles.mockReturnValue([]);

    // Act
    await pushStationsHandler({ id: undefined, all: true });

    // Assert
    expect(out.stdout).toContain('No local stations found');
    expect(mockUpdateStation).not.toHaveBeenCalled();
  });

  it('should exit 1 with usage when neither id nor --all is provided', async () => {
    // Act & Assert
    await expect(pushStationsHandler({ id: undefined, all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Usage: fob stations push');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({ id: 'st-abc', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] });
    mockUpdateStation.mockRejectedValue(new Error('Unauthorized'));

    // Act & Assert
    await expect(pushStationsHandler({ id: 'st-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Unauthorized');
  });

  it('should exit 1 with an actionable message on 404 without --force', async () => {
    // Arrange — file has an id (e.g. promoted from another env) but the orchestrator doesn't know it
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-tr1-uuid',
      short_code: 'TR1',
      name: 'Capture Intake',
      steps: [],
    });
    mockUpdateStation.mockRejectedValue(new Error('Orchestrator API error (404): {"error":{"code":"NOT_FOUND","message":"Process not found"}}'));

    // Act & Assert
    await expect(
      pushStationsHandler({ id: 'TR1', all: false })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('station "TR1" (id: st-tr1-uuid) does not exist in the orchestrator');
    expect(out.stderr).toContain('--force');
  });

  it('should exit 1 with an actionable message when --force hits a 409 (id taken in another org)', async () => {
    // Arrange — orchestrator hides the existing station from this org (404 on update),
    // but the id is globally unique so --force create returns 409
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-tr1-uuid',
      short_code: 'TR1',
      name: 'Capture Intake',
      steps: [],
    });
    mockUpdateStation.mockRejectedValue(new Error('Orchestrator API error (404): not found'));
    mockCreateStation.mockRejectedValue(new Error('Orchestrator API error (409): {"error":{"code":"CONFLICT","message":"Process with id \\"st-tr1-uuid\\" already exists"}}'));

    // Act & Assert
    await expect(
      pushStationsHandler({ id: 'TR1', all: false, force: true })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('station "TR1"');
    expect(out.stderr).toContain('already used by another org');
    expect(out.stderr).toContain('remove the "id" field');
  });

  it('should fall back to create with same id on 404 when --force is set', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-tr1-uuid',
      short_code: 'TR1',
      name: 'Capture Intake',
      steps: [],
    });
    mockUpdateStation.mockRejectedValue(new Error('Orchestrator API error (404): not found'));
    mockCreateStation.mockResolvedValue({ data: { id: 'st-tr1-uuid', short_code: 'TR1', name: 'Capture Intake', steps: [] } });
    mockFinalizeNewStationFile.mockReturnValue('.orchestrator/stations/TR1__capture_intake.json');

    // Act
    await pushStationsHandler({ id: 'TR1', all: false, force: true });

    // Assert
    expect(mockCreateStation).toHaveBeenCalledWith(expect.objectContaining({ id: 'st-tr1-uuid', short_code: 'TR1' }));
    expect(out.stdout).toContain('Created: st-tr1-uuid');
  });

  it('should strip tags from update data and sync them separately', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-abc',
      name: 'Billing',
      created_at: '2024-01-01',
      org: 'acme',
      tags: ['monthly', 'finance'],
      steps: [],
    });
    mockResolveTagNames.mockResolvedValue({ tagIds: ['t1', 't2'], createdNames: [] });

    // Act
    await pushStationsHandler({ id: 'st-abc', all: false });

    // Assert — tags not included in update payload
    expect(mockUpdateStation).toHaveBeenCalledWith('st-abc', { name: 'Billing', steps: [] });
    // Assert — tags synced via resolveTagNames + setEntityTags
    expect(mockResolveTagNames).toHaveBeenCalledWith(['monthly', 'finance']);
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st-abc', ['t1', 't2']);
  });

  it('should log auto-created tags during push', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-abc',
      name: 'Billing',
      tags: ['new-tag'],
      steps: [],
    });
    mockResolveTagNames.mockResolvedValue({ tagIds: ['t_new'], createdNames: ['new-tag'] });

    // Act
    await pushStationsHandler({ id: 'st-abc', all: false });

    // Assert
    expect(out.stdout).toContain('Auto-created tags: new-tag');
    expect(out.stdout).toContain('Tags synced: new-tag');
  });

  it('should not call tag sync when tags field is absent', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-abc',
      name: 'Billing',
      steps: [],
    });

    // Act
    await pushStationsHandler({ id: 'st-abc', all: false });

    // Assert
    expect(mockResolveTagNames).not.toHaveBeenCalled();
    expect(mockSetEntityTags).not.toHaveBeenCalled();
  });

  it('should clear tags when tags is an empty array', async () => {
    // Arrange
    mockLoadStationByFilename.mockReturnValue({
      id: 'st-abc',
      name: 'Billing',
      tags: [],
      steps: [],
    });

    // Act
    await pushStationsHandler({ id: 'st-abc', all: false });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st-abc', []);
    expect(mockResolveTagNames).not.toHaveBeenCalled();
    expect(out.stdout).toContain('Tags cleared');
  });
});
