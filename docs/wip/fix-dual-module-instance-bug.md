# Remove `@fob/lib-worker` as CLI Dependency

## Status: IN PROGRESS (~90%)

Remove `@fob/lib-worker` from the CLI's own `package.json` dependencies. The CLI always runs inside a worker repo, so it should import lib-worker functions from the worker's `node_modules/` — ensuring a single module instance and eliminating the dual-instance state bug.

---

## Problem Statement

### The bug

`fob steps run` fails with "Templates not initialized" when a step calls `renderTemplate()`. Node.js loads two separate instances of `@fob/lib-worker` — one from the CLI's `node_modules/`, one from the worker's. `initTemplates()` sets module state on the CLI's copy, but `renderTemplate()` reads state from the worker's copy (where it's still `null`).

### The root cause

The CLI declares `@fob/lib-worker` as a direct dependency in `package.json`. Since the CLI is globally installed (or lives in a separate directory), Node resolves its imports to the CLI's own `node_modules/@fob/lib-worker`. But step handlers (loaded dynamically from the worker's `src/steps/`) resolve their imports to the worker's `node_modules/@fob/lib-worker`. Two copies, two module states.

### Existing workaround in worker-agilitas

`worker-agilitas` avoids the bug by calling `initTemplates` on the worker's own copy at module load time in `src/steps/index.js`:

```javascript
import { getStepHandler, initTemplates } from '@fob/lib-worker';

// The CLI (fob steps run) calls initTemplates on its own copy of @fob/lib-worker,
// ...
initTemplates(import.meta.url);
```

This works because when the CLI dynamically imports the worker's step registry, the `initTemplates` call runs as a side effect and initializes the worker's copy. But this is patchwork — workers shouldn't need to know about CLI plumbing. `worker-nowapps` doesn't have this workaround and crashes.

| Worker | Has workaround? | `fob steps run` with templates |
|--------|-----------------|-------------------------------|
| `worker-agilitas` | Yes — `src/steps/index.js:13` | Works |
| `worker-nowapps` | No | Crashes |

### How the dependency got here

The CLI originally **copy-pasted** `createHandler()` and `isStepDefinition()` from lib-worker's `define-step.js` into `steps-loader.js` (55 lines of duplicated code). This worked until a task structure mismatch bug (`docs/wip/cli-task-structure-mismatch.md`) revealed that the CLI's local copies had diverged from lib-worker's source of truth — local tests passed but production failed.

The fix (`docs/wip/dedupe-create-handler.md`) added `@fob/lib-worker` as a **bundled dependency** in `package.json` and replaced the duplicated code with direct imports. This was the right call for deduplication — but bundling meant the CLI got its own `node_modules/@fob/lib-worker` copy, separate from the worker's.

For stateless functions (`isStepDefinition`, `getStepHandler`, `resolveConfig`) two copies are harmless — same input, same output regardless of which instance runs. The bug only surfaced when `initTemplates` entered the picture, because it relies on **module-level state** that must be shared between the caller (`initTemplates` in the CLI) and the consumer (`renderTemplate` in step handlers).

### Why the dependency shouldn't exist

The CLI is **always** run from inside a worker repo directory. It cannot function without one — it needs `src/steps/index.js`, `.orchestrator/`, `.env`, etc. Since a worker always has `@fob/lib-worker` installed, the CLI can import from that same copy at runtime. This gives:

1. **Single module instance** — `initTemplates` and `renderTemplate` share the same state
2. **Version alignment** — CLI always uses the same lib-worker version as the worker
3. **No phantom bugs** — no risk of behaviour differences between CLI's copy and worker's copy
4. **No worker-side workarounds** — workers don't need to patch around CLI internals

---

## Proposed Solution

Dynamically import all `@fob/lib-worker` functions from the worker's `node_modules/` at runtime instead of statically importing from the CLI's own copy.

### What the CLI imports today

| File | Import | Purpose |
|------|--------|---------|
| `src/cli/steps/run.js` | `initTemplates` | Initialize template directory state |
| `src/cli/steps/run.js` | `resolveConfig` | Resolve `{{env.*}}` and `{{org/step.*}}` placeholders |
| `src/utils/steps-loader.js` | `isStepDefinition` | Validate step uses `defineStep()` pattern |
| `src/utils/steps-loader.js` | `getStepHandler` | Extract handler function from StepDefinition |

All 4 functions come from the worker's `@fob/lib-worker` and will be dynamically imported from the worker's `node_modules/`.

---

## Implementation Phases

### Phase 1: Create a shared loader for the worker's lib-worker ✅

Created `src/utils/lib-worker-loader.js`:

- [x] Async `loadLibWorker()` — resolves `{cwd}/node_modules/@fob/lib-worker/src/index.js`, dynamic `import()` with `pathToFileURL()` (Windows compat)
- [x] Sync `getLibWorker()` — returns cached module, throws if not yet loaded
- [x] Module cached after first load — single import per CLI invocation
- [x] Clear error message if lib-worker not found: "Run npm install in your worker repo"

### Phase 2: Update `src/cli/steps/run.js` ✅

- [x] Removed `import { initTemplates, resolveConfig } from '@fob/lib-worker'`
- [x] Added `import { loadLibWorker } from '../../utils/lib-worker-loader.js'`
- [x] `const { initTemplates, resolveConfig } = await loadLibWorker()` called early in `runStepHandler()`
- [x] `initTemplates(workerEntryUrl)` and all `resolveConfig()` calls unchanged

### Phase 3: Update `src/utils/steps-loader.js` ✅

Decision: **B) Cached getter** — `run.js` calls `loadLibWorker()` before `loadSteps()`, so cache is always warm.

- [x] Removed `import { isStepDefinition, getStepHandler } from '@fob/lib-worker'`
- [x] Added `import { getLibWorker } from './lib-worker-loader.js'`
- [x] `getHandler()` calls `const { isStepDefinition, getStepHandler } = getLibWorker()` inline

### Phase 4: Remove the dependency ✅

- [x] Removed `@fob/lib-worker` from `dependencies` in `package.json`
- [x] Ran `npm install` — lockfile regenerated, `node_modules/@fob/lib-worker` removed
- [x] Verified zero static imports of `@fob/lib-worker` in `src/`

### Phase 5: Remove worker-agilitas workaround ✅

- [x] Removed `initTemplates` import from `worker-agilitas/src/steps/index.js`
- [x] Removed the `initTemplates(import.meta.url)` call and its comment block
- [x] `fob steps list` passes from both `worker-nowapps` and `worker-agilitas`

### Phase 6: Verify all other workers ✅

`fob steps list` tested from all workers:

| Worker | `renderTemplate` usage | Workaround? | Result |
|--------|----------------------|-------------|--------|
| `worker-agilitas` | 128 calls | Removed in Phase 5 | `fob steps list` passes |
| `worker-nowapps` | 70 calls | No | `fob steps list` passes |
| `worker-o2c` | 92 calls | No | Pre-existing broken import (`calculateDailyBalances` from `@fob/lib-worker`) — unrelated |
| `worker-alex` | 22 calls | No | `fob steps list` passes |
| `worker-sarveda` | 14 calls | No | `fob steps list` passes |
| `worker-sankalp` | 0 calls | No | `fob steps list` passes |

Note: `worker-o2c` fails due to a step importing `calculateDailyBalances` from `@fob/lib-worker` — the function exists locally in `src/utils/balance-calculator.js` but the import path is wrong. This is a pre-existing bug, not caused by our change.

### Phase 7: Create architecture decision doc ✅

- [x] Created `docs/architecture/lib-worker-resolution.md` — explains context, decision, how it works, trade-offs

### Phase 8: Update existing docs ✅

- [x] Updated `docs/architecture/template-resolution.md` — new code example using `loadLibWorker()`, added note about single module instance
- [x] Updated `docs/architecture/steps-loading.md` — explains `getLibWorker()` usage, links to lib-worker-resolution doc
- [x] Updated `docs/architecture/module-structure.md` — added `lib-worker-loader.js` to utils table, moved `@fob/lib-worker` to "Runtime dependency" section
- [x] Updated `CLAUDE.md` — updated related repos, package structure, template resolution sections

### Phase 9: Delete this WIP file ❌

- [ ] Full `fob steps run` smoke tests with template-using steps (requires live API credentials)
- [ ] Delete this file once all verification is complete

---

---

## Verification Plan

### Unit tests

- [ ] `lib-worker-loader.js` — test that it resolves from `process.cwd()/node_modules/` not from CLI's own modules
- [ ] `lib-worker-loader.js` — test error message when lib-worker not installed
- [ ] `lib-worker-loader.js` — test caching (second call returns same module reference)

### Manual smoke tests

Run from **worker-nowapps** (no workaround — the original crash site):

- [ ] `fob steps run nowapps/consolidate_extractions` — **the original bug**, must pass
- [ ] `fob steps run {slug}` for a step that does NOT use `renderTemplate()` — regression check
- [ ] `fob steps run {slug} --process {id}` — verify `resolveConfig()` still works
- [ ] `fob steps run {slug} --scenario {name}` — verify `resolveConfig()` still works
- [x] `fob steps list` — verify `isStepDefinition()` still validates correctly
- [ ] `fob processes list` — verify commands that don't use lib-worker still work

Run from **worker-agilitas** (after removing workaround):

- [ ] `fob steps run agilitas/categorize_movements` — must still work without the workaround
- [x] `fob steps list` — regression check

Run from **remaining workers** (Phase 6 rollout):

- [ ] `worker-o2c` — blocked by pre-existing broken import (unrelated)
- [x] `worker-alex` — `fob steps list` passes
- [x] `worker-sarveda` — `fob steps list` passes
- [x] `worker-sankalp` — `fob steps list` passes

### Edge case checks

- [ ] Run from a worker that has a different version of `@fob/lib-worker` than the CLI previously bundled — should use the worker's version
- [ ] Run from a directory that is NOT a worker repo — should get a clear error, not a cryptic module-not-found

---

## Related Files

### CLI repo (`@fob/cli-fob`) — modified

- `src/utils/lib-worker-loader.js` — **new** — async loader + sync cached getter for worker's lib-worker
- `src/cli/steps/run.js` — replaced static `@fob/lib-worker` import with `loadLibWorker()`
- `src/utils/steps-loader.js` — replaced static `@fob/lib-worker` import with `getLibWorker()`
- `package.json` — removed `@fob/lib-worker` from dependencies

### CLI repo (`@fob/cli-fob`) — docs to update (Phases 7–8)

- `docs/architecture/template-resolution.md` — documents old static import pattern
- `docs/architecture/steps-loading.md` — documents old `isStepDefinition` import
- `docs/architecture/module-structure.md` — lists `@fob/lib-worker` as external dependency
- `CLAUDE.md` — references lib-worker as a dependency

### Worker repos — modified

- `workers/worker-agilitas/src/steps/index.js` — removed `initTemplates` workaround
