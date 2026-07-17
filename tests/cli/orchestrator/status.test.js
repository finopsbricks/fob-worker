import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput } from '../helpers.js';

const mockCheckConnection = jest.fn();
const mockGetOrchestratorConfig = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  checkConnection: mockCheckConnection,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

const { orchestratorStatusHandler } = await import('../../../src/cli/orchestrator/status.js');

// ============================================================================
// orchestratorStatusHandler()
// ============================================================================

describe('orchestratorStatusHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({
      url: 'https://orchestrator.example.com',
      org: 'acme',
      hasSecret: true,
      hasApiKey: true,
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print "Connected" when the connection succeeds', async () => {
    // Arrange
    mockCheckConnection.mockResolvedValue({ connected: true, status: 200 });

    // Act
    await orchestratorStatusHandler();

    // Assert
    expect(out.stdout).toContain('Status: Connected');
    expect(out.stdout).toContain('HTTP: 200');
  });

  it('should print "Not connected" with the error message when connection fails', async () => {
    // Arrange
    mockCheckConnection.mockResolvedValue({ connected: false, error: 'ECONNREFUSED' });

    // Act
    await orchestratorStatusHandler();

    // Assert
    expect(out.stdout).toContain('Status: Not connected');
    expect(out.stdout).toContain('Error: ECONNREFUSED');
  });

  it('should print "Not connected" with the HTTP status when server returns an error code', async () => {
    // Arrange
    mockCheckConnection.mockResolvedValue({ connected: false, status: 401 });

    // Act
    await orchestratorStatusHandler();

    // Assert
    expect(out.stdout).toContain('Status: Not connected');
    expect(out.stdout).toContain('HTTP: 401');
  });
});
