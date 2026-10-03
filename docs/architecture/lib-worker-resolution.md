# lib-worker Resolution

How the CLI accesses `@fob/lib-worker` without declaring it as a dependency.

## Context

The CLI needs `initTemplates`, `resolveConfig`, `discoverSteps` and `createHandler` from `@fob/lib-worker`. It previously declared `@fob/lib-worker` as a bundled dependency in `package.json`.

This caused a **dual module instance bug**: Node.js loaded two separate copies of `@fob/lib-worker` (one from the CLI's `node_modules/`, one from the worker's). Module-level state set by the CLI's copy (via `initTemplates`) was invisible to step handlers running from the worker's copy (via `renderTemplate`), causing "Templates not initialized" errors.

See `docs/wip/fix-dual-module-instance-bug.md` for the full history.

## Decision

The CLI dynamically imports `@fob/lib-worker` from the **worker's** `node_modules/` at runtime. This guarantees a single module instance shared between CLI code and step handlers.

`@fob/lib-worker` is **not** listed in the CLI's `package.json`.

## How It Works

`src/utils/lib-worker-loader.js` provides two functions:

```javascript
// Async — first call resolves and caches the module
const { initTemplates, resolveConfig } = await loadLibWorker();

// Sync — returns cached module (throws if not yet loaded)
const { createHandler } = getLibWorker();
```

Resolution path: `{process.cwd()}/node_modules/@fob/lib-worker/src/index.js`

The module is cached after the first `loadLibWorker()` call. `getLibWorker()` returns the cache synchronously for use in sync functions like `getHandler()`.

## Why This Works

The CLI always runs from inside a worker repo directory. It cannot function without one — it requires `src/steps/`, `.orchestrator/`, `.env`, etc. Since a worker always has `@fob/lib-worker` installed, the module is guaranteed to be available.

## Trade-offs

| Aspect | Before (bundled) | After (runtime resolution) |
|--------|-------------------|---------------------------|
| Module instances | Two — CLI's copy + worker's copy | One — worker's copy only |
| Version alignment | CLI could lag behind worker | Always matches worker |
| Static analysis | Import errors caught at parse time | Import errors caught at runtime |
| Worker requirement | CLI could theoretically run standalone | CLI must run inside a worker repo |

The "worker requirement" trade-off is not a new limitation — the CLI already required a worker repo for all commands.

## Related Notes

- [Template Resolution](/docs/architecture/template-resolution.md)
- [Steps Loading](/docs/architecture/steps-loading.md)
- [Module Structure](/docs/architecture/module-structure.md)
