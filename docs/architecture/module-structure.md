# Module Structure

How the CLI modules fit together from entry point to execution.

## Entry Point

```
bin/fob.js  →  src/cli.js  →  src/utils/*
```

`bin/fob.js` is minimal — it only imports and calls `run()`:

```javascript
import { run } from '../src/cli.js';
run(hideBin(process.argv));
```

All command definitions and handler functions live in `src/cli.js`.

## src/cli.js

Single file containing:
- yargs command tree (resources → actions)
- One `*Handler()` function per command
- `interactivePicker()` for the config selection UI
- Shell completion logic

## src/utils/

| Module | Responsibility |
|--------|---------------|
| `config.js` | Load and merge `.fob.json` with defaults |
| `steps-loader.js` | Dynamically import worker's step registry |
| `output.js` | Read/write step outputs in `temp/` |
| `orchestrator.js` | HTTP calls to the orchestrator API |
| `process-files.js` | Read/write process and scenario files in `.orchestrator/` |
| `templates.js` | Deprecated — template resolution moved to `@fob/lib-worker` |

## External Dependencies

| Package | Used For |
|---------|----------|
| `@fob/lib-worker` | `initTemplates`, `resolveConfig`, `isStepDefinition`, `getStepHandler` |
| `yargs` | Command parsing and shell completion |
| `dotenv` | Load `.env` at startup |

## Command → Handler Mapping

| Command | Handler |
|---------|---------|
| `fob steps list` | `listStepsHandler()` |
| `fob steps run` | `runStepHandler()` |
| `fob processes list` | `listProcessesHandler()` |
| `fob processes show` | `showProcessHandler()` |
| `fob processes pull` | `pullProcessesHandler()` |
| `fob processes push` | `pushProcessesHandler()` |
| `fob processes update-step-metadata` | `updateStepMetadataHandler()` |
| `fob work-records list` | `listWorkRecordsHandler()` |
| `fob work-records show` | `showWorkRecordHandler()` |
| `fob worker status` | `workerStatusHandler()` |
| `fob config show` | `showConfigHandler()` |
| `fob config init` | `initConfigHandler()` |

## Related Notes

- [Command Structure Design](/docs/cli-pattern.md)
- [Steps Loading](/docs/architecture/steps-loading.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Task Construction](/docs/architecture/task-construction.md)
