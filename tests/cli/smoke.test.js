import { describe, it, expect } from '@jest/globals';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = path.join(ROOT, 'bin/fob.js');

function fob(...args) {
  // Strip NODE_OPTIONS to avoid inheriting debugger flags from the parent process
  const env = { ...process.env };
  delete env.NODE_OPTIONS;

  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
    env,
  });
}

// ============================================================================
// Help output — verifies commands are wired correctly
// ============================================================================

describe('fob --help', () => {
  it('should exit 0 and list all resources', () => {
    // Act
    const result = fob('--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('steps');
    expect(result.stdout).toContain('config');
    expect(result.stdout).toContain('processes');
    expect(result.stdout).toContain('work-records');
    expect(result.stdout).toContain('worker');
  });
});

describe('fob steps --help', () => {
  it('should exit 0 and list actions', () => {
    // Act
    const result = fob('steps', '--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('run');
  });
});

describe('fob config --help', () => {
  it('should exit 0 and list actions', () => {
    // Act
    const result = fob('config', '--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('show');
  });
});

describe('fob processes --help', () => {
  it('should exit 0 and list actions', () => {
    // Act
    const result = fob('processes', '--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('show');
    expect(result.stdout).toContain('pull');
    expect(result.stdout).toContain('push');
    expect(result.stdout).toContain('update-step-metadata');
  });
});

describe('fob work-records --help', () => {
  it('should exit 0 and list actions', () => {
    // Act
    const result = fob('work-records', '--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('show');
  });
});

describe('fob worker --help', () => {
  it('should exit 0 and list actions', () => {
    // Act
    const result = fob('worker', '--help');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('status');
  });
});

// ============================================================================
// Argument validation — verifies required args produce correct error messages
// ============================================================================

describe('fob processes show', () => {
  it('should exit 1 with usage when id is missing', () => {
    // Act
    const result = fob('processes', 'show');

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: fob processes show <id>');
  });
});

describe('fob processes pull', () => {
  it('should exit 1 with usage when id and --all are both missing', () => {
    // Act
    const result = fob('processes', 'pull');

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: fob processes pull <id>');
  });
});

describe('fob processes push', () => {
  it('should exit 1 with usage when id and --all are both missing', () => {
    // Act
    const result = fob('processes', 'push');

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: fob processes push <id>');
  });
});

describe('fob work-records show', () => {
  it('should exit 1 with usage when id is missing', () => {
    // Act
    const result = fob('work-records', 'show');

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: fob work-records show <id>');
  });
});

describe('fob steps run', () => {
  it('should exit 1 with usage when slug is missing', () => {
    // Act
    const result = fob('steps', 'run');

    // Assert
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: fob steps run <slug>');
  });
});

// ============================================================================
// fob config show — only command that runs without external dependencies
// ============================================================================

describe('fob config show', () => {
  it('should exit 0 and print resolved paths', () => {
    // Act
    const result = fob('config', 'show');

    // Assert
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('fob config show');
    expect(result.stdout).toContain('stepsPath');
    expect(result.stdout).toContain('tempDir');
  });
});
