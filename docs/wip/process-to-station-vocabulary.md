# Process → Station Vocabulary Transition

## Status: IN PROGRESS (~50%) — Phase 1 done, tests red and waiting for Phase 2

Hard rename of the CLI's vocabulary from "process" to "station" to match the architecture's new factory-floor metaphor. The orchestrator database and HTTP API still use "process" and are out of scope — HTTP path literals in `src/utils/orchestrator.js` stay as `/api/v1/processes/*`, but every JS symbol and user-facing string in the CLI becomes `station`.

**No alias.** `fob processes` is removed outright. Decision date: 2026-06-11.

---

## Problem Statement

The wider FinOpsBricks architecture is moving to a factory-floor metaphor: **lines** of **stations** that move **workpieces** through **bins**. The CLI has already adopted `lines`, `workpieces`, and `bins` as first-class resources, and `fob stations` was added as a vocabulary alias for `fob processes`. But `processes` is still the canonical surface — it is listed first in completion, the source lives in `src/cli/processes/`, internal symbols are `*ProcessHandler`, and most docs say "process".

End state: the CLI speaks "station" everywhere a developer or user could see. Only the HTTP path strings inside the API client remain as `process`, because the orchestrator API contract has not been migrated yet.

## What's Already Done

Foundation work that landed earlier:

- `buildProcessSubcommands(yargs, { plural, singular })` in `src/cli/index.js:57` threads vocab through all yargs `describe` strings — both `fob processes` and `fob stations` invoke the same builder.
- `src/utils/process-files.js` supports a dual on-disk layout: legacy `.orchestrator/processes/` and new `.orchestrator/stations/` via a `layout` option (line 102).
- `fob lines`, `fob workpieces` resources already exist and use station-flavored language.
- `src/utils/line-state.js` already imports `listLocalStations` from `process-files.js` — partial station-renaming in `process-files.js` already happened.

That means much of the threading is done. The remaining work is collapsing the dual-vocabulary into one (station) and removing every trace of "process" from the CLI side.

## Resolved Decisions

1. **No `fob processes` alias.** Hard removal. Muscle memory will break; this is accepted.
2. **Default on-disk layout is `.orchestrator/stations/`.** Legacy `.orchestrator/processes/` read path stays in `station-files.js` as a back-compat fallback for one release cycle — but the CLI never writes there.
3. **API client function names are renamed.** `listProcesses()` → `listStations()`. HTTP path strings like `/api/v1/processes/${id}` stay unchanged — that's the API boundary.
4. **`fob-cli-v8-process-delete.md` will be restated as `fob stations delete`** after this WIP lands.

## Blast Radius (verified)

| Area | Files | Notes |
|------|-------|-------|
| `src/cli/processes/` handlers | 8 | Move to `src/cli/stations/`; rename `*ProcessHandler` → `*StationHandler` |
| `src/cli/index.js` | 1 | Remove `fob processes` command, rename `buildProcessSubcommands` → `buildStationSubcommands`, drop vocab threading (only one vocab now), update completion + demandCommand |
| `src/utils/process-files.js` | 1 | Rename to `src/utils/station-files.js`; rename `saveProcess`/`loadProcess`/`getProcessesDir`; keep legacy `.orchestrator/processes/` read fallback |
| `src/utils/orchestrator.js` | 1 | Rename JS symbols (`listProcesses`→`listStations`, `getProcess`→`getStation`, `runProcess`→`runStation`, `getProcessItems`→`getStationItems`, `getItemProcesses`→`getItemStations`, params `processId`→`stationId`). **HTTP path strings stay unchanged.** |
| `src/utils/line-state.js` | 1 | Update import path to `./station-files.js` |
| `tests/cli/processes/` | 7 | **Deferred to Phase 2.** Will be red after Phase 1 lands. |
| `CLAUDE.md` | 1 | Lead with `fob stations`; remove `processes` from command list; update package structure |
| `README.md` | 1 | Update completion examples |
| `docs/usage/*.md`, `docs/architecture/process-files-layout.md` | 4 | **Deferred to Phase 3.** |
| `docs/wip/fob-cli-v8-process-delete.md` | 1 | **Deferred to Phase 4** — restate in station vocabulary |

## Out of Scope (Hard Boundaries)

- **HTTP path literals** like `/api/v1/processes/${id}` in `src/utils/orchestrator.js` — the orchestrator API contract is unchanged.
- **JSON response field names** from the API (`response.data` rows carry fields like `process_id` if the API returns them). Where the API returns objects with `process` keys, we use the API field names as-is on response objects, but the local variables we destructure into use station naming.
- **Node's global `process`** — `process.exit`, `process.env`, `process.cwd` are unrelated and stay.

## Implementation Phases

### Phase 1: Hard rename — source + index + CLAUDE.md + README ✅
- [x] Investigate blast radius (this WIP file)
- [x] Rename `src/utils/process-files.js` → `src/utils/station-files.js`; collapsed `layout` option (always stations); kept legacy `.orchestrator/processes/` read fallback for `findStationFile`
- [x] Renamed API client functions in `src/utils/orchestrator.js` (`listProcesses`→`listStations`, etc.); HTTP path strings + `setEntityTags('processes', …)` URL-segment kept as the API contract
- [x] `git mv src/cli/processes/ src/cli/stations/`
- [x] Renamed handler exports: `*ProcessHandler` → `*StationHandler`; renamed internal vars; hardcoded "Station" in user-facing strings
- [x] Updated `src/cli/index.js`: removed `fob processes` command, renamed builder to `buildStationSubcommands` (dropped vocab threading), updated imports, completion array, `demandCommand` message
- [x] Renamed `--process` flags to `--station` on `fob steps run` and `fob work-records list`; renamed `--processes` flag to `--stations` on `fob items show` (dropped clashing `-s` aliases)
- [x] Updated `src/utils/line-state.js`, `src/cli/lines/list.js`, `src/cli/lines/show.js`, `src/cli/steps/run.js`, `src/cli/items/show.js`, `src/cli/work-records/list.js`, `src/cli/work-records/show.js`, `src/cli/work-records/cancel.js` (the importers that called the renamed modules / used the old flag names / displayed "Process" labels)
- [x] Updated `CLAUDE.md` § Overview, § Commands, § Shell Completion, § Package Structure
- [x] Updated `README.md` tagline
- [x] Cleaned up leftover docstrings in `src/index.js`, `src/utils/tags.js`, `src/utils/picker.js`
- [x] Manual smoke test: `--help`, `stations --help`, `completion`, `steps run --help`, `work-records list --help`, `items show --help`, `--get-yargs-completions`

**Phase 1 follow-ups noted for later:**
- `fob processes <anything>` currently exits 0 silently because yargs lacks `.strict()`. Worth adding so the removed command produces a clear error, but it's a behavior change beyond the rename.
- `src/utils/station-files.js` still references `.orchestrator/processes/` as a legacy read fallback (intentional back-compat). Drop it after one release cycle.

### Phase 2: Tests ❌
- [ ] `git mv tests/cli/processes/ tests/cli/stations/`
- [ ] Update test imports (`src/cli/processes/...` → `src/cli/stations/...`)
- [ ] Update mocked function names (`listProcesses` → `listStations`)
- [ ] Update `describe('*ProcessHandler')` blocks → `describe('*StationHandler')`
- [ ] Run `npm test` — all green

### Phase 3: Documentation ❌
- [ ] `git mv docs/usage/process-sync.md docs/usage/station-sync.md`
- [ ] Update `docs/usage/commands.md` — `fob processes` → `fob stations` (18 refs)
- [ ] Update `docs/architecture/process-files-layout.md` (rename to `station-files-layout.md`) (8 refs)
- [ ] Update `docs/usage/monitoring.md`, `docs/usage/scenarios.md`, etc.
- [ ] Update cross-links across `docs/`

### Phase 4: Outstanding WIP cleanup ❌
- [ ] Restate `docs/wip/fob-cli-v8-process-delete.md` as `fob-cli-v9-station-delete.md` (or roll its phases into this WIP)

### Phase 5: Release ❌
- [ ] Update CHANGELOG.md — breaking change (`fob processes` removed)
- [ ] Bump major version (this is a breaking CLI surface change)
- [ ] Delete this WIP file when shipped

## Related Files

- `src/cli/index.js:57` — `buildProcessSubcommands()` (rename + simplify)
- `src/cli/index.js:241–246` — `processes` / `stations` command registration (collapse to one)
- `src/cli/processes/*.js` — 8 handler files (move + rename)
- `src/utils/process-files.js` — rename file + symbols
- `src/utils/orchestrator.js` — rename JS symbols only, keep HTTP path strings
- `src/utils/line-state.js` — update import
- `tests/cli/processes/*.test.js` — Phase 2
- `CLAUDE.md`, `README.md` — Phase 1
- `docs/usage/process-sync.md`, `docs/usage/commands.md`, `docs/architecture/process-files-layout.md` — Phase 3

## Related

- [fob-cli-v8-process-delete.md](fob-cli-v8-process-delete.md) — outstanding `delete` action, to be restated under station vocabulary in Phase 4
