import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { captureOutput } from '../helpers.js';

const mockLoadConfig = jest.fn();
const mockGetRelevantEnvVars = jest.fn();

jest.unstable_mockModule('../../../src/utils/config.js', () => ({
  loadConfig: mockLoadConfig,
  getRelevantEnvVars: mockGetRelevantEnvVars,
  ensureTempDir: jest.fn(),
}));

const { showConfigHandler } = await import('../../../src/cli/config/show.js');

// ============================================================================
// showConfigHandler()
// ============================================================================

describe('showConfigHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockLoadConfig.mockReturnValue({
      stepsPath: path.join(process.cwd(), 'src/steps/index.js'),
      tempDir: path.join(process.cwd(), 'temp'),
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print the header and resolved paths', () => {
    // Arrange
    mockGetRelevantEnvVars.mockReturnValue({});

    // Act
    showConfigHandler();

    // Assert
    expect(out.stdout).toContain('fob config show');
    expect(out.stdout).toContain('stepsPath');
    expect(out.stdout).toContain('src/steps/index.js');
    expect(out.stdout).toContain('tempDir');
    expect(out.stdout).toContain('temp');
  });

  it('should print environment variables when set', () => {
    // Arrange
    mockGetRelevantEnvVars.mockReturnValue({
      ORCHESTRATOR_URL: 'https://orchestrator.example.com',
      ORCHESTRATOR_API_KEY: '***',
      STEP_PREFIX: 'acme',
    });

    // Act
    showConfigHandler();

    // Assert
    expect(out.stdout).toContain('Environment Variables');
    expect(out.stdout).toContain('ORCHESTRATOR_URL');
    expect(out.stdout).toContain('https://orchestrator.example.com');
    expect(out.stdout).toContain('ORCHESTRATOR_API_KEY');
    expect(out.stdout).toContain('***');
  });

  it('should skip the environment variables section when all vars are undefined', () => {
    // Arrange
    mockGetRelevantEnvVars.mockReturnValue({
      ORCHESTRATOR_URL: undefined,
      ORCHESTRATOR_API_KEY: undefined,
      STEP_PREFIX: undefined,
    });

    // Act
    showConfigHandler();

    // Assert
    expect(out.stdout).not.toContain('Environment Variables');
  });
});
