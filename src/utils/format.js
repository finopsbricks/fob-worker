/**
 * Shared formatting helpers for CLI output.
 * Structured text readable by both humans and LLMs.
 */

/**
 * Format a header line with right-aligned status.
 * "Work Record: abc123                    Completed"
 */
export function formatHeader(label, id, status) {
  const left = `${label}: ${id}`;
  if (!status) return left;
  const minGap = 4;
  const width = Math.max(left.length + minGap + status.length, 60);
  return left + ' '.repeat(width - left.length - status.length) + status;
}

/**
 * Format a label: value field with aligned label.
 * "Name:      Monthly Debt & Equity Monitoring"
 */
export function formatField(label, value, labelWidth = 0) {
  const padded = (label + ':').padEnd(labelWidth || label.length + 1);
  return `${padded}  ${value ?? '—'}`;
}

/**
 * Format a table with dynamic column widths.
 * @param {string[]} headers - Column header names
 * @param {string[][]} rows - Array of row arrays (strings)
 * @returns {string} Formatted table string
 */
export function formatTable(headers, rows) {
  if (rows.length === 0) {
    return headers.join('  ') + '\n(none)';
  }

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );

  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = '-'.repeat(headerLine.length);
  const dataLines = rows.map(row =>
    row.map((cell, i) => (cell || '—').padEnd(widths[i])).join('  ')
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

/**
 * Format a section divider.
 * "--- Title ---"
 */
export function formatSection(title) {
  return `\n--- ${title} ---\n`;
}

/**
 * Format an ISO date string to human-readable.
 * "2026-03-15 10:23:01"
 */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Format duration between two ISO timestamps.
 * "1m" / "2h 15m" / "3d 4h"
 */
export function formatDuration(start, end) {
  if (!start || !end) return '—';
  const ms = new Date(end) - new Date(start);
  if (ms < 0) return '—';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
