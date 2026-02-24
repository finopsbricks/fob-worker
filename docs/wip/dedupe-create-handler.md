# Dedupe createHandler — CLI and lib-worker — COMPLETE

The `createHandler()` function was duplicated between the CLI and lib-worker, creating maintenance risk.

**Status:** Complete

---

## The Problem

`createHandler()` and `isStepDefinition()` are copy-pasted in two places:

| Location | File |
|----------|------|
| lib-worker | `lib/lib-worker/src/define-step.js:98-143` |
| CLI | `cli/src/utils/steps-loader.js:90-135` |

These functions wrap `defineStep()` definitions with Zod validation. If the validation logic changes in lib-worker, the CLI won't get the update.

---

## Root Cause

The CLI's `package.json` doesn't include `@fob/lib-worker` as a dependency:

```json
"dependencies": {
  "dotenv": "^16.6.1",
  "yargs": "^17.7.2"
}
```

Someone copy-pasted the functions to avoid wiring up the monorepo dependency.

---

## The Fix (Completed)

1. Added lib-worker as a GitHub dependency:

```json
// cli/package.json
"dependencies": {
  "@fob/lib-worker": "github:finopsbricks/lib-worker",
  ...
}
```

2. Updated `steps-loader.js` to import from lib-worker:

```javascript
import { isStepDefinition, getStepHandler } from '@fob/lib-worker';
```

3. Deleted the duplicated `isStepDefinition()` and `createHandler()` functions

4. Kept local `getHandler()` wrapper that enforces StepDefinition requirement (stricter than lib-worker's `getStepHandler`)

5. Used `npm link @fob/lib-worker` for local development

---

## Files Changed

- `cli/package.json` — added `@fob/lib-worker` dependency
- `cli/src/utils/steps-loader.js` — import from lib-worker, removed 55 lines of duplicated code
