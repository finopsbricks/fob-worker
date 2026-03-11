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

const { editWorkRecordHandler } = await import('../../../src/cli/work-records/edit.js');

describe('editWorkRecordHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should add a tag to a work record using work-records entity type', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'reviewed' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag1', name: 'reviewed' }] });

    // Act
    await editWorkRecordHandler({ id: 'wr1', addTag: 'reviewed' });

    // Assert
    expect(mockGetEntityTags).toHaveBeenCalledWith('work-records', 'wr1');
    expect(mockSetEntityTags).toHaveBeenCalledWith('work-records', 'wr1', ['tag1']);
    expect(out.stdout).toContain('Tags updated');
  });

  it('should exit 1 when no flags provided', async () => {
    // Act & Assert
    await expect(editWorkRecordHandler({ id: 'wr1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('At least one --add-tag or --remove-tag is required');
  });
});
