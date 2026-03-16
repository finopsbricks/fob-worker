import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetWorkRecord = jest.fn();
const mockGetWorkRecordActivity = jest.fn();
const mockGetEntityTags = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getWorkRecord: mockGetWorkRecord,
  getWorkRecordActivity: mockGetWorkRecordActivity,
  getEntityTags: mockGetEntityTags,
}));

const { showWorkRecordHandler } = await import('../../../src/cli/work-records/show.js');

describe('showWorkRecordHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
    mockGetEntityTags.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    out.restore();
  });

  it('should display formatted work record summary', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: {
        id: 'wr1',
        process: 'proc1',
        item: 'item1',
        status: 'completed',
        created_at: '2026-03-15T10:00:00Z',
        started_at: '2026-03-15T10:00:01Z',
        completed_at: '2026-03-15T10:05:01Z',
      },
    });

    // Act
    await showWorkRecordHandler({ id: 'wr1' });

    // Assert
    expect(out.stdout).toContain('Work Record: wr1');
    expect(out.stdout).toContain('proc1');
    expect(out.stdout).toContain('completed');
    expect(out.stdout).toContain('5m');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const record = { id: 'wr1', status: 'completed' };
    mockGetWorkRecord.mockResolvedValue({ data: record });

    // Act
    await showWorkRecordHandler({ id: 'wr1', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(record);
  });

  it('should include report with --report', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: {
        id: 'wr1', status: 'completed',
        report: 'This is the report content.',
        created_at: '2026-03-15T10:00:00Z',
      },
    });

    // Act
    await showWorkRecordHandler({ id: 'wr1', report: true });

    // Assert
    expect(out.stdout).toContain('Report');
    expect(out.stdout).toContain('This is the report content.');
    expect(mockGetWorkRecord).toHaveBeenCalledWith('wr1', { include: ['report'] });
  });

  it('should include step outputs with --steps', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: {
        id: 'wr1', status: 'completed',
        step_outputs: { 'alex/fetch_data': { result: 'ok' } },
        created_at: '2026-03-15T10:00:00Z',
      },
    });

    // Act
    await showWorkRecordHandler({ id: 'wr1', steps: true });

    // Assert
    expect(out.stdout).toContain('Step Outputs');
    expect(out.stdout).toContain('alex/fetch_data');
    expect(out.stdout).toContain('"result": "ok"');
  });

  it('should include supporting docs with --supporting-docs', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: {
        id: 'wr1', status: 'completed',
        supporting_docs: [
          { id: 'doc1', type: 'markdown', title: 'Analysis', step_slug: 'step1', created_at: '2026-03-15T10:00:00Z' },
        ],
        created_at: '2026-03-15T10:00:00Z',
      },
    });

    // Act
    await showWorkRecordHandler({ id: 'wr1', supportingDocs: true });

    // Assert
    expect(out.stdout).toContain('Supporting Documents');
    expect(out.stdout).toContain('doc1');
    expect(out.stdout).toContain('Analysis');
  });

  it('should include activity with --activity', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: { id: 'wr1', status: 'completed', created_at: '2026-03-15T10:00:00Z' },
    });
    mockGetWorkRecordActivity.mockResolvedValue({
      data: [
        { created_at: '2026-03-15T10:00:00Z', event: 'started', action_type: 'run', user: 'system' },
      ],
    });

    // Act
    await showWorkRecordHandler({ id: 'wr1', activity: true });

    // Assert
    expect(out.stdout).toContain('Activity');
    expect(out.stdout).toContain('started');
    expect(mockGetWorkRecordActivity).toHaveBeenCalledWith('wr1');
  });

  it('should include all sections with --all', async () => {
    // Arrange
    mockGetWorkRecord.mockResolvedValue({
      data: {
        id: 'wr1', status: 'completed',
        report: 'Report text',
        step_outputs: {},
        supporting_docs: [],
        created_at: '2026-03-15T10:00:00Z',
      },
    });
    mockGetWorkRecordActivity.mockResolvedValue({ data: [] });

    // Act
    await showWorkRecordHandler({ id: 'wr1', all: true });

    // Assert
    expect(mockGetWorkRecord).toHaveBeenCalledWith('wr1', { include: ['report', 'step_outputs', 'supporting_docs'] });
    expect(mockGetWorkRecordActivity).toHaveBeenCalledWith('wr1');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetWorkRecord.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showWorkRecordHandler({ id: 'wr1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
