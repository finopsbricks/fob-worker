import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockUpdateProcess = jest.fn();
const mockCreateProcess = jest.fn();
const mockSetEntityTags = jest.fn();
const mockGetOrchestratorConfig = jest.fn();
const mockLoadProcess = jest.fn();
const mockListLocalProcesses = jest.fn();
const mockListNewProcessFiles = jest.fn();
const mockLoadProcessByFilename = jest.fn();
const mockFinalizeNewProcessFile = jest.fn();
const mockGetProcessesDir = jest.fn();
const mockResolveTagNames = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  updateProcess: mockUpdateProcess,
  createProcess: mockCreateProcess,
  setEntityTags: mockSetEntityTags,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

jest.unstable_mockModule('../../../src/utils/tags.js', () => ({
  resolveTagNames: mockResolveTagNames,
}));

jest.unstable_mockModule('../../../src/utils/process-files.js', () => ({
  loadProcess: mockLoadProcess,
  listLocalProcesses: mockListLocalProcesses,
  listNewProcessFiles: mockListNewProcessFiles,
  loadProcessByFilename: mockLoadProcessByFilename,
  finalizeNewProcessFile: mockFinalizeNewProcessFile,
  getProcessesDir: mockGetProcessesDir,
}));

const { pushProcessesHandler } = await import('../../../src/cli/processes/push.js');

// ============================================================================
// pushProcessesHandler()
// ============================================================================

describe('pushProcessesHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({ url: 'https://orchestrator.example.com' });
    mockGetProcessesDir.mockReturnValue('.orchestrator/processes');
    mockUpdateProcess.mockResolvedValue({});
    mockListNewProcessFiles.mockReturnValue([]);
    mockResolveTagNames.mockResolvedValue({ tagIds: [], createdNames: [] });
    mockSetEntityTags.mockResolvedValue({});
  });

  afterEach(() => {
    out.restore();
  });

  it('should push a single process stripping id, created_at, and org', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Monthly Billing',
      created_at: '2024-01-01',
      org: 'acme',
      steps: [],
    });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'proc-abc',
      { name: 'Monthly Billing', steps: [] }
    );
    expect(out.stdout).toContain('Updated: proc-abc');
  });

  it('should exit 1 when the process is not found locally', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue(null);
    mockLoadProcessByFilename.mockReturnValue(null);

    // Act & Assert
    await expect(pushProcessesHandler({ id: 'proc-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Process not found locally: proc-abc');
  });

  it('should push all local processes', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue(['proc-1', 'proc-2']);
    mockLoadProcess
      .mockReturnValueOnce({ id: 'proc-1', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] })
      .mockReturnValueOnce({ id: 'proc-2', name: 'Onboarding', created_at: '2024-01-01', org: 'acme', steps: [] });

    // Act
    await pushProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(mockUpdateProcess).toHaveBeenCalledTimes(2);
    expect(out.stdout).toContain('Total: 2 updated');
  });

  it('should print a message when there are no local processes', async () => {
    // Arrange
    mockListLocalProcesses.mockReturnValue([]);

    // Act
    await pushProcessesHandler({ id: undefined, all: true });

    // Assert
    expect(out.stdout).toContain('No local processes found');
    expect(mockUpdateProcess).not.toHaveBeenCalled();
  });

  it('should exit 1 with usage when neither id nor --all is provided', async () => {
    // Act & Assert
    await expect(pushProcessesHandler({ id: undefined, all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Usage: fob processes push <id>');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({ id: 'proc-abc', name: 'Billing', created_at: '2024-01-01', org: 'acme', steps: [] });
    mockUpdateProcess.mockRejectedValue(new Error('Unauthorized'));

    // Act & Assert
    await expect(pushProcessesHandler({ id: 'proc-abc', all: false })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Unauthorized');
  });

  it('should strip tags from update data and sync them separately', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Billing',
      created_at: '2024-01-01',
      org: 'acme',
      tags: ['monthly', 'finance'],
      steps: [],
    });
    mockResolveTagNames.mockResolvedValue({ tagIds: ['t1', 't2'], createdNames: [] });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert — tags not included in update payload
    expect(mockUpdateProcess).toHaveBeenCalledWith('proc-abc', { name: 'Billing', steps: [] });
    // Assert — tags synced via resolveTagNames + setEntityTags
    expect(mockResolveTagNames).toHaveBeenCalledWith(['monthly', 'finance']);
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc-abc', ['t1', 't2']);
  });

  it('should log auto-created tags during push', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Billing',
      tags: ['new-tag'],
      steps: [],
    });
    mockResolveTagNames.mockResolvedValue({ tagIds: ['t_new'], createdNames: ['new-tag'] });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(out.stdout).toContain('Auto-created tags: new-tag');
    expect(out.stdout).toContain('Tags synced: new-tag');
  });

  it('should not call tag sync when tags field is absent', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Billing',
      steps: [],
    });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(mockResolveTagNames).not.toHaveBeenCalled();
    expect(mockSetEntityTags).not.toHaveBeenCalled();
  });

  it('should clear tags when tags is an empty array', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({
      id: 'proc-abc',
      name: 'Billing',
      tags: [],
      steps: [],
    });

    // Act
    await pushProcessesHandler({ id: 'proc-abc', all: false });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc-abc', []);
    expect(mockResolveTagNames).not.toHaveBeenCalled();
    expect(out.stdout).toContain('Tags cleared');
  });
});
