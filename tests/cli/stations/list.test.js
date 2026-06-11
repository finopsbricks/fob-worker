import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListStations = jest.fn();
const mockGetOrchestratorConfig = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listStations: mockListStations,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

const { listStationsHandler } = await import('../../../src/cli/stations/list.js');

describe('listStationsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetOrchestratorConfig.mockReturnValue({
      url: 'https://orchestrator.example.com',
      org: 'acme',
      hasApiKey: true,
    });
  });

  afterEach(() => {
    out.restore();
  });

  it('should print a formatted table of stations', async () => {
    // Arrange
    mockListStations.mockResolvedValue({
      data: [
        { id: 'st-abc', name: 'Monthly Billing', steps: [{}, {}] },
        { id: 'st-xyz', name: 'Onboarding', steps: [{}] },
      ],
    });

    // Act
    await listStationsHandler();

    // Assert
    expect(out.stdout).toContain('st-abc');
    expect(out.stdout).toContain('Monthly Billing');
    expect(out.stdout).toContain('st-xyz');
    expect(out.stdout).toContain('Onboarding');
    expect(out.stdout).toContain('Total: 2 stations');
  });

  it('should print "No stations found" when the list is empty', async () => {
    // Arrange
    mockListStations.mockResolvedValue({ data: [] });

    // Act
    await listStationsHandler();

    // Assert
    expect(out.stdout).toContain('No stations found');
  });

  it('should exit 1 with the error message on network failure', async () => {
    // Arrange
    mockListStations.mockRejectedValue(new Error('ECONNREFUSED'));

    // Act & Assert
    await expect(listStationsHandler()).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('ECONNREFUSED');
  });
});
