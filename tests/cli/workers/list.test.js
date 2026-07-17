import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput } from '../helpers.js';

const mockListRunningWorkers = jest.fn();

jest.unstable_mockModule('../../../src/utils/worker-processes.js', () => ({
  listRunningWorkers: mockListRunningWorkers,
}));

const { listWorkersHandler } = await import('../../../src/cli/workers/list.js');

describe('listWorkersHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should print "No running fob workers found." when there are none', async () => {
    // Arrange
    mockListRunningWorkers.mockReturnValue([]);

    // Act
    await listWorkersHandler({});

    // Assert
    expect(out.stdout).toContain('No running fob workers found.');
  });

  it('should print a table of running workers', async () => {
    // Arrange
    mockListRunningWorkers.mockReturnValue([
      {
        pid: '123',
        worker: 'worker-alex',
        mode: 'direct',
        pm2: '-',
        cwd: '/workers/worker-alex',
        port: '-',
        uptime: '1h',
        started: 'Wed Jul 16 2026',
      },
    ]);

    // Act
    await listWorkersHandler({});

    // Assert
    expect(out.stdout).toContain('WORKER');
    expect(out.stdout).toContain('worker-alex');
    expect(out.stdout).toContain('direct');
    expect(out.stdout).toContain('123');
  });

  it('should print raw JSON when --json is passed', async () => {
    // Arrange
    const rows = [{ pid: '123', worker: 'worker-alex', mode: 'direct', pm2: '-', cwd: '/w', port: '-', uptime: '1h', started: 'x' }];
    mockListRunningWorkers.mockReturnValue(rows);

    // Act
    await listWorkersHandler({ json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(rows);
  });
});
