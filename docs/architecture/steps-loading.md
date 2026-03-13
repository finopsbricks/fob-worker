# Steps Loading

How the CLI dynamically imports and validates step handlers from a worker repo.

## Loading Process

`loadSteps(stepsPath)` in `src/utils/steps-loader.js`:

1. Converts `stepsPath` to a `file://` URL (required for Windows compatibility)
2. Dynamic `import()` loads the module
3. Expects the module to export a `steps` object: `export const steps = { ... }`
4. Returns the steps registry map

## StepDefinition Requirement

Steps must be created with `defineStep()` from `@fob/lib-worker`. Plain function exports are rejected:

```javascript
// Required — must use defineStep()
export default defineStep({
  slug: 'org/step_name',
  execute: async (config, context) => { ... },
});
```

`getHandler()` calls `isStepDefinition()` and `getStepHandler()` from the worker's `@fob/lib-worker` (loaded at runtime via `getLibWorker()` — see [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md)). If the step is a plain function, it throws with a clear error message.

## Steps Registry Format

The worker's `src/steps/index.js` maps slugs to step definitions:

```javascript
import fetchData from './verify_statement/fetch_data.js';
import checkBalances from './verify_statement/check_balances.js';

export const steps = {
  'alex/fetch_data': fetchData,
  'alex/check_balances': checkBalances,
};
```

## File Path Mapping

`loadStepsWithFiles()` additionally parses the index file source to extract slug → file path mappings. This is used by `fob steps list` to show which file each step comes from.

The parser extracts `import name from './path'` statements and correlates them with `'slug': name` entries in the exports.

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Task Construction](/docs/architecture/task-construction.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
- [Step Handler Pattern](/Users/alex/ec2code/finopsbricks/accounting-process-standards/steps/step-handler-pattern.md)
