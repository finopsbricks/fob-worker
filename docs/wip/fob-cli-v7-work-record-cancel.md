# FOB CLI v7: Work Record Cancel

## Status: COMPLETE

Add a `fob work-records cancel <id>` command to cancel a running or pending work record via the orchestrator's new `POST /api/v1/work-records/:id/cancel` endpoint.

---

## Problem Statement

The orchestrator added a cancel endpoint (commit `9800020e` — "cancel hung processes") to handle stuck or unwanted work records. Previously, cancellation was only possible through the web UI. The CLI needs a matching command so developers can cancel work records from the terminal.

## Proposed Solution

Add `cancel` as a new action on the `work-records` resource, following the existing CLI pattern. The command calls `POST /api/v1/work-records/:id/cancel` and prints a confirmation or error.

The API:
- Sets work record status to `cancelled`, `completed_at` to now, `error` to "Cancelled via API"
- Cancels pending/claimed StepQueue entries for the work record
- Returns 400 if work record is already in a terminal state (`completed`, `failed`, `timed_out`, `cancelled`)
- Requires `work_records:edit` permission

## Implementation Phases

### Phase 1: Orchestrator Client ✅
- [x] Add `cancelWorkRecord(id)` to `src/utils/orchestrator.js` — `POST /api/v1/work-records/:id/cancel`

### Phase 2: CLI Command ✅
- [x] Create `src/cli/work-records/cancel.js` with `cancelWorkRecordHandler(argv)`
- [x] Register `cancel` in `src/cli/index.js` under `work-records` command group
- [x] Update shell completion to include `cancel`
- [x] Update `demandCommand` message to include `cancel`

### Phase 3: Tests ✅
- [x] Create `tests/cli/work-records/cancel.test.js` (4 tests: success, --json, 400 terminal state, 404 not found)

### Phase 4: Documentation ✅
- [x] Update CLAUDE.md — add `cancel` to work-records actions in completion and package structure

## New Command

```bash
fob work-records cancel <id>          # Cancel a running/pending work record
fob work-records cancel <id> --json   # Raw JSON output
```

**Output (success):**

```
============================================================
Cancelled work record abc123def456
Status:   cancelled
Process:  proc_id
Error:    Cancelled via API
============================================================
```

**Output (already terminal):**

```
============================================================
Error: Orchestrator API error (400): {"error":"Work record is already in terminal state: completed","code":"INVALID_STATE"}
============================================================
```

## Design Decisions

### `cancel` as a standalone action, not a flag on `edit`

Cancel is a destructive, state-changing operation (not a metadata update). It follows the pattern of `fob steps run` and `fob processes run` — verb actions that trigger side effects. Making it `fob work-records edit <id> --cancel` would conflate metadata editing with lifecycle operations.

### No confirmation prompt

The CLI is a developer tool, not a production operations tool. Adding `--yes` / `--force` flags or interactive prompts adds complexity for little benefit in this context. The command is explicit enough (`cancel` with a specific ID).

## Related Files

- `src/utils/orchestrator.js` — `cancelWorkRecord(id)` function
- `src/cli/work-records/cancel.js` — Command handler
- `src/cli/index.js` — Command registration and shell completion
- `tests/cli/work-records/cancel.test.js` — Unit tests

## Related

- [fob-cli-v6-deep-show.md](fob-cli-v6-deep-show.md) — v6 (deep show)
- [fob-cli-v5-tags.md](fob-cli-v5-tags.md) — v5 (tags, complete)
