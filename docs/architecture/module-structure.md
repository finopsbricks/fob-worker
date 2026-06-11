# Module Structure

How the CLI modules fit together from entry point to execution.

## Entry Point

```
bin/fob.js  →  src/cli/index.js  →  src/cli/*/  →  src/utils/*
```

`bin/fob.js` is minimal — it only imports and calls `run()`:

```javascript
import { run } from '../src/cli/index.js';
run(hideBin(process.argv));
```

## src/cli/

The yargs command tree, shell completion, and `withSeparator()` wrapper live in `src/cli/index.js`. Each handler function lives in a resource subdirectory:

```
src/cli/
  index.js              # Command tree and completion
  steps/                # list.js, run.js
  stations/             # list.js, show.js, status.js, run.js, edit.js, pull.js, push.js, update-step-metadata.js
  lines/                # list.js, show.js, status.js
  workpieces/           # list.js, show.js, watch.js
  items/                # list.js, show.js, edit.js
  work-records/         # list.js, show.js, edit.js, cancel.js
  supporting-docs/      # show.js
  tags/                 # list.js, create.js, edit.js, delete.js
  shared/               # edit-tags.js (shared tag editing logic)
```

## src/utils/

| Module | Responsibility |
|--------|---------------|
| `config.js` | Resolve convention-based paths (stepsPath, tempDir) |
| `steps-loader.js` | Dynamically import worker's step registry |
| `lib-worker-loader.js` | Load `@fob/lib-worker` from the worker's `node_modules/` at runtime |
| `output.js` | Read/write step outputs in `temp/` |
| `orchestrator.js` | HTTP calls to the orchestrator API (keeps `/api/v1/processes/*` paths — the API contract) |
| `station-files.js` | Read/write station and scenario files in `.orchestrator/` |
| `line-state.js` | Live line/bin state derived from `temp/stations/` |
| `tags.js` | Tag name↔ID resolution (ensureTag, resolveTagNames) |

## External Dependencies

| Package | Used For |
|---------|----------|
| `yargs` | Command parsing and shell completion |
| `dotenv` | Load `.env` at startup |

### Runtime dependency (not in package.json)

| Package | Used For |
|---------|----------|
| `@fob/lib-worker` | `initTemplates`, `resolveConfig`, `isStepDefinition`, `getStepHandler` — loaded from the worker's `node_modules/` at runtime via `lib-worker-loader.js`. See [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md). |

## Command → Handler Mapping

| Command | Handler | File |
|---------|---------|------|
| `fob steps list` | `listStepsHandler()` | `steps/list.js` |
| `fob steps run` | `runStepHandler()` | `steps/run.js` |
| `fob stations list` | `listStationsHandler()` | `stations/list.js` |
| `fob stations show` | `showStationHandler()` | `stations/show.js` |
| `fob stations status` | `statusStationHandler()` | `stations/status.js` |
| `fob stations run` | `runStationHandler()` | `stations/run.js` |
| `fob stations edit` | `editStationHandler()` | `stations/edit.js` |
| `fob stations pull` | `pullStationsHandler()` | `stations/pull.js` |
| `fob stations push` | `pushStationsHandler()` | `stations/push.js` |
| `fob stations update-step-metadata` | `updateStepMetadataHandler()` | `stations/update-step-metadata.js` |
| `fob lines list/show/status` | `listLinesHandler()` / `showLineHandler()` / `statusLineHandler()` | `lines/*.js` |
| `fob workpieces list/show/watch` | `listWorkpiecesHandler()` / `showWorkpieceHandler()` / `watchHandler()` | `workpieces/*.js` |
| `fob items list/show/edit` | `listItemsHandler()` / `showItemHandler()` / `editItemHandler()` | `items/*.js` |
| `fob work-records list/show/edit/cancel` | `listWorkRecordsHandler()` / `showWorkRecordHandler()` / `editWorkRecordHandler()` / `cancelWorkRecordHandler()` | `work-records/*.js` |
| `fob supporting-docs show` | `showSupportingDocHandler()` | `supporting-docs/show.js` |
| `fob tags list/create/edit/delete` | `listTagsHandler()` / `createTagHandler()` / `editTagHandler()` / `deleteTagHandler()` | `tags/*.js` |
| `fob worker status` | `workerStatusHandler()` | `worker/status.js` |
| `fob config show` | `showConfigHandler()` | `config/show.js` |

## Related Notes

- [CLI Design Style Guide](/docs/cli-design-style.md)
- [Steps Loading](/docs/architecture/steps-loading.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Task Construction](/docs/architecture/task-construction.md)
