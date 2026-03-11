import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput, ExitError } from '../helpers.js';

const mockCreateTag = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  createTag: mockCreateTag,
}));

const { createTagHandler } = await import('../../../src/cli/tags/create.js');

describe('createTagHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should create a tag with name only', async () => {
    // Arrange
    mockCreateTag.mockResolvedValue({
      data: { id: 'tag_abc', name: 'monthly', color: '#6b7280' },
    });

    // Act
    await createTagHandler({ name: 'monthly' });

    // Assert
    expect(out.stdout).toContain('Created tag: monthly (tag_abc)');
    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'monthly' });
  });

  it('should create a tag with color and description', async () => {
    // Arrange
    mockCreateTag.mockResolvedValue({
      data: { id: 'tag_xyz', name: 'urgent', color: '#ef4444', description: 'Needs attention' },
    });

    // Act
    await createTagHandler({ name: 'urgent', color: '#ef4444', description: 'Needs attention' });

    // Assert
    expect(out.stdout).toContain('Created tag: urgent (tag_xyz)');
    expect(out.stdout).toContain('Color: #ef4444');
    expect(out.stdout).toContain('Description: Needs attention');
    expect(mockCreateTag).toHaveBeenCalledWith({
      name: 'urgent',
      color: '#ef4444',
      description: 'Needs attention',
    });
  });

  it('should exit 1 on error', async () => {
    // Arrange
    mockCreateTag.mockRejectedValue(new Error('Tag "monthly" already exists'));

    // Act & Assert
    await expect(createTagHandler({ name: 'monthly' })).rejects.toThrow(ExitError);
    expect(out.stderr).toContain('Tag "monthly" already exists');
  });
});
