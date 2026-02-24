# Dedupe createHandler — CLI and lib-worker

The `createHandler()` function is duplicated between the CLI and lib-worker, creating maintenance risk.

**Status:** Pending

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

## The Fix

1. Add lib-worker as a workspace dependency:

```json
// cli/package.json
"dependencies": {
  "@fob/lib-worker": "workspace:*",
  "dotenv": "^16.6.1",
  "yargs": "^17.7.2"
}
```

2. Update `steps-loader.js` to import from lib-worker:

```javascript
import { createHandler, isStepDefinition } from '@fob/lib-worker';
```

3. Delete the duplicated functions from `steps-loader.js` (lines 80-135)

4. Run `npm install` in cli to wire up the workspace link

5. Test with `fob steps run` to verify behavior is unchanged

---

## Files to Change

- `cli/package.json` — add dependency
- `cli/src/utils/steps-loader.js` — import instead of define

---

## Verification

```bash
# After changes
cd cli
npm install
fob steps run alex/fetch_account_freshness
fob steps run alex/generate_freshness_email
```

Both should work identically to before.
