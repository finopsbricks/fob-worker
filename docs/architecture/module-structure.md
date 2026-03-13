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
  processes/            # list.js, show.js, edit.js, pull.js, push.js, update-step-metadata.js
  items/                # edit.js
  work-records/         # list.js, show.js, edit.js
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
| `orchestrator.js` | HTTP calls to the orchestrator API |
| `process-files.js` | Read/write process and scenario files in `.orchestrator/` |
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
| `fob processes list` | `listProcessesHandler()` | `processes/list.js` |
| `fob processes show` | `showProcessHandler()` | `processes/show.js` |
| `fob processes edit` | `editProcessHandler()` | `processes/edit.js` |
| `fob processes pull` | `pullProcessesHandler()` | `processes/pull.js` |
| `fob processes push` | `pushProcessesHandler()` | `processes/push.js` |
| `fob processes update-step-metadata` | `updateStepMetadataHandler()` | `processes/update-step-metadata.js` |
| `fob items edit` | `editItemHandler()` | `items/edit.js` |
| `fob work-records list` | `listWorkRecordsHandler()` | `work-records/list.js` |
| `fob work-records show` | `showWorkRecordHandler()` | `work-records/show.js` |
| `fob work-records edit` | `editWorkRecordHandler()` | `work-records/edit.js` |
| `fob tags list` | `listTagsHandler()` | `tags/list.js` |
| `fob tags create` | `createTagHandler()` | `tags/create.js` |
| `fob tags edit` | `editTagHandler()` | `tags/edit.js` |
| `fob tags delete` | `deleteTagHandler()` | `tags/delete.js` |
| `fob worker status` | `workerStatusHandler()` | `worker/status.js` |
| `fob config show` | `showConfigHandler()` | `config/show.js` |

## Related Notes

- [CLI Design Style Guide](/docs/cli-design-style.md)
- [Steps Loading](/docs/architecture/steps-loading.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Task Construction](/docs/architecture/task-construction.md)
