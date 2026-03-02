# Add Unit Tests + CI

**Status:** COMPLETE
**Created:** 2026-03-02

## Summary

Add Jest unit tests for all `src/utils/` modules and set up GitHub Actions CI to run them on every push and PR.

---

## Engineering Standards Alignment

Based on monorepo testing standards:
- **Framework:** Jest (consistent with orchestrator, auth, lib-ui)
- **Pattern:** AAA (Arrange / Act / Assert) with inline comments
- **Naming:** `it('should ...')` inside `describe('functionName()')` blocks
- **Coverage threshold:** 80% branches, functions, lines, statements
- **CI reporter:** `jest-junit` → `junit.xml` → `dorny/test-reporter`
- **Mock cleanup:** `jest.clearAllMocks()` in `beforeEach` wherever mocks are used
- **Scripts:** `test`, `test:watch`, `test:coverage`

**Note:** This repo is pure ESM (`"type": "module"`). Jest requires `NODE_OPTIONS=--experimental-vm-modules` to run ESM without transpilation.

---

## Implementation Steps

### Phase 1 — Jest Setup

#### 1. Install dev dependencies

```bash
npm install --save-dev jest jest-junit
```

#### 2. Create `jest.config.js`

```js
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  reporters: [
    'default',
    ['jest-junit', { outputFile: 'junit.xml' }],
  ],
};
```

#### 3. Update `package.json` scripts

```json
"scripts": {
  "test": "NODE_OPTIONS=--experimental-vm-modules jest",
  "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
  "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
}
```

---

### Phase 2 — Test Files

#### `tests/utils/output.test.js`

Functions to test (no file I/O mocking needed for pure logic; mock `fs` for I/O):

| Function | Tests |
|----------|-------|
| `slugToFilename` | simple slug, slug with slash, slug with multiple slashes |
| `slugToConfigFilename` | same as above, produces `.config.json` suffix |
| `filenameToSlug` | reverses slugToFilename output |
| `loadStepOutput` | returns null when file missing, returns parsed JSON when present |
| `saveStepOutput` | writes JSON to correct path, returns filepath |
| `loadAllStepOutputs` | returns `{}` when dir missing, loads all `.json` non-config files, skips `.config.json` files, skips invalid JSON with warning |

Mock strategy: mock `fs` using `jest.unstable_mockModule` (ESM-compatible).

#### `tests/utils/config.test.js`

| Function | Tests |
|----------|-------|
| `loadConfig` | returns stepsPath and tempDir relative to cwd |
| `ensureTempDir` | calls mkdirSync when dir does not exist, no-ops when dir exists |
| `getRelevantEnvVars` | returns ORCHESTRATOR_URL and STEP_PREFIX, masks API_KEY and API_SECRET with `***`, returns undefined for unset vars |

Mock strategy: set `process.env` in `beforeEach`/`afterEach`, mock `fs` for `ensureTempDir`.

#### `tests/utils/process-files.test.js`

Focus on pure logic functions (avoid heavy fs mocking for complex ones):

| Function | Tests |
|----------|-------|
| `getStepConfigFromProcess` | returns config when step found, returns null when step missing, returns null when steps array empty |
| `getProcessesDir` | returns `.orchestrator/processes` |
| `getScenariosDir` | returns `.orchestrator/scenarios` |

For fs-dependent functions (`saveProcess`, `loadProcess`, `listLocalProcesses`, `findProcessesWithStep`, `listScenarios`, `loadScenario`): use a real temp directory (`os.tmpdir()`) and clean up in `afterEach`.

#### `tests/utils/steps-loader.test.js`

| Function | Tests |
|----------|-------|
| `findPreviousStep` | returns null when slug is first, returns null when no same-prefix step exists before it, returns previous same-prefix step slug |
| `getHandler` | returns null when slug not in registry, throws when step is not a StepDefinition |

For `loadSteps` and `loadStepsWithFiles`: integration-style tests using a fixture steps index file in `tests/fixtures/`.

---

### Phase 3 — GitHub Actions CI

#### Create `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
    inputs:
      run-all-tests:
        description: 'Force run all tests (ignore conditionals)'
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  checks: write
  pull-requests: write

jobs:
  setup-changes:
    name: "Setup - Detect Changes"
    runs-on: ubuntu-latest
    outputs:
      src: ${{ steps.filter.outputs.src }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            src:
              - 'src/**'
              - 'bin/**'
              - 'package.json'
              - 'jest.config.js'

  test-unit:
    name: "Test - Unit"
    needs: setup-changes
    if: |
      github.event.inputs.run-all-tests == 'true' ||
      needs.setup-changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - name: Run unit tests
        run: npm test
      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: "Results - Unit"
          path: junit.xml
          reporter: jest-junit
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `jest.config.js` | Create |
| `package.json` | Update scripts + add devDependencies |
| `tests/utils/output.test.js` | Create |
| `tests/utils/config.test.js` | Create |
| `tests/utils/process-files.test.js` | Create |
| `tests/utils/steps-loader.test.js` | Create |
| `tests/fixtures/` | Create (stub steps index for integration tests) |
| `.github/workflows/ci.yml` | Create |

---

## Notes

- `jest.unstable_mockModule` is the ESM-compatible API for mocking modules (replaces `jest.mock` for ESM)
- `process.env` mutations must be restored in `afterEach` to avoid test pollution
- `fs`-heavy functions should use real temp dirs (via `os.tmpdir()`) rather than mocking `fs` to keep tests simple and correct
- `tests/utils/steps-loader.test.js` can skip `loadSteps` for now since it requires a real module file to dynamically import — mark as `// TODO: integration test`
