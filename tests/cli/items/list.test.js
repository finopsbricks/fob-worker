import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { captureOutput } from '../helpers.js';

const mockListItems = jest.fn();

jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listItems: mockListItems,
}));

const { listItemsHandler } = await import('../../../src/cli/items/list.js');

describe('listItemsHandler()', () => {
  let out;

  beforeEach(() => {
    jest.clearAllMocks();
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
  });

  it('should display items in a table', async () => {
    // Arrange
    mockListItems.mockResolvedValue({
      data: [
        { id: 'item1', type: 'msa_file', status: 'active', name: 'Fund A', created_at: '2026-03-15T10:00:00Z' },
        { id: 'item2', type: 'invoice', status: 'active', name: 'Fund B', created_at: '2026-03-14T10:00:00Z' },
      ],
    });

    // Act
    await listItemsHandler({});

    // Assert
    expect(out.stdout).toContain('item1');
    expect(out.stdout).toContain('Fund A');
    expect(out.stdout).toContain('Total: 2 items');
  });

  it('should output raw JSON with --json', async () => {
    // Arrange
    const items = [{ id: 'item1', name: 'Fund A' }];
    mockListItems.mockResolvedValue({ data: items });

    // Act
    await listItemsHandler({ json: true });

    // Assert
    expect(JSON.parse(out.stdout)).toEqual(items);
  });

  it('should pass filters to API', async () => {
    // Arrange
    mockListItems.mockResolvedValue({ data: [] });

    // Act
    await listItemsHandler({ type: 'msa_file', status: 'active', tag: 'monthly' });

    // Assert
    expect(mockListItems).toHaveBeenCalledWith({ type: 'msa_file', status: 'active', tag: 'monthly' });
  });

  it('should handle empty results', async () => {
    // Arrange
    mockListItems.mockResolvedValue({ data: [] });

    // Act
    await listItemsHandler({});

    // Assert
    expect(out.stdout).toContain('No items found');
  });
});
