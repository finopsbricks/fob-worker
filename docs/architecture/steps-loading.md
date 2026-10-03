# Steps Loading

How the CLI discovers and runs step handlers from a worker repo.

## Loading Procedure

`loadSteps(stepsDir)` in `src/utils/steps-loader.js`:

1. Checks that `src/steps/` exists in the current directory
2. Loads `@fob/lib-worker` from the worker's own `node_modules/` (see [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md))
3. Calls lib-worker's `discoverSteps(stepsDir)`, which imports every step file under `src/steps/` and returns a registry of slug → step definition. Each definition carries `_file`, its path relative to `src/steps/`, which `fob-worker steps list` shows as FOLDER and FILE

There is no index file: adding a file that default-exports a `defineStep()` is enough.

## StepDefinition Requirement

Steps must be created with `defineStep()` from `@fob/lib-worker`:

```javascript
export default defineStep({
  slug: 'IN1_01_count',
  execute: async (config, context) => { ... },
});
```

`getHandler()` passes the definition to lib-worker's `createHandler()`, which validates it and wraps `execute` with config resolution and the step's schemas.

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Task Construction](/docs/architecture/task-construction.md)
- [Run steps locally](https://orchestrator.finopsbricks.com/docs/workers/run-steps)
