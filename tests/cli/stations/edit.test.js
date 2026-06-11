import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockGetEntityTags = jest.fn();
const mockSetEntityTags = jest.fn();
const mockListTags = jest.fn();
const mockCreateTag = jest.fn();
const mockUpdateStation = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  getEntityTags: mockGetEntityTags,
  setEntityTags: mockSetEntityTags,
  listTags: mockListTags,
  createTag: mockCreateTag,
  updateStation: mockUpdateStation,
}));

const { editStationHandler } = await import('../../../src/cli/stations/edit.js');

describe('editStationHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should add an existing tag to a station', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag1', name: 'monthly' }] });

    // Act
    await editStationHandler({ id: 'st1', addTag: 'monthly' });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st1', ['tag1']);
    expect(out.stdout).toContain('Tags updated');
  });

  it('should auto-create a tag that does not exist', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({ data: [] });
    mockListTags.mockResolvedValue({ data: [] });
    mockCreateTag.mockResolvedValue({ data: { id: 'tag_new', name: 'quarterly' } });
    mockSetEntityTags.mockResolvedValue({ data: [{ id: 'tag_new', name: 'quarterly' }] });

    // Act
    await editStationHandler({ id: 'st1', addTag: 'quarterly' });

    // Assert
    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'quarterly' });
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st1', ['tag_new']);
    expect(out.stdout).toContain('(created)');
  });

  it('should remove a tag from a station', async () => {
    // Arrange
    mockGetEntityTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockSetEntityTags.mockResolvedValue({ data: [] });

    // Act
    await editStationHandler({ id: 'st1', removeTag: 'monthly' });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st1', []);
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
    await editStationHandler({
      id: 'st1',
      addTag: 'high-priority',
      removeTag: 'low-priority',
    });

    // Assert
    expect(mockSetEntityTags).toHaveBeenCalledWith('processes', 'st1', ['tag2']);
  });

  it('should set the short_code when --short-code is provided', async () => {
    // Arrange
    mockUpdateStation.mockResolvedValue({});

    // Act
    await editStationHandler({ id: 'st1', shortCode: 'P9' });

    // Assert
    expect(mockUpdateStation).toHaveBeenCalledWith('st1', { short_code: 'P9' });
    expect(out.stdout).toContain('Short code set: P9');
  });

  it('should exit 1 when no --short-code/--add-tag/--remove-tag provided', async () => {
    // Act & Assert
    await expect(editStationHandler({ id: 'st1' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('At least one of --short-code, --add-tag, or --remove-tag is required');
  });

  it('should exit 1 on API error', async () => {
    // Arrange
    mockGetEntityTags.mockRejectedValue(new Error('Not found'));

    // Act & Assert
    await expect(editStationHandler({ id: 'st1', addTag: 'monthly' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Not found');
  });
});
