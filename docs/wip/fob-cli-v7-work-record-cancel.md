# FOB CLI v7: Work Record Cancel

**Status:** Complete
**Created:** 2026-03-16

**Previous:** [fob-cli-v6-deep-show.md](fob-cli-v6-deep-show.md)

## Summary

Add a `fob work-records cancel <id>` command to cancel a running or pending work record via the orchestrator's new `POST /api/v1/work-records/:id/cancel` endpoint. The API cancels the work record, cancels any pending/claimed step queue entries, logs the event, and notifies process watchers.

---

## Background

The orchestrator added a cancel endpoint (commit `9800020e` — "cancel hung processes") to handle stuck or unwanted work records. Previously, cancellation was only possible through the web UI. The CLI needs a matching command so developers can cancel work records from the terminal.

The API:
- Sets work record status to `cancelled`, `completed_at` to now, `error` to "Cancelled via API"
- Cancels pending/claimed StepQueue entries for the work record
- Returns 400 if work record is already in a terminal state (`completed`, `failed`, `timed_out`, `cancelled`)
- Requires `work_records:edit` permission

---

## New Command

```bash
fob work-records cancel <id>    # Cancel a running/pending work record
```

**Output (success):**

```
====
Cancelled work record abc123def456
Status:   cancelled
Process:  proc_id
Error:    Cancelled via API
====
```

**Output (already terminal):**

```
====
Error: Work record is already in terminal state: completed
====
```

**Options:**
- `--json` — Output raw API response as JSON

---

## Orchestrator API

| Method | Route | Permission | Purpose |
|--------|-------|------------|---------|
| `POST` | `/api/v1/work-records/:id/cancel` | `work_records:edit` | Cancel a running/pending work record |

**Request:**

```http
POST /api/v1/work-records/wr_abc123/cancel
api-key: pk_abc123
api-secret: sk_xyz789
```

**Success Response (200):**

```json
{
  "data": {
    "id": "wr_abc123",
    "item": "item_xyz",
    "process": "proc_abc",
    "status": "cancelled",
    "started_at": "2024-01-20T14:00:00Z",
    "completed_at": "2024-01-20T14:05:00Z",
    "performed_by": null,
    "error": "Cancelled via API",
    "created_at": "2024-01-20T13:55:00Z"
  }
}
```

**Error Response (400):**

```json
{
  "error": "Work record is already in terminal state: completed",
  "code": "INVALID_STATE"
}
```

**Error Response (404):** Work record not found.

---

## Implementation Plan

### Phase 1: Orchestrator Client

1. [ ] Add `cancelWorkRecord(id)` to `src/utils/orchestrator.js`
   - `POST /api/v1/work-records/:id/cancel`
   - No request body needed

### Phase 2: CLI Command

1. [ ] Create `src/cli/work-records/cancel.js`
   - Export `cancelWorkRecordHandler(argv)`
   - Validate `id` is provided
   - Call `cancelWorkRecord(id)`
   - Handle 400 (terminal state) — print error message, exit 1
   - Handle 404 (not found) — print error message, exit 1
   - On success — print formatted confirmation
   - `--json` flag for raw output
2. [ ] Register `cancel` in `src/cli/index.js` under `work-records` command group
   - `.command('cancel [id]', 'Cancel a running work record', ...)`
   - Positional: `id` (string, required)
   - Option: `--json` (boolean)
3. [ ] Update shell completion in `src/cli/index.js`
   - Add `'cancel'` to work-records action list
4. [ ] Update `demandCommand` message to include `cancel`

### Phase 3: Tests

1. [ ] Create `tests/cli/work-records/cancel.test.js`
   - Success — prints confirmation with ID and status
   - Success with `--json` — prints raw response
   - 400 error (terminal state) — prints error, exits 1
   - 404 error (not found) — prints error, exits 1
   - Missing `id` — prints error, exits 1

### Phase 4: Documentation

1. [ ] Update CLAUDE.md — add `cancel` to work-records actions in completion and package structure sections

---

## Design Decisions

### `cancel` as a standalone action, not a flag on `edit`

Cancel is a destructive, state-changing operation (not a metadata update). It follows the pattern of `fob steps run` and `fob processes run` — verb actions that trigger side effects. Making it `fob work-records edit <id> --cancel` would conflate metadata editing with lifecycle operations.

### No confirmation prompt

The CLI is a developer tool, not a production operations tool. Adding `--yes` / `--force` flags or interactive prompts adds complexity for little benefit in this context. The command is explicit enough (`cancel` with a specific ID).

---

## Files to Add/Modify

### CLI (`cli`)

| File | Changes |
|------|---------|
| `src/utils/orchestrator.js` | Add `cancelWorkRecord(id)` |
| `src/cli/work-records/cancel.js` | **New** — `cancelWorkRecordHandler(argv)` |
| `src/cli/index.js` | Register `cancel` action, update completion |
| `tests/cli/work-records/cancel.test.js` | **New** — Unit tests |
| `CLAUDE.md` | Add `cancel` to work-records actions |

---

## Related

- [fob-cli-v6-deep-show.md](fob-cli-v6-deep-show.md) — v6 (deep show)
- [fob-cli-v5-tags.md](fob-cli-v5-tags.md) — v5 (tags, complete)
