import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureOutput, ExitError } from '../helpers.js';
import { showWorkpieceHandler } from '../../../src/cli/workpieces/show.js';

function makeWorkpiece(stations_root, station, bin, id, events = null) {
  const dir = path.join(stations_root, station, bin, id);
  fs.mkdirSync(dir, { recursive: true });
  if (events) {
    fs.writeFileSync(
      path.join(dir, 'log.jsonl'),
      events.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );
  }
}

describe('showWorkpieceHandler()', () => {
  let tempDir;
  let originalCwd;
  let out;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fob-wp-show-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    const stations_root = path.join(tempDir, 'temp', 'stations');
    fs.mkdirSync(stations_root, { recursive: true });
    makeWorkpiece(stations_root, 'VM3', 'failed', 'stuck-xyz', [
      { ts: '2026-06-05T20:07:08.918Z', station: 'VM0', event: 'workpiece_created' },
      { ts: '2026-06-06T08:31:20.007Z', station: 'VM3', event: 'station_started' },
      { ts: '2026-06-06T08:31:21.007Z', station: 'VM3', event: 'station_failed' },
    ]);
    makeWorkpiece(stations_root, 'VM3', 'failed', 'stuck-abc');
    out = captureOutput();
  });

  afterEach(() => {
    out.restore();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should render the deep view for an exact id match', async () => {
    // Act
    await showWorkpieceHandler({ id: 'stuck-xyz' });

    // Assert
    expect(out.stdout).toContain('Workpiece: stuck-xyz');
    expect(out.stdout).toContain('VM3/failed');
    expect(out.stdout).toContain('Journey');
    expect(out.stdout).toContain('workpiece_created');
    expect(out.stdout).toContain('station_failed');
    expect(out.stdout).toMatch(/Folder: file:\/\//);
  });

  it('should promote ambiguous substring to the dashboard view', async () => {
    // Act — `stuck` matches both stuck-xyz and stuck-abc
    await showWorkpieceHandler({ id: 'stuck' });

    // Assert — the dashboard header from list.js fires, listing both
    expect(out.stdout).toContain('stuck-xyz');
    expect(out.stdout).toContain('stuck-abc');
    expect(out.stdout).toMatch(/Workpieces matching "stuck"/);
  });

  it('should exit with a clear message when no workpiece matches', async () => {
    // Act + Assert
    await expect(showWorkpieceHandler({ id: 'nope' })).rejects.toBeInstanceOf(ExitError);
    expect(out.stderr).toMatch(/No workpiece matches "nope"/);
  });

  it('should output JSON when --json is passed', async () => {
    // Act
    await showWorkpieceHandler({ id: 'stuck-xyz', json: true });

    // Assert
    const parsed = JSON.parse(out.stdout);
    expect(parsed.id).toBe('stuck-xyz');
    expect(parsed.position).toMatchObject({ station: 'VM3', bin: 'failed' });
    expect(parsed.journey).toHaveLength(3);
    expect(parsed.folder).toMatch(/^file:\/\//);
  });
});
