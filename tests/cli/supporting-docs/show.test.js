import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetSupportingDoc = jest.fn();
const mockDownloadSupportingDoc = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getSupportingDoc: mockGetSupportingDoc,
  downloadSupportingDoc: mockDownloadSupportingDoc,
}));

const { showSupportingDocHandler } = await import('../../../src/cli/supporting-docs/show.js');

describe('showSupportingDocHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should display markdown document with content', async () => {
    // Arrange
    mockGetSupportingDoc.mockResolvedValue({
      data: {
        id: 'doc1',
        title: 'Analysis Report',
        type: 'markdown',
        step_slug: 'step1',
        work_record_id: 'wr1',
        content: '# Summary\nEverything looks good.',
        created_at: '2026-03-15T10:00:00Z',
      },
    });

    // Act
    await showSupportingDocHandler({ id: 'doc1' });

    // Assert
    expect(out.stdout).toContain('Supporting Document: doc1');
    expect(out.stdout).toContain('Analysis Report');
    expect(out.stdout).toContain('markdown');
    expect(out.stdout).toContain('# Summary');
    expect(out.stdout).toContain('Everything looks good.');
  });

  it('should display file document with download hint', async () => {
    // Arrange
    mockGetSupportingDoc.mockResolvedValue({
      data: {
        id: 'doc2',
        title: 'Invoice PDF',
        type: 'file',
        step_slug: 'step2',
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 12345,
        work_record_id: 'wr1',
        created_at: '2026-03-15T10:00:00Z',
      },
    });

    // Act
    await showSupportingDocHandler({ id: 'doc2' });

    // Assert
    expect(out.stdout).toContain('Invoice PDF');
    expect(out.stdout).toContain('invoice.pdf');
    expect(out.stdout).toContain('12345 bytes');
    expect(out.stdout).toContain('--save');
  });

  it('should download file with --save', async () => {
    // Arrange
    mockGetSupportingDoc.mockResolvedValue({
      data: {
        id: 'doc2',
        title: 'Invoice PDF',
        type: 'file',
        work_record_id: 'wr1',
        created_at: '2026-03-15T10:00:00Z',
      },
    });
    mockDownloadSupportingDoc.mockResolvedValue('/tmp/invoice.pdf');

    // Act
    await showSupportingDocHandler({ id: 'doc2', save: '/tmp/invoice.pdf' });

    // Assert
    expect(mockDownloadSupportingDoc).toHaveBeenCalledWith('doc2', '/tmp/invoice.pdf');
    expect(out.stdout).toContain('Saved to: /tmp/invoice.pdf');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const doc = { id: 'doc1', title: 'Test' };
    mockGetSupportingDoc.mockResolvedValue({ data: doc });

    // Act
    await showSupportingDocHandler({ id: 'doc1', json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(doc);
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetSupportingDoc.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(showSupportingDocHandler({ id: 'doc1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
