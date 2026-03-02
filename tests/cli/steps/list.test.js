import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockLoadStepsWithFiles = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule('../../../src/utils/steps-loader.js', () => ({
  loadStepsWithFiles: mockLoadStepsWithFiles,
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
      stepsPath: path.join(process.cwd(), 'src/steps/index.js'),
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print a table with slug, folder, and file columns', async () => {
    // Arrange
    mockLoadStepsWithFiles.mockResolvedValue({
      steps: {
        'acme/fetch_data': {},
        'acme/process_data': {},
      },
      files: {
        'acme/fetch_data': './billing/fetch_data.js',
        'acme/process_data': './billing/process_data.js',
      },
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
    mockLoadStepsWithFiles.mockResolvedValue({
      steps: { 'acme/top_level': {} },
      files: { 'acme/top_level': './top_level.js' },
    });

    // Act
    await listStepsHandler();

    // Assert
    expect(out.stdout).toContain('acme/top_level');
    expect(out.stdout).toContain('top_level.js');
    // folder should be '-' for top-level files
    expect(out.stdout).toContain('-');
  });

  it('should print steps sorted alphabetically by slug', async () => {
    // Arrange
    mockLoadStepsWithFiles.mockResolvedValue({
      steps: {
        'acme/z_last': {},
        'acme/a_first': {},
        'acme/m_middle': {},
      },
      files: {
        'acme/z_last': './z_last.js',
        'acme/a_first': './a_first.js',
        'acme/m_middle': './m_middle.js',
      },
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
    mockLoadStepsWithFiles.mockResolvedValue({ steps: {}, files: {} });

    // Act
    await listStepsHandler();

    // Assert
    expect(out.stdout).toContain('No steps found');
  });
});
