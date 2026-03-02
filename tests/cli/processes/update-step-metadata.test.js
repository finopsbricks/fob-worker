import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockLoadSteps = jest.fn();
const mockListLocalProcesses = jest.fn();
const mockLoadProcess = jest.fn();
const mockSaveProcess = jest.fn();
const mockGetProcessesDir = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule('../../../src/utils/steps-loader.js', () => ({
  loadSteps: mockLoadSteps,
}));

jest.unstable_mockModule('../../../src/utils/process-files.js', () => ({
  listLocalProcesses: mockListLocalProcesses,
  loadProcess: mockLoadProcess,
  saveProcess: mockSaveProcess,
  getProcessesDir: mockGetProcessesDir,
}));

const { updateStepMetadataHandler } = await import('../../../src/cli/processes/update-step-metadata.js');

// ============================================================================
// updateStepMetadataHandler()
// ============================================================================

describe('updateStepMetadataHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockLoadConfig.mockReturnValue({
      stepsPath: path.join(process.cwd(), 'src/steps/index.js'),
    });
    mockGetProcessesDir.mockReturnValue('.orchestrator/processes');
    mockLoadSteps.mockResolvedValue({
      'acme/fetch_data': { name: 'Fetch Data', description: 'Fetches data' },
      'acme/process_data': { name: 'Process Data', description: 'Processes data' },
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should update steps where name or description differ and save the process', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue(['proc-1']);
    mockLoadProcess.mockReturnValue({
      id: 'proc-1',
      name: 'My Process',
      steps: [
        { slug: 'acme/fetch_data', name: 'Old Name', description: 'Old description' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [expect.objectContaining({ name: 'Fetch Data', description: 'Fetches data' })],
      })
    );
    expect(out.stdout).toContain('Updated: My Process (proc-1)');
    expect(out.stdout).toContain('Updated 1 of 1 processes');
  });

  it('should not save a process when step metadata is already up to date', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue(['proc-1']);
    mockLoadProcess.mockReturnValue({
      id: 'proc-1',
      name: 'My Process',
      steps: [
        { slug: 'acme/fetch_data', name: 'Fetch Data', description: 'Fetches data' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveProcess).not.toHaveBeenCalled();
    expect(out.stdout).toContain('Updated 0 of 1 processes');
  });

  it('should skip steps whose slug is not in the step registry', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue(['proc-1']);
    mockLoadProcess.mockReturnValue({
      id: 'proc-1',
      name: 'My Process',
      steps: [
        { slug: 'acme/unknown_step', name: 'Old Name', description: '' },
      ],
    });

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(mockSaveProcess).not.toHaveBeenCalled();
  });

  it('should print a message when there are no local processes', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue([]);

    // Act
    await updateStepMetadataHandler();

    // Assert
    expect(out.stdout).toContain('No local processes found');
    expect(mockSaveProcess).not.toHaveBeenCalled();
  });
});
