import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetEntityTags = jest.fn();
const mockSetEntityTags = jest.fn();
const mockListTags = jest.fn();
const mockCreateTag = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getEntityTags: mockGetEntityTags,
  setEntityTags: mockSetEntityTags,
  listTags: mockListTags,
  createTag: mockCreateTag,
}));

const { editItemHandler } = await import('../../../src/cli/items/edit.js');

describe('editItemHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should add a tag to an item using items entity type', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'reviewed' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag1', name: 'reviewed' }] });

    // Act
    await editItemHandler({ id: 'item1', addTag: 'reviewed' });

    // Assert
    expect(mockGetEntityTags).toHaveBeenCalledWith('items', 'item1');
    expect(mockSetEntityTags).toHaveBeenCalledWith('items', 'item1', ['tag1']);
    expect(out.stdout).toContain('Tags updated');
  });

  it('should exit 1 when no flags provided', async () => {
    // Act & Assert
    await expect(editItemHandler({ id: 'item1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('At least one --add-tag or --remove-tag is required');
  });
});
