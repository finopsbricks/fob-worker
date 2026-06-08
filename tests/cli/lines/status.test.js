import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureOutput, ExitError } from '../helpers.js';
import { statusLineHandler } from '../../../src/cli/lines/status.js';

function makeWorkpiece(stations_root, station, bin, id) {
  fs.mkdirSync(path.join(stations_root, station, bin, id), { recursive: true });
}

function makeBinDir(stations_root, station, bin) {
  fs.mkdirSync(path.join(stations_root, station, bin), { recursive: true });
}

describe('statusLineHandler()', () => {
  let tempDir;
  let originalCwd;
  let out;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-lines-status-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    const stations_root = path.join(tempDir, 'temp', 'stations');
    fs.mkdirSync(stations_root, { recursive: true });
    // VM line: 0 in-flight, 1 stuck at VM3/failed, 2 finished at VM5/output
    for (const station of ['VM0', 'VM2', 'VM3', 'VM4', 'VM5']) {
      makeBinDir(stations_root, station, 'output');
    }
    makeWorkpiece(stations_root, 'VM3', 'failed', 'stuck-a');
    makeWorkpiece(stations_root, 'VM5', 'output', 'done-b');
    makeWorkpiece(stations_root, 'VM5', 'output', 'done-c');
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should render a cross-line summary when no argument is passed', async () => {
    // Act
    await statusLineHandler({});

    // Assert
    expect(out.stdout).toMatch(/LINE\s+IN-FLIGHT\s+STUCK\s+FINISHED\s+HEALTH/);
    expect(out.stdout).toContain('VM');
    expect(out.stdout).toMatch(/2 finished, drained|1 at VM3\/failed|stuck/);
  });

  it('should render the station × live-bin table when a line code is passed', async () => {
    // Act
    await statusLineHandler({ line: 'VM' });

    // Assert
    expect(out.stdout).toContain('Line: VM');
    expect(out.stdout).toContain('VM0 → VM2 → VM3 → VM4 → VM5');
    expect(out.stdout).toMatch(/STATION\s+INPUT\s+DOING\s+OUTPUT\s+FAILED\s+\(DONE\)/);
    expect(out.stdout).toContain('live');
  });

  it('should exit with a clear error when the line is not found on disk', async () => {
    // Act + Assert
    await expect(statusLineHandler({ line: 'ZZ' })).rejects.toBeInstanceOf(ExitError);
    expect(out.stderr).toMatch(/Line "ZZ" not found/);
  });

  it('should output JSON for the summary when --json is passed without a line', async () => {
    // Act
    await statusLineHandler({ json: true });

    // Assert
    const parsed = JSON.parse(out.stdout);
    expect(parsed.VM).toMatchObject({ stuck: 1, finished: 2 });
  });

  it('should output JSON for the drilldown when --json + line is passed', async () => {
    // Act
    await statusLineHandler({ line: 'VM', json: true });

    // Assert
    const parsed = JSON.parse(out.stdout);
    expect(parsed.code).toBe('VM');
    expect(parsed.terminal).toBe('VM5');
    expect(parsed.summary).toMatchObject({ stuck: 1, finished: 2 });
    expect(parsed.stations.VM3.failed).toEqual(['stuck-a']);
  });

  it('should report when no lines exist on disk', async () => {
    // Arrange — wipe the stations root
    fs.rmSync(path.join(tempDir, 'temp', 'stations'), { recursive: true, force: true });

    // Act
    await statusLineHandler({});

    // Assert
    expect(out.stdout).toMatch(/No lines found/);
  });
});
