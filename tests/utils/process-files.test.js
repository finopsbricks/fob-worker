import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  getStepConfigFromProcess,
  getProcessesDir,
  getScenariosDir,
  saveProcess,
  loadProcess,
  listLocalProcesses,
  findProcessesWithStep,
  listScenarios,
  loadScenario,
  saveScenario,
} from '../../src/utils/process-files.js';

// ============================================================================
// Pure logic (no fs)
// ============================================================================

describe('getProcessesDir()', () => {
  it('should return the processes directory path', () => {
    expect(getProcessesDir()).toBe('.orchestrator/processes');
  });
});

describe('getScenariosDir()', () => {
  it('should return the scenarios directory path', () => {
    expect(getScenariosDir()).toBe('.orchestrator/scenarios');
  });
});

describe('getStepConfigFromProcess()', () => {
  const proc = {
    id: 'proc1',
    name: 'My Process',
    steps: [
      { slug: 'org/step_a', config: { key: 'val_a' } },
      { slug: 'org/step_b', config: { key: 'val_b' } },
    ],
  };

  it('should return the config for a matching step slug', () => {
    // Act
    const result = getStepConfigFromProcess(proc, 'org/step_a');

    // Assert
    expect(result).toEqual({ key: 'val_a' });
  });

  it('should return null when the step slug is not found', () => {
    // Act
    const result = getStepConfigFromProcess(proc, 'org/missing');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the process has no steps', () => {
    // Arrange
    const emptyProc = { id: 'p2', name: 'Empty', steps: [] };

    // Act
    const result = getStepConfigFromProcess(emptyProc, 'org/step_a');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when steps is undefined', () => {
    // Arrange
    const noSteps = { id: 'p3', name: 'No Steps' };

    // Act
    const result = getStepConfigFromProcess(noSteps, 'org/step_a');

    // Assert
    expect(result).toBeNull();
  });
});

// ============================================================================
// fs-dependent — use real temp dir, chdir into it
// ============================================================================

describe('saveProcess() + loadProcess() + listLocalProcesses()', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-process-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save and reload a process by id', () => {
    // Arrange
    const proc = { id: 'abc123', name: 'Test Process', steps: [] };

    // Act
    saveProcess(proc);
    const loaded = loadProcess('abc123');

    // Assert
    expect(loaded).toEqual(proc);
  });

  it('should return null for a process that was never saved', () => {
    // Act
    const result = loadProcess('nonexistent');

    // Assert
    expect(result).toBeNull();
  });

  it('should list saved process ids', () => {
    // Arrange
    saveProcess({ id: 'id1', name: 'Process One', steps: [] });
    saveProcess({ id: 'id2', name: 'Process Two', steps: [] });

    // Act
    const ids = listLocalProcesses();

    // Assert
    expect(ids).toContain('id1');
    expect(ids).toContain('id2');
  });

  it('should return empty array when no processes saved', () => {
    // Act
    const ids = listLocalProcesses();

    // Assert
    expect(ids).toEqual([]);
  });

  it('should replace old file when process name changes', () => {
    // Arrange
    const proc = { id: 'rename1', name: 'Old Name', steps: [] };
    saveProcess(proc);

    // Act
    saveProcess({ ...proc, name: 'New Name' });
    const loaded = loadProcess('rename1');

    // Assert
    expect(loaded.name).toBe('New Name');

    // Only one file should exist for this id
    const files = fs.readdirSync('.orchestrator/processes');
    const forId = files.filter(f => f.startsWith('rename1__'));
    expect(forId).toHaveLength(1);
  });
});

describe('findProcessesWithStep()', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-process-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return processes that contain the step slug', () => {
    // Arrange
    saveProcess({ id: 'p1', name: 'Has Step', steps: [{ slug: 'org/my_step', config: {} }] });
    saveProcess({ id: 'p2', name: 'No Step', steps: [{ slug: 'org/other_step', config: {} }] });

    // Act
    const result = findProcessesWithStep('org/my_step');

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('should return empty array when no process contains the step', () => {
    // Arrange
    saveProcess({ id: 'p1', name: 'Proc', steps: [{ slug: 'org/other', config: {} }] });

    // Act
    const result = findProcessesWithStep('org/missing');

    // Assert
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Scenario management
// ============================================================================

describe('saveScenario() + loadScenario() + listScenarios()', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-scenario-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save and reload a scenario', () => {
    // Arrange
    const config = { to: 'test@example.com', subject: 'Hello' };

    // Act
    saveScenario('org/send_email', 'happy-path', config);
    const loaded = loadScenario('org/send_email', 'happy-path');

    // Assert
    expect(loaded).toEqual(config);
  });

  it('should return null for a missing scenario', () => {
    // Act
    const result = loadScenario('org/send_email', 'nonexistent');

    // Assert
    expect(result).toBeNull();
  });

  it('should list saved scenario names without extension', () => {
    // Arrange
    saveScenario('org/send_email', 'happy-path', {});
    saveScenario('org/send_email', 'error-case', {});

    // Act
    const names = listScenarios('org/send_email');

    // Assert
    expect(names).toContain('happy-path');
    expect(names).toContain('error-case');
  });

  it('should return empty array when no scenarios exist', () => {
    // Act
    const result = listScenarios('org/no_scenarios');

    // Assert
    expect(result).toEqual([]);
  });
});
