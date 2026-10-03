# Module Structure

How the CLI modules fit together from entry point to execution.

## Entry Point

```
bin/fob-worker.js  →  src/cli/index.js  →  src/cli/*/  →  src/utils/*
```

`bin/fob-worker.js` is minimal — it only imports and calls `run()`:

```javascript
import { run } from '../src/cli/index.js';
run(hideBin(process.argv));
```

`src/index.js` is the package's library entry and re-exports `run`, `loadConfig`, `loadSteps` and `resolveTemplates`.

## src/cli/

The yargs command tree, shell completion, and `withSeparator()` wrapper live in `src/cli/index.js`. Each handler function lives in a resource subdirectory:

```
src/cli/
  index.js              # Command tree and completion
  steps/                # list.js, run.js
  stations/             # status.js, empty-bins.js, update-step-metadata.js
  lines/                # list.js, show.js, status.js, empty-bins.js
  workpieces/           # list.js, show.js, watch.js
  procs/                # list.js, start.js, stop.js, restart.js, logs.js, monit.js
  config/               # show.js
  shared/               # empty-bins.js (shared by stations/lines empty-bins)
```

Canonical station and line definitions, work records, tags and supporting docs are the Orchestrator's; their commands live in `fob-orc`.

## src/utils/

| Module | Responsibility |
|--------|---------------|
| `config.js` | Resolve convention-based paths (stepsDir, tempDir) and the env vars `config show` prints |
| `steps-loader.js` | Discover the worker's steps with lib-worker's `discoverSteps()` |
| `lib-worker-loader.js` | Load `@fob/lib-worker` from the worker's `node_modules/` at runtime |
| `output.js` | Read/write step outputs in `temp/` |
| `station-files.js` | Read/write station, line and scenario files in `.orchestrator/` |
| `line-state.js` | Live line/bin state: topology from station files, bins from `temp/stations/` |
| `worker-processes.js` | Detect locally-running workers (direct or pm2-managed), via `ps`/`lsof`/`pm2 jlist` (macOS + Linux; cwd via `/proc` on Linux) |
| `format.js`, `watch-render.js`, `picker.js`, `templates.js` | Table/time formatting, `--watch` redraw, the interactive config picker, template resolution |

## External Dependencies

| Package | Used For |
|---------|----------|
| `yargs` | Command parsing and shell completion |
| `dotenv` | Load `.env` at startup |

### Runtime dependency (not in package.json)

| Package | Used For |
|---------|----------|
| `@fob/lib-worker` | `initTemplates`, `resolveConfig`, `discoverSteps`, `createHandler` — loaded from the worker's `node_modules/` at runtime via `lib-worker-loader.js`. See [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md). |

## Command → Handler Mapping

| Command | Handler | File |
|---------|---------|------|
| `fob-worker steps list` | `listStepsHandler()` | `steps/list.js` |
| `fob-worker steps run` | `runStepHandler()` | `steps/run.js` |
| `fob-worker stations status` | `statusStationHandler()` | `stations/status.js` |
| `fob-worker stations empty-bins` | `emptyBinsStationHandler()` | `stations/empty-bins.js` |
| `fob-worker stations update-step-metadata` | `updateStepMetadataHandler()` | `stations/update-step-metadata.js` |
| `fob-worker lines list/show/status/empty-bins` | `listLinesHandler()` / `showLineHandler()` / `statusLineHandler()` / `emptyBinsLineHandler()` | `lines/*.js` |
| `fob-worker workpieces list/show/watch` | `listWorkpiecesHandler()` / `showWorkpieceHandler()` / `watchHandler()` | `workpieces/*.js` |
| `fob-worker procs list/start/stop/restart/logs/monit` | `listWorkersHandler()` / `startWorkerHandler()` / … / `monitWorkersHandler()` | `procs/*.js` |
| `fob-worker config show` | `showConfigHandler()` | `config/show.js` |

## Related Notes

- [CLI Design Style Guide](/docs/cli-design-style.md)
- [Steps Loading](/docs/architecture/steps-loading.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Task Construction](/docs/architecture/task-construction.md)
