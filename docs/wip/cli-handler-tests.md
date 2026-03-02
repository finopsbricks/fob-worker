# CLI Handler Tests (gh-style)

**Status:** COMPLETE
**Created:** 2026-03-02

---

## Problem Statement

The current `tests/cli/smoke.test.js` uses subprocess spawning to test CLI commands. This only verifies yargs wiring — it gives no confidence that handler logic (output formatting, error paths, config resolution) actually works.

## Solution

Test handlers directly, the same way the `gh` CLI does:

- Mock all dependencies (`orchestrator.js`, `process-files.js`, etc.) using `jest.unstable_mockModule`
- Spy on `console.log` / `console.error` to capture output
- Mock `process.exit` to throw an `ExitError` so execution stops and exit codes can be asserted
- Dynamic-import the handler under test after mocks are registered
- Delete `smoke.test.js`

### Key patterns

```js
// 1. Mock functions defined first
const mockListProcesses = jest.fn();

// 2. Register mock module
jest.unstable_mockModule('../../../src/utils/orchestrator.js', () => ({
  listProcesses: mockListProcesses,
  getOrchestratorConfig: mockGetOrchestratorConfig,
}));

// 3. Dynamic import AFTER mocking
const { listProcessesHandler } = await import('../../../src/cli/processes/list.js');

// 4. Assert output
expect(out.stdout).toContain('Monthly Billing');

// 5. Assert exit
await expect(handler()).rejects.toThrow(ExitError);
```

---

## Implementation Phases

### Phase 1: Shared helper
- [x] Create `tests/cli/helpers.js`
  - `captureOutput()` — spies on `console.log`, `console.error`, `process.exit`
  - `ExitError` — thrown by mocked `process.exit` so execution halts and exit code is assertable

### Phase 2: config handlers
- [x] Create `tests/cli/config/show.test.js`
  - Mocks: `loadConfig`, `getRelevantEnvVars`
  - Tests: prints paths, prints env vars section when set, skips section when all undefined

### Phase 3: processes handlers
- [x] Create `tests/cli/processes/list.test.js`
  - Mocks: `listProcesses`, `getOrchestratorConfig`
  - Tests: formatted table, no processes, exit 1 on error
- [x] Create `tests/cli/processes/show.test.js`
  - Mocks: `getProcess`
  - Tests: JSON output, exit 1 on error
- [x] Create `tests/cli/processes/pull.test.js`
  - Mocks: `listProcesses`, `getProcess`, `getOrchestratorConfig`, `saveProcess`, `getProcessesDir`
  - Tests: single pull, pull all, no processes on --all, exit 1 if no id/--all, exit 1 on error
- [x] Create `tests/cli/processes/push.test.js`
  - Mocks: `updateProcess`, `getOrchestratorConfig`, `loadProcess`, `listLocalProcesses`, `getProcessesDir`
  - Tests: single push strips id/created_at/org, push all, process not found locally, no id/--all, exit 1 on error
- [x] Create `tests/cli/processes/update-step-metadata.test.js`
  - Mocks: `loadConfig`, `loadSteps`, `listLocalProcesses`, `loadProcess`, `saveProcess`, `getProcessesDir`
  - Tests: updates steps with changed metadata, skips steps already up to date, no local processes found

### Phase 4: work-records handlers
- [x] Create `tests/cli/work-records/list.test.js`
  - Mocks: `listWorkRecords`, `getOrchestratorConfig`
  - Tests: formatted table with date formatting, filters shown, no records, exit 1 on error
- [x] Create `tests/cli/work-records/show.test.js`
  - Mocks: `getWorkRecord`
  - Tests: JSON output, exit 1 on error

### Phase 5: worker handlers
- [x] Create `tests/cli/worker/status.test.js`
  - Mocks: `checkConnection`, `getOrchestratorConfig`
  - Tests: connected, not connected with error, not connected with HTTP status

### Phase 6: steps handlers
- [x] Create `tests/cli/steps/list.test.js`
  - Mocks: `loadConfig`, `loadStepsWithFiles`
  - Tests: sorted table with correct folder/file extraction, no steps found
- [x] Create `tests/cli/steps/run.test.js`
  - Mocks: `loadConfig`, `ensureTempDir`, `initTemplates`, `resolveConfig`, `loadSteps`, `getHandler`, `saveStepOutput`, `loadAllStepOutputs`, `loadProcess`, `getStepConfigFromProcess`, `findProcessesWithStep`, `listScenarios`, `loadScenario`, `interactivePicker`
  - Tests: --empty flag, --process flag, --scenario flag, step not found, process not found, scenario not found

### Phase 7: Cleanup
- [x] Delete `tests/cli/smoke.test.js`
- [x] Run full test suite — verify all pass

---

## Related Files

- `tests/cli/smoke.test.js` — deleted in Phase 7
- `tests/cli/helpers.js` — created in Phase 1
- `src/cli/**/*.js` — handlers under test
- `src/utils/orchestrator.js` — mocked in processes/work-records/worker tests
- `src/utils/process-files.js` — mocked in processes/steps tests
- `src/utils/config.js` — mocked in config/steps tests
- `src/utils/picker.js` — mocked in steps/run test
