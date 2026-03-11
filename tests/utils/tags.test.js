import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockListTags = jest.fn();
const mockCreateTag = jest.fn();

jest.unstable_mockModule('../../src/utils/orchestrator.js', () => ({
  listTags: mockListTags,
  createTag: mockCreateTag,
}));

const { resolveTagName, ensureTag, resolveTagNames } = await import('../../src/utils/tags.js');

// ============================================================================
// resolveTagName()
// ============================================================================

describe('resolveTagName()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return tag ID when tag exists', async () => {
    // Arrange
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly', color: '#6b7280' }],
    });

    // Act
    const result = await resolveTagName('monthly');

    // Assert
    expect(result).toBe('tag1');
  });

  it('should return null when tag does not exist', async () => {
    // Arrange
    mockListTags.mockResolvedValue({ data: [] });

    // Act
    const result = await resolveTagName('nonexistent');

    // Assert
    expect(result).toBeNull();
  });
});

// ============================================================================
// ensureTag()
// ============================================================================

describe('ensureTag()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing tag ID with created=false', async () => {
    // Arrange
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly', color: '#6b7280' }],
    });

    // Act
    const result = await ensureTag('monthly');

    // Assert
    expect(result).toEqual({ id: 'tag1', created: false });
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it('should create tag and return new ID with created=true', async () => {
    // Arrange
    mockListTags.mockResolvedValue({ data: [] });
    mockCreateTag.mockResolvedValue({ data: { id: 'tag_new', name: 'quarterly' } });

    // Act
    const result = await ensureTag('quarterly');

    // Assert
    expect(result).toEqual({ id: 'tag_new', created: true });
    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'quarterly' });
  });
});

// ============================================================================
// resolveTagNames()
// ============================================================================

describe('resolveTagNames()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty arrays for empty input', async () => {
    // Act
    const result = await resolveTagNames([]);

    // Assert
    expect(result).toEqual({ tagIds: [], createdNames: [] });
    expect(mockListTags).not.toHaveBeenCalled();
  });

  it('should return empty arrays for null input', async () => {
    // Act
    const result = await resolveTagNames(null);

    // Assert
    expect(result).toEqual({ tagIds: [], createdNames: [] });
  });

  it('should resolve existing names to IDs', async () => {
    // Arrange
    mockListTags.mockResolvedValue({
      data: [
        { id: 'tag1', name: 'monthly' },
        { id: 'tag2', name: 'high-priority' },
      ],
    });

    // Act
    const result = await resolveTagNames(['monthly', 'high-priority']);

    // Assert
    expect(result.tagIds).toEqual(['tag1', 'tag2']);
    expect(result.createdNames).toEqual([]);
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it('should auto-create missing tags and include in createdNames', async () => {
    // Arrange
    mockListTags.mockResolvedValue({
      data: [{ id: 'tag1', name: 'monthly' }],
    });
    mockCreateTag.mockResolvedValue({ data: { id: 'tag_new', name: 'quarterly' } });

    // Act
    const result = await resolveTagNames(['monthly', 'quarterly']);

    // Assert
    expect(result.tagIds).toEqual(['tag1', 'tag_new']);
    expect(result.createdNames).toEqual(['quarterly']);
    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'quarterly' });
  });
});
