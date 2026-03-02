import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  slugToFilename,
  slugToConfigFilename,
  filenameToSlug,
  loadStepOutput,
  saveStepOutput,
  loadAllStepOutputs,
} from '../../src/utils/output.js';

// ============================================================================
// slugToFilename
// ============================================================================

describe('slugToFilename()', () => {
  it('should convert a slug with one slash to double-underscore filename', () => {
    // Arrange
    const slug = 'alex/fetch_account_freshness';

    // Act
    const result = slugToFilename(slug);

    // Assert
    expect(result).toBe('alex__fetch_account_freshness.json');
  });

  it('should append .json extension', () => {
    // Arrange
    const slug = 'org/step';

    // Act
    const result = slugToFilename(slug);

    // Assert
    expect(result).toMatch(/\.json$/);
  });
});

// ============================================================================
// slugToConfigFilename
// ============================================================================

describe('slugToConfigFilename()', () => {
  it('should convert a slug to a .config.json filename', () => {
    // Arrange
    const slug = 'alex/send_email';

    // Act
    const result = slugToConfigFilename(slug);

    // Assert
    expect(result).toBe('alex__send_email.config.json');
  });

  it('should produce a different filename than slugToFilename', () => {
    // Arrange
    const slug = 'org/step';

    // Act & Assert
    expect(slugToConfigFilename(slug)).not.toBe(slugToFilename(slug));
  });
});

// ============================================================================
// filenameToSlug
// ============================================================================

describe('filenameToSlug()', () => {
  it('should reverse a slugToFilename result', () => {
    // Arrange
    const original = 'alex/fetch_account_freshness';

    // Act
    const result = filenameToSlug(slugToFilename(original));

    // Assert
    expect(result).toBe(original);
  });

  it('should replace double-underscores with a slash', () => {
    // Arrange
    const filename = 'org__step_name.json';

    // Act
    const result = filenameToSlug(filename);

    // Assert
    expect(result).toBe('org/step_name');
  });

  it('should strip the .json extension', () => {
    // Arrange
    const filename = 'a__b.json';

    // Act
    const result = filenameToSlug(filename);

    // Assert
    expect(result).not.toContain('.json');
  });
});

// ============================================================================
// loadStepOutput / saveStepOutput  (real fs, temp dir)
// ============================================================================

describe('saveStepOutput() + loadStepOutput()', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save and reload step output as JSON', () => {
    // Arrange
    const slug = 'alex/fetch_data';
    const data = { accounts: [1, 2, 3] };

    // Act
    saveStepOutput(tempDir, slug, data);
    const result = loadStepOutput(tempDir, slug);

    // Assert
    expect(result).toEqual(data);
  });

  it('should return null when output file does not exist', () => {
    // Arrange
    const slug = 'org/missing_step';

    // Act
    const result = loadStepOutput(tempDir, slug);

    // Assert
    expect(result).toBeNull();
  });

  it('should return the saved filepath', () => {
    // Arrange
    const slug = 'org/step';

    // Act
    const savedPath = saveStepOutput(tempDir, slug, {});

    // Assert
    expect(savedPath).toContain('org__step.json');
    expect(fs.existsSync(savedPath)).toBe(true);
  });
});

// ============================================================================
// loadAllStepOutputs  (real fs, temp dir)
// ============================================================================

describe('loadAllStepOutputs()', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return an empty object when the directory does not exist', () => {
    // Arrange
    const missing = path.join(tempDir, 'nonexistent');

    // Act
    const result = loadAllStepOutputs(missing);

    // Assert
    expect(result).toEqual({});
  });

  it('should load all step output files as a slug-keyed map', () => {
    // Arrange
    saveStepOutput(tempDir, 'org/step_a', { val: 1 });
    saveStepOutput(tempDir, 'org/step_b', { val: 2 });

    // Act
    const result = loadAllStepOutputs(tempDir);

    // Assert
    expect(result['org/step_a']).toEqual({ val: 1 });
    expect(result['org/step_b']).toEqual({ val: 2 });
  });

  it('should exclude .config.json files', () => {
    // Arrange
    fs.writeFileSync(path.join(tempDir, 'org__step.config.json'), '{"cfg": true}');

    // Act
    const result = loadAllStepOutputs(tempDir);

    // Assert
    expect(result['org/step']).toBeUndefined();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should skip files with invalid JSON and log a warning', () => {
    // Arrange
    fs.writeFileSync(path.join(tempDir, 'org__bad_step.json'), 'not-json');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const result = loadAllStepOutputs(tempDir);

    // Assert
    expect(result['org/bad_step']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('org__bad_step.json'));

    warnSpy.mockRestore();
  });
});
