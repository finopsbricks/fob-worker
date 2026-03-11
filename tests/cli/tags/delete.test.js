import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockDeleteTag = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  deleteTag: mockDeleteTag,
}));

const { deleteTagHandler } = await import('../../../src/cli/tags/delete.js');

describe('deleteTagHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should delete a tag by ID', async () => {
    // Arrange
    mockDeleteTag.mockResolvedValue();

    // Act
    await deleteTagHandler({ id: 'tag_abc' });

    // Assert
    expect(out.stdout).toContain('Deleted tag: tag_abc');
    expect(mockDeleteTag).toHaveBeenCalledWith('tag_abc');
  });

  it('should exit 1 on error', async () => {
    // Arrange
    mockDeleteTag.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(deleteTagHandler({ id: 'tag_bad' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
