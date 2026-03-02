# Remove Orchestrator Config Dump from Handlers

## Status: COMPLETE

Handlers print a debug-style config block before every API call. This is noise — the org field is always `(not set)` (never in env), and URL/key status are already visible via `fob config`. Follows gh-style output: one summary line, no preamble.

---

## Problem

5 handlers print this before their actual output:

```
Orchestrator: https://...
Org: (not set)         ← always (not set), not in env
API Key: ***
```

`getOrchestratorConfig()` in `orchestrator.js` doesn't even return `.org`, so `Org` is always `(not set)`. Also two stray debug logs in `orchestrator.js`: one dumps auth headers to stdout, one is a `"\n\n\nerror"` panic log.

---

## Changes

### Phase 1: Clean up orchestrator.js
- [x] Delete `getOrchestratorConfig()` export
- [x] Remove `console.log(headers)` (line 82)
- [x] Remove `console.log("\n\n\nerror")` (line 96)

### Phase 2: Remove config dump from handlers
- [x] `src/cli/processes/list.js`
- [x] `src/cli/processes/push.js`
- [x] `src/cli/processes/pull.js`
- [x] `src/cli/work-records/list.js`
- [x] `src/cli/worker/status.js`

---

## Files

- `src/utils/orchestrator.js` — delete `getOrchestratorConfig`, remove debug logs
- `src/cli/processes/list.js`
- `src/cli/processes/push.js`
- `src/cli/processes/pull.js`
- `src/cli/work-records/list.js`
- `src/cli/worker/status.js`
