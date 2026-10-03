import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockLoadSteps = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule('../../../src/utils/steps-loader.js', () => ({
  loadSteps: mockLoadSteps,
}));

const { listStepsHandler } = await import('../../../src/cli/steps/list.js');

// ============================================================================
// listStepsHandler()
// ============================================================================

describe('listStepsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockLoadConfig.mockReturnValue({
      stepsDir: path.join(process.cwd(), 'src/steps'),
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print a table with slug, folder, and file columns', async () => {
    // Arrange
    mockLoadSteps.mockResolvedValue({
      'acme/fetch_data': { _file: 'billing/fetch_data.js' },
      'acme/process_data': { _file: 'billing/process_data.js' },
    });

    // Act
    await listStepsHandler();

    // Assert
    expect(out.stdout).toContain('acme/fetch_data');
    expect(out.stdout).toContain('billing');
    expect(out.stdout).toContain('fetch_data.js');
    expect(out.stdout).toContain('Total: 2 steps');
  });

  it('should extract folder and file correctly from step file paths', async () => {
    // Arrange
    mockLoadSteps.mockResolvedValue({
      'acme/top_level': { _file: 'top_level.js' },
    });

    // Act
    await listStepsHandler();

    // Assert
    expect(out.stdout).toContain('acme/top_level');
    expect(out.stdout).toContain('top_level.js');
    // folder should be '-' for top-level files
    expect(out.stdout).toContain('-');
  });

  it('should print steps sorted by folder, then file', async () => {
    // Arrange
    mockLoadSteps.mockResolvedValue({
      'acme/z_last': { _file: 'z_last.js' },
      'acme/a_first': { _file: 'a_first.js' },
      'acme/m_middle': { _file: 'm_middle.js' },
    });

    // Act
    await listStepsHandler();

    // Assert
    const stdout = out.stdout;
    expect(stdout.indexOf('a_first')).toBeLessThan(stdout.indexOf('m_middle'));
    expect(stdout.indexOf('m_middle')).toBeLessThan(stdout.indexOf('z_last'));
  });

  it('should print "No steps found" when the registry is empty', async () => {
    // Arrange
    mockLoadSteps.mockResolvedValue({});

    // Act
    await listStepsHandler();

    // Assert
    expect(out.stdout).toContain('No steps found');
  });
});
