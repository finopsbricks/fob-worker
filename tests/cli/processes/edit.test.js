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

const { editProcessHandler } = await import('../../../src/cli/processes/edit.js');

describe('editProcessHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should add an existing tag to a process', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag1', name: 'monthly' }] });

    // Act
    await editProcessHandler({ id: 'proc1', addTag: 'monthly' });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc1', ['tag1']);
    expect(out.stdout).toContain('Tags updated');
  });

  it('should auto-create a tag that does not exist', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({ data: [] });
    mockCreateTag.mockResolvedValue({ data: { id: 'tag_new', name: 'quarterly' } });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag_new', name: 'quarterly' }] });

    // Act
    await editProcessHandler({ id: 'proc1', addTag: 'quarterly' });

    // Assert
    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'quarterly' });
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc1', ['tag_new']);
    expect(out.stdout).toContain('(created)');
  });

  it('should remove a tag from a process', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [] });

    // Act
    await editProcessHandler({ id: 'proc1', removeTag: 'monthly' });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc1', []);
    expect(out.stdout).toContain('- monthly');
  });

  it('should handle add and remove in the same call', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'low-priority' }],
    });
    mockListTags
      .mockResolvedValueOnce({ data: [{ id: 'tag2', name: 'high-priority' }] })
      .mockResolvedValueOnce({ data: [{ id: 'tag1', name: 'low-priority' }, { id: 'tag2', name: 'high-priority' }] });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag2', name: 'high-priority' }] });

    // Act
    await editProcessHandler({
      id: 'proc1',
      addTag: 'high-priority',
      removeTag: 'low-priority',
    });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'proc1', ['tag2']);
  });

  it('should exit 1 when no --add-tag or --remove-tag provided', async () => {
    // Act & Assert
    await expect(editProcessHandler({ id: 'proc1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('At least one --add-tag or --remove-tag is required');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetEntityTags.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(editProcessHandler({ id: 'proc1', addTag: 'monthly' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
