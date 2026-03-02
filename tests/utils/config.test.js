import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfig, ensureTempDir, getRelevantEnvVars } from '../../src/utils/config.js';

// ============================================================================
// loadConfig
// ============================================================================

describe('loadConfig()', () => {
  it('should return stepsPath relative to cwd', () => {
    // Arrange
    const cwd = process.cwd();

    // Act
    const config = loadConfig();

    // Assert
    expect(config.stepsPath).toBe(path.resolve(cwd, './src/steps/index.js'));
  });

  it('should return tempDir relative to cwd', () => {
    // Arrange
    const cwd = process.cwd();

    // Act
    const config = loadConfig();

    // Assert
    expect(config.tempDir).toBe(path.resolve(cwd, './temp'));
  });

  it('should return an object with exactly stepsPath and tempDir', () => {
    // Act
    const config = loadConfig();

    // Assert
    expect(Object.keys(config).sort()).toEqual(['stepsPath', 'tempDir'].sort());
  });
});

// ============================================================================
// ensureTempDir
// ============================================================================

describe('ensureTempDir()', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `fob-test-ensure-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create the directory if it does not exist', () => {
    // Arrange — dir does not exist yet

    // Act
    ensureTempDir(tempDir);

    // Assert
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('should not throw if the directory already exists', () => {
    // Arrange
    fs.mkdirSync(tempDir);

    // Act & Assert
    expect(() => ensureTempDir(tempDir)).not.toThrow();
  });
});

// ============================================================================
// getRelevantEnvVars
// ============================================================================

describe('getRelevantEnvVars()', () => {
  let original;

  beforeEach(() => {
    original = {
      ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL,
      STEP_PREFIX: process.env.STEP_PREFIX,
      ORCHESTRATOR_API_KEY: process.env.ORCHESTRATOR_API_KEY,
      ORCHESTRATOR_API_SECRET: process.env.ORCHESTRATOR_API_SECRET,
    };
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('should return ORCHESTRATOR_URL as-is when set', () => {
    // Arrange
    process.env.ORCHESTRATOR_URL = 'https://api.example.com';

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.ORCHESTRATOR_URL).toBe('https://api.example.com');
  });

  it('should return STEP_PREFIX as-is when set', () => {
    // Arrange
    process.env.STEP_PREFIX = 'alex';

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.STEP_PREFIX).toBe('alex');
  });

  it('should show first 10 and last 5 chars of ORCHESTRATOR_API_KEY when long enough', () => {
    // Arrange
    process.env.ORCHESTRATOR_API_KEY = 'abcdefghij12345678901234567890';

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.ORCHESTRATOR_API_KEY).toBe('abcdefghij***************67890');
  });

  it('should mask ORCHESTRATOR_API_KEY with *** when too short to partially reveal', () => {
    // Arrange
    process.env.ORCHESTRATOR_API_KEY = 'short-key';

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.ORCHESTRATOR_API_KEY).toBe('***');
  });

  it('should mask ORCHESTRATOR_API_SECRET with *** when too short to partially reveal', () => {
    // Arrange
    process.env.ORCHESTRATOR_API_SECRET = 'super-secret';

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.ORCHESTRATOR_API_SECRET).toBe('***');
  });

  it('should return undefined for unset vars', () => {
    // Arrange
    delete process.env.ORCHESTRATOR_URL;
    delete process.env.STEP_PREFIX;
    delete process.env.ORCHESTRATOR_API_KEY;
    delete process.env.ORCHESTRATOR_API_SECRET;

    // Act
    const result = getRelevantEnvVars();

    // Assert
    expect(result.ORCHESTRATOR_URL).toBeUndefined();
    expect(result.STEP_PREFIX).toBeUndefined();
    expect(result.ORCHESTRATOR_API_KEY).toBeUndefined();
    expect(result.ORCHESTRATOR_API_SECRET).toBeUndefined();
  });
});
