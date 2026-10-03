import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeWorkpiece, writeStationDefs } from '../../fixtures/stations.js';
import { captureOutput, ExitError } from '../helpers.js';
import { listWorkpiecesHandler } from '../../../src/cli/workpieces/list.js';

// Synthetic stations tree at temp/stations under a fresh cwd, so the handler's
// default stations_root resolution (cwd-relative) picks it up.

describe('listWorkpiecesHandler()', () => {
  let tempDir;
  let originalCwd;
  let out;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-wp-list-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    const stations_root = path.join(tempDir, 'temp', 'stations');
    fs.mkdirSync(stations_root, { recursive: true });
    makeWorkpiece(stations_root, 'VM3', 'failed', 'stuck-a');
    makeWorkpiece(stations_root, 'VM3', 'failed', 'stuck-b');
    makeWorkpiece(stations_root, 'VM5', 'output', 'done-c');
    writeStationDefs(path.join(tempDir, 'temp', 'stations'), tempDir);
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list every workpiece when no scope flags are passed', async () => {
    // Act
    await listWorkpiecesHandler({});

    // Assert
    expect(out.stdout).toContain('stuck-a');
    expect(out.stdout).toContain('stuck-b');
    expect(out.stdout).toContain('done-c');
    expect(out.stdout).toContain('Workpieces');
  });

  it('should filter to a specific bin when --bin is passed', async () => {
    // Act
    await listWorkpiecesHandler({ bin: 'VM3/failed' });

    // Assert
    expect(out.stdout).toContain('stuck-a');
    expect(out.stdout).toContain('stuck-b');
    expect(out.stdout).not.toContain('done-c');
  });

  it('should filter by substring when --match is passed', async () => {
    // Act
    await listWorkpiecesHandler({ match: 'stuck' });

    // Assert
    expect(out.stdout).toContain('stuck-a');
    expect(out.stdout).toContain('stuck-b');
    expect(out.stdout).not.toContain('done-c');
  });

  it('should scope to a line when --line is passed', async () => {
    // Act
    await listWorkpiecesHandler({ line: 'VM' });

    // Assert — all three are on the VM line
    expect(out.stdout).toContain('stuck-a');
    expect(out.stdout).toContain('done-c');
  });

  it('should output JSON when --json is passed', async () => {
    // Act
    await listWorkpiecesHandler({ bin: 'VM3/failed', json: true });

    // Assert
    const parsed = JSON.parse(out.stdout);
    expect(parsed.header).toMatch(/VM3\/failed/);
    expect(parsed.workpieces.map((w) => w.id).sort()).toEqual(['stuck-a', 'stuck-b']);
  });

  it('should exit with an error message for invalid --bin spec', async () => {
    // Act + Assert
    await expect(listWorkpiecesHandler({ bin: 'not-valid' })).rejects.toBeInstanceOf(ExitError);
    expect(out.stderr).toMatch(/Invalid bin spec/);
  });
});
