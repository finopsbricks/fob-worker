# Refactor src/cli.js into src/cli/ folder structure

**Status:** COMPLETE
**Created:** 2026-03-02

---

## Problem Statement

`src/cli.js` is ~1000 lines with all command handlers in a single file. There is no structural relationship between the file layout and the CLI commands it implements.

## Solution

Split into `src/cli/` where the folder and file structure mirrors the CLI command tree. Each handler gets its own file. Shared utilities move to `src/utils/`.

```
fob config show                    → src/cli/config/show.js
fob processes list                 → src/cli/processes/list.js
fob processes show                 → src/cli/processes/show.js
fob processes pull                 → src/cli/processes/pull.js
fob processes push                 → src/cli/processes/push.js
fob processes update-step-metadata → src/cli/processes/update-step-metadata.js
fob work-records list              → src/cli/work-records/list.js
fob work-records show              → src/cli/work-records/show.js
fob worker status                  → src/cli/worker/status.js
fob steps list                     → src/cli/steps/list.js
fob steps run                      → src/cli/steps/run.js
```

Shared utilities:
- `interactivePicker()` → `src/utils/picker.js`
- `getStepSlugs()` → folded into `src/utils/steps-loader.js`

`src/cli/index.js` holds the `run()` function and yargs setup.

---

## Implementation Phases

### Phase 1: Shared utils
- [x] Create `src/utils/picker.js` — extract `interactivePicker()`
- [x] Add `getStepSlugs()` to `src/utils/steps-loader.js`

### Phase 2: config handlers
- [x] Create `src/cli/config/show.js` — extract `showConfigHandler()`

### Phase 3: processes handlers
- [x] Create `src/cli/processes/list.js` — extract `listProcessesHandler()`
- [x] Create `src/cli/processes/show.js` — extract `showProcessHandler()`
- [x] Create `src/cli/processes/pull.js` — extract `pullProcessesHandler()`
- [x] Create `src/cli/processes/push.js` — extract `pushProcessesHandler()`
- [x] Create `src/cli/processes/update-step-metadata.js` — extract `updateStepMetadataHandler()`

### Phase 4: work-records handlers
- [x] Create `src/cli/work-records/list.js` — extract `listWorkRecordsHandler()`
- [x] Create `src/cli/work-records/show.js` — extract `showWorkRecordHandler()`

### Phase 5: worker handlers
- [x] Create `src/cli/worker/status.js` — extract `workerStatusHandler()`

### Phase 6: steps handlers
- [x] Create `src/cli/steps/list.js` — extract `listStepsHandler()`
- [x] Create `src/cli/steps/run.js` — extract `runStepHandler()`

### Phase 7: cli/index.js
- [x] Create `src/cli/index.js` — move `run()` and yargs setup, import all handlers
- [x] Update `bin/fob.js` to import from `./src/cli/index.js`

### Phase 8: Cleanup
- [x] Delete `src/cli.js`
- [x] Run tests — verify pass
- [x] Verify `fob --help` and spot-check a few commands

---

## Related Files

- `src/cli.js` — source file being split (deleted in Phase 8)
- `bin/fob.js` — entry point, updated in Phase 7
- `src/utils/picker.js` — created in Phase 1
- `src/utils/steps-loader.js` — updated in Phase 1
