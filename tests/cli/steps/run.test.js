import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput, ExitError } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockEnsureTempDir = jest.fn();
const mockInitTemplates = jest.fn();
const mockResolveConfig = jest.fn();
const mockLoadSteps = jest.fn();
const mockGetHandler = jest.fn();
const mockSaveStepOutput = jest.fn();
const mockLoadAllStepOutputs = jest.fn();
const mockLoadProcess = jest.fn();
const mockGetStepConfigFromProcess = jest.fn();
const mockFindProcessesWithStep = jest.fn();
const mockListScenarios = jest.fn();
const mockLoadScenario = jest.fn();
const mockInteractivePicker = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
  ensureTempDir: mockEnsureTempDir,
}));

jest.unstable_mockModule('@fob/lib-worker', () => ({
  initTemplates: mockInitTemplates,
  resolveConfig: mockResolveConfig,
}));

jest.unstable_mockModule('../../../src/utils/steps-loader.js', () => ({
  loadSteps: mockLoadSteps,
  getHandler: mockGetHandler,
}));

jest.unstable_mockModule('../../../src/utils/output.js', () => ({
  saveStepOutput: mockSaveStepOutput,
  loadAllStepOutputs: mockLoadAllStepOutputs,
}));

jest.unstable_mockModule('../../../src/utils/process-files.js', () => ({
  loadProcess: mockLoadProcess,
  getStepConfigFromProcess: mockGetStepConfigFromProcess,
  findProcessesWithStep: mockFindProcessesWithStep,
  listScenarios: mockListScenarios,
  loadScenario: mockLoadScenario,
}));

jest.unstable_mockModule('../../../src/utils/picker.js', () => ({
  interactivePicker: mockInteractivePicker,
}));

const { runStepHandler } = await import('../../../src/cli/steps/run.js');

// ============================================================================
// runStepHandler()
// ============================================================================

describe('runStepHandler()', () => {
  let out;
  const mockStepHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockLoadConfig.mockReturnValue({
      stepsPath: path.join(process.cwd(), 'src/steps/index.js'),
      tempDir: path.join(process.cwd(), 'temp'),
    });
    mockLoadAllStepOutputs.mockReturnValue({});
    mockLoadSteps.mockResolvedValue({ 'acme/fetch_data': {} });
    mockGetHandler.mockReturnValue(mockStepHandler);
    mockStepHandler.mockResolvedValue({ status: 'ok' });
    mockSaveStepOutput.mockReturnValue(path.join(process.cwd(), 'temp/acme__fetch_data.json'));
    mockResolveConfig.mockImplementation(config => config);
  });

  afterEach(() => {
    out.restore();
  });

  it('should exit 1 when the step slug is not found in the registry', async () => {
    // Arrange
    mockGetHandler.mockReturnValue(null);

    // Act & Assert
    await expect(
      runStepHandler({ slug: 'acme/unknown', process: undefined, scenario: undefined, empty: false })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Unknown step: acme/unknown');
  });

  it('should run with an empty config when --empty is passed', async () => {
    // Act
    await runStepHandler({ slug: 'acme/fetch_data', process: undefined, scenario: undefined, empty: true });

    // Assert
    expect(mockStepHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        step: expect.objectContaining({ slug: 'acme/fetch_data', config: {} }),
      })
    );
    expect(out.stdout).toContain('Config: empty (--empty flag)');
  });

  it('should run with config from a process when --process is passed', async () => {
    // Arrange
    const stepConfig = { account_id: '123' };
    mockLoadProcess.mockReturnValue({ id: 'proc-1', name: 'Billing', steps: [] });
    mockGetStepConfigFromProcess.mockReturnValue(stepConfig);

    // Act
    await runStepHandler({ slug: 'acme/fetch_data', process: 'proc-1', scenario: undefined, empty: false });

    // Assert
    expect(mockResolveConfig).toHaveBeenCalledWith(stepConfig, {});
    expect(out.stdout).toContain('Config: process: Billing (proc-1)');
  });

  it('should exit 1 when the process is not found locally', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue(null);

    // Act & Assert
    await expect(
      runStepHandler({ slug: 'acme/fetch_data', process: 'proc-missing', scenario: undefined, empty: false })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Process not found locally: proc-missing');
  });

  it('should exit 1 when the step is not found in the specified process', async () => {
    // Arrange
    mockLoadProcess.mockReturnValue({ id: 'proc-1', name: 'Billing', steps: [{ slug: 'acme/other' }] });
    mockGetStepConfigFromProcess.mockReturnValue(null);

    // Act & Assert
    await expect(
      runStepHandler({ slug: 'acme/fetch_data', process: 'proc-1', scenario: undefined, empty: false })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Step "acme/fetch_data" not found in process "proc-1"');
  });

  it('should run with config from a scenario when --scenario is passed', async () => {
    // Arrange
    const scenarioConfig = { account_id: 'test-account' };
    mockLoadScenario.mockReturnValue(scenarioConfig);

    // Act
    await runStepHandler({ slug: 'acme/fetch_data', process: undefined, scenario: 'test-case', empty: false });

    // Assert
    expect(mockResolveConfig).toHaveBeenCalledWith(scenarioConfig, {});
    expect(out.stdout).toContain('Config: scenario: test-case');
  });

  it('should exit 1 when the specified scenario is not found', async () => {
    // Arrange
    mockLoadScenario.mockReturnValue(null);
    mockListScenarios.mockReturnValue(['other-scenario']);

    // Act & Assert
    await expect(
      runStepHandler({ slug: 'acme/fetch_data', process: undefined, scenario: 'missing', empty: false })
    ).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Scenario not found: missing');
  });

  it('should save step output and print it after running', async () => {
    // Act
    await runStepHandler({ slug: 'acme/fetch_data', process: undefined, scenario: undefined, empty: true });

    // Assert
    expect(mockSaveStepOutput).toHaveBeenCalledWith(
      expect.any(String),
      'acme/fetch_data',
      { status: 'ok' }
    );
    expect(out.stdout).toContain('"status": "ok"');
    expect(out.stdout).toContain('Output saved:');
    expect(out.stdout).toContain('Step completed successfully');
  });
});
