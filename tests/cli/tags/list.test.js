import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockListTags = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listTags: mockListTags,
}));

const { listTagsHandler } = await import('../../../src/cli/tags/list.js');

describe('listTagsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should print a formatted table of tags', async () => {
    // Arrange
    mockListTags.mockResolvedValue({
      data: [
        { id: 'tag1', name: 'monthly', color: '#6b7280', usage: { process: 2, item: 0, work_record: 1, total: 3 } },
        { id: 'tag2', name: 'high-priority', color: '#ef4444', usage: { process: 1, item: 3, work_record: 0, total: 4 } },
      ],
    });

    // Act
    await listTagsHandler();

    // Assert
    expect(out.stdout).toContain('tag1');
    expect(out.stdout).toContain('monthly');
    expect(out.stdout).toContain('#6b7280');
    expect(out.stdout).toContain('tag2');
    expect(out.stdout).toContain('high-priority');
    expect(out.stdout).toContain('Total: 2 tags');
  });

  it('should print "No tags found" when list is empty', async () => {
    // Arrange
    mockListTags.mockResolvedValue({ data: [] });

    // Act
    await listTagsHandler();

    // Assert
    expect(out.stdout).toContain('No tags found');
  });

  it('should exit 1 on error', async () => {
    // Arrange
    mockListTags.mockRejectedValue(new Error('ECONNREFUSED'));

    // Act & Assert
    await expect(listTagsHandler()).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('ECONNREFUSED');
  });
});
