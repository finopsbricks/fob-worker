import { describe, it, expect } from '@jest/globals';
import { formatHeader, formatField, formatTable, formatSection, formatDate, formatDuration } from '../../src/utils/format.js';

describe('formatHeader()', () => {
  it('should format label and id', () => {
    const result = formatHeader('Process', 'abc123');
    expect(result).toBe('Process: abc123');
  });

  it('should right-align status', () => {
    const result = formatHeader('Work Record', 'wr1', 'Completed');
    expect(result).toContain('Work Record: wr1');
    expect(result).toContain('Completed');
    expect(result.endsWith('Completed')).toBe(true);
  });
});

describe('formatField()', () => {
  it('should format label and value', () => {
    const result = formatField('Name', 'My Process');
    expect(result).toContain('Name:');
    expect(result).toContain('My Process');
  });

  it('should pad label to specified width', () => {
    const result = formatField('Name', 'Test', 14);
    expect(result.startsWith('Name:')).toBe(true);
    expect(result).toContain('Test');
  });

  it('should show dash for null/undefined value', () => {
    expect(formatField('Name', null)).toContain('—');
    expect(formatField('Name', undefined)).toContain('—');
  });
});

describe('formatTable()', () => {
  it('should format headers and rows', () => {
    const result = formatTable(['ID', 'NAME'], [['1', 'Foo'], ['2', 'Bar']]);
    expect(result).toContain('ID');
    expect(result).toContain('NAME');
    expect(result).toContain('Foo');
    expect(result).toContain('Bar');
    expect(result).toContain('-');
  });

  it('should handle empty rows', () => {
    const result = formatTable(['ID', 'NAME'], []);
    expect(result).toContain('(none)');
  });

  it('should handle null cell values', () => {
    const result = formatTable(['ID'], [[null]]);
    expect(result).toContain('—');
  });
});

describe('formatSection()', () => {
  it('should format section title', () => {
    const result = formatSection('Report');
    expect(result).toContain('Report');
    expect(result).toContain('---');
  });
});

describe('formatDate()', () => {
  it('should format ISO date', () => {
    const result = formatDate('2026-03-15T10:23:01.000Z');
    expect(result).toBe('2026-03-15 10:23:01');
  });

  it('should return dash for null', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatDuration()', () => {
  it('should format seconds', () => {
    const result = formatDuration('2026-03-15T10:00:00Z', '2026-03-15T10:00:30Z');
    expect(result).toBe('30s');
  });

  it('should format minutes', () => {
    const result = formatDuration('2026-03-15T10:00:00Z', '2026-03-15T10:05:00Z');
    expect(result).toBe('5m');
  });

  it('should format hours and minutes', () => {
    const result = formatDuration('2026-03-15T10:00:00Z', '2026-03-15T12:15:00Z');
    expect(result).toBe('2h 15m');
  });

  it('should format days', () => {
    const result = formatDuration('2026-03-15T10:00:00Z', '2026-03-18T10:00:00Z');
    expect(result).toBe('3d');
  });

  it('should return dash for missing values', () => {
    expect(formatDuration(null, '2026-03-15T10:00:00Z')).toBe('—');
    expect(formatDuration('2026-03-15T10:00:00Z', null)).toBe('—');
  });
});
