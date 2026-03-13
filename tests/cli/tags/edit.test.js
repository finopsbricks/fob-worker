import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockUpdateTag = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  updateTag: mockUpdateTag,
}));

const { editTagHandler } = await import('../../../src/cli/tags/edit.js');

describe('editTagHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should update a tag with a single field', async () => {
    // Arrange
    mockUpdateTag.mockResolvedValue({
      data: { id: 'tag_abc', name: 'monthly', color: '#e3342f', description: null },
    });

    // Act
    await editTagHandler({ id: 'tag_abc', color: '#e3342f' });

    // Assert
    expect(mockUpdateTag).toHaveBeenCalledWith('tag_abc', { color: '#e3342f' });
    expect(out.stdout).toContain('Updated tag: monthly (tag_abc)');
    expect(out.stdout).toContain('Color: #e3342f');
  });

  it('should update a tag with multiple fields', async () => {
    // Arrange
    mockUpdateTag.mockResolvedValue({
      data: { id: 'tag_abc', name: 'quarterly', color: '#0075ca', description: 'Every quarter' },
    });

    // Act
    await editTagHandler({ id: 'tag_abc', name: 'quarterly', description: 'Every quarter' });

    // Assert
    expect(mockUpdateTag).toHaveBeenCalledWith('tag_abc', { name: 'quarterly', description: 'Every quarter' });
    expect(out.stdout).toContain('Updated tag: quarterly (tag_abc)');
    expect(out.stdout).toContain('Description: Every quarter');
  });

  it('should exit 1 when no flags provided', async () => {
    // Act & Assert
    await expect(editTagHandler({ id: 'tag_abc' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('At least one of --name, --color, or --description is required');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockUpdateTag.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(editTagHandler({ id: 'tag_bad', name: 'x' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
