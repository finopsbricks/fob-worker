# FOB CLI v9: Station Delete

## Status: NOT STARTED

Add a `fob stations delete <id>` command to delete a station definition from the orchestrator. Intended for removing stub/unused stations that were never implemented.

(Originally drafted as v8 `fob processes delete` before the [process→station vocabulary rename](process-to-station-vocabulary.md); restated here under the station nomenclature.)

---

## Problem Statement

There is no way to delete stations from the CLI. Removing an unused or abandoned station currently requires direct database access (`DELETE FROM processes WHERE id = '...'` — the orchestrator DB and API still use "process" as the table/route name). The CLI should expose this as a first-class command, following the same pattern as `fob work-records cancel`.

Stations with zero work records and no step implementations are safe to delete. The orchestrator schema already handles cascades: `work_records` and `item_processes` both reference `processes(id) ON DELETE CASCADE`.

## Proposed Solution

Add `delete` as a new action on the `stations` resource. The command calls `DELETE /api/v1/processes/:id` on the orchestrator (new endpoint to be added — keeps the existing `/api/v1/processes/*` URL space because the API contract is unchanged) and prints a confirmation. A `--force` flag skips the confirmation prompt for scripted use.

The API should:
- Return 404 if the station is not found
- Return 400 if the station has existing work records (guard against accidental deletion of active stations)
- Return 204 on success
- Cascade-delete `item_processes` rows (already handled by DB constraint)

## Implementation Phases

### Phase 1: Orchestrator API Endpoint ❌
- [ ] Add `DELETE /api/v1/processes/:id` route
- [ ] Guard: reject if the row has any work records (`SELECT COUNT(*) FROM work_records WHERE process_id = $1`)
- [ ] Return 204 on success, 400 if has work records, 404 if not found

### Phase 2: Orchestrator Client ❌
- [ ] Add `deleteStation(id)` to `src/utils/orchestrator.js` — `DELETE /api/v1/processes/:id` (HTTP path keeps the `processes` segment as the API contract)

### Phase 3: CLI Command ❌
- [ ] Create `src/cli/stations/delete.js` with `deleteStationHandler(argv)`
- [ ] Add `--force` flag to skip confirmation prompt
- [ ] Register `delete` in `src/cli/index.js` under the `stations` command group
- [ ] Update shell completion to include `delete`
- [ ] Update `demandCommand` message to include `delete`

### Phase 4: Tests ❌
- [ ] Create `tests/cli/stations/delete.test.js` (success, --force, 400 has-work-records, 404 not found)

### Phase 5: Documentation ❌
- [ ] Update `CLAUDE.md` — add `delete` to stations actions
- [ ] Update `docs/usage/commands.md` and `docs/cli-design-style.md` command map

## New Command

```bash
fob stations delete <id>          # Delete a station (with confirmation prompt)
fob stations delete <id> --force  # Skip confirmation prompt
```

**Output (success):**

```
============================================================
Deleted station abc123def456
Name:   Correct account metadata
Code:   P1
============================================================
```

**Output (has work records):**

```
============================================================
Error: Orchestrator API error (400): {"error":"Cannot delete station with existing work records","code":"HAS_WORK_RECORDS"}
============================================================
```

## Design Decisions

### Guard against deleting stations with work records

Deleting a station with history would orphan audit trail data. The guard lives in the API (not the CLI) so it applies regardless of how the API is called.

### `--force` skips confirmation, not the work-record guard

`--force` is for scripted/batch use — it skips the "are you sure?" prompt. It does not bypass the work-record guard; that is always enforced server-side.

## Related Files

- `src/utils/orchestrator.js` — `deleteStation(id)` function
- `src/cli/stations/delete.js` — Command handler
- `src/cli/index.js` — Command registration and shell completion
- `tests/cli/stations/delete.test.js` — Unit tests

## Related

- [process-to-station-vocabulary.md](process-to-station-vocabulary.md) — the rename that this WIP was restated under
- [fob-cli-v7-work-record-cancel.md](fob-cli-v7-work-record-cancel.md) — v7 (work-record cancel, the pattern this follows)
