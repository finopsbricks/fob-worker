## Status: COMPLETE

Promote the operational monitor work that lives today as standalone scripts in `workers/worker-alex/scripts/{line-monitor,workpiece-monitor}.js` into first-class `fob` CLI commands. Add `--state` to existing `fob lines` / `fob stations` show/list and introduce a new `fob workpieces` resource. The CLI becomes the universal FDE tool for both the definitional view (config from `.orchestrator/processes/*.json`) and the operational view (live bins on `temp/stations/*`).

Companion to `workers/worker-alex/docs/wip/nomenclature-migration.md` — this is the operational half of Stage 3 (CLI surface). The definitional half (`fob stations` alias for `fob processes`, `fob lines list/show` reading local JSON) is in-flight uncommitted in this repo.

---

## Problem Statement

### Two queries about a line, two locations

| | Definitional | Operational |
|---|---|---|
| Question | Which stations are on the VM line? What's the dependency / conveyor topology? | How many workpieces are in-flight? Where is each one? Anything stuck? |
| Source | `.orchestrator/processes/*.json` | `temp/stations/{STATION}/{BIN}/{workpiece_id}/` |
| Today | `fob lines show VM` (in flight, uncommitted) | `node scripts/line-monitor.js` (one worker repo only) |
| Audience | Anyone designing or pushing a line | Any FDE debugging or operating a line |

Definitional is covered by the in-flight CLI work. Operational is not. FDEs at other worker repos can't answer "where is my line at?" without porting `line-monitor.js` themselves.

### The local-only scripts that exist today (in worker-alex)

- `scripts/line-monitor.js` — per-line summary (default), `--line VM` station × live-bin table, `--line VM --workpieces` per-workpiece position, `--station VM3` single-station drilldown
- `scripts/workpiece-monitor.js` — `<id-or-substring>` single-workpiece deep view (position + journey from `log.jsonl` + Cmd-clickable folder link); substring with >1 match auto-promotes to dashboard; `--bin STATION/BIN` for bin-scoped dashboard; `--watch` for tail-style updates

Generic, line-aware, no registry coupling, no worker-specific knowledge. Designed in `workers/worker-alex/docs/wip/{line-monitor,workpiece-monitor}.md` (both already shipped, marked COMPLETE). The mental model is documented in `fde-handbook/patterns/structural/assembly-line-processing.md` (5-bin contract; `done` is a receipt not a position) and `fde-handbook/patterns/conceptual/file-system-as-state-machine.md` (observability via the filesystem is the explicit virtue).

### Why the CLI should own this

- Same audience: an FDE running `fob processes show` is the same person asking "where is this workpiece?"
- `fob` is universally installed across worker repos; `scripts/*.js` is per-repo
- Both views are already CLI-resource-aligned: `lines`, `stations`, plus a new `workpieces`
- Retiring `scripts/*-monitor.js` removes a second tool to learn / install / maintain

---

## Proposed Solution

### Command surface

Mapping every local script invocation to a CLI command:

| Today's local script | Proposed CLI |
|---|---|
| `line-monitor.js` (default summary of all lines) | `fob lines list --state` |
| `line-monitor --line VM` (station × live-bin table) | `fob lines show VM --state` |
| `line-monitor --station VM3` (one station w/ ids per bin) | `fob stations show VM3 --state` |
| `line-monitor --line VM --workpieces` (positions of every workpiece on a line) | `fob workpieces list --line VM` |
| `workpiece-monitor <id>` (single workpiece deep view) | `fob workpieces show <id>` |
| `workpiece-monitor <substring>` (auto-dashboard when >1 match) | `fob workpieces list --match <substring>` |
| `workpiece-monitor --bin VM3/failed` (bin-scoped dashboard) | `fob workpieces list --bin VM3/failed` |
| `--watch` on either script | `--watch` flag on the relevant `fob` command |

### Why `--state` and not a separate `status` verb

`cli/docs/cli-design-style.md` enumerates the allowed actions: `list, show, create, edit, delete, pull, push, run`. `status` is not among them. The codebase already uses include-style flags for "show me more on this entity" (`fob work-records show --report --steps --supporting-docs --activity`). `fob lines show VM --state` follows the same precedent and stays inside the documented action set.

`workpieces` is a new resource (no definitional layer exists — workpieces are runtime filesystem entities seeded by the line-head station). For it, `list` *is* the operational dashboard and `show` *is* the deep view. No `--state` flag needed there.

### Mental model that flows through

A workpiece's **live position** is the most-advanced **live bin** holding it. Live bins: `input | doing | output | failed`. `done` is an archive receipt of a successful forward move — not a position. Position resolution: walk stations terminal → source; at each, check `output > doing > input > failed`; first match wins. This rule is identical for `fob lines show VM --state`, `fob lines list --state`, `fob workpieces list`, and `fob workpieces show`.

### Sketches

**`fob lines list --state`** — augments the existing definitional table with operational columns:

```
LINE  STATIONS  MEMBERS                    IN-FLIGHT  STUCK  FINISHED  HEALTH
VM    5         VM0, VM2, VM3, VM4, VM5    0          7      8         ⚠ 7 stuck at VM3/failed
```

Without `--state`, today's definitional output stays unchanged.

**`fob lines show VM --state`** — adds the station × live-bin block below the existing definitional output (members, dependencies, conveyors):

```
Stations: VM0 → VM2 → VM3 → VM4 → VM5 (terminal: VM5)

Station  input  doing  output  failed  (done)
-------  -----  -----  ------  ------  ------
VM0          -      -       0       -       -
VM2          0      0       0       0    (15)
VM3          0      0       0       7     (8)
VM4          0      0       0       0     (8)
VM5          0      0       8       0     (8)
-------  -----  -----  ------  ------
live         0      0       8       7

`done` shown in parens for audit; excluded from live totals.
```

**`fob stations show VM3 --state`** — single-station drilldown with workpiece ids per bin (replaces `line-monitor --station VM3`).

**`fob workpieces show <id>`** — position + journey from `log.jsonl` + Cmd-clickable `file://` folder link. Same shape as `workpiece-monitor.js` today.

**`fob workpieces list --bin VM3/failed`** — dashboard: `(workpiece, position, last event)` table with an `Open` section underneath listing folder links per row.

**`fob workpieces list --line VM` / `--match <substring>` / no args** — same dashboard, scoped to whatever the flags select. With no scope flags, every workpiece on disk.

**`--watch`** — append-style tail (matches the current scripts). On `show <id>`, prints new log events and bin transitions tagged by timestamp. On `list ...`, prints per-id-tagged notices: `→ moved from X to Y`, new log events, and `✓ finished` once per workpiece reaching terminal output (then drops from polling).

### Where the logic lives — `cli/src/utils/line-state.js`

A single CLI-scoped helper module. The CLI is the only consumer (worker-alex scripts get retired in Phase 5); promoting to `@fob/lib-worker` would bloat the runtime library with diagnostic code the worker process doesn't use.

```js
// cli/src/utils/line-state.js
export function loadLineState({ stations_root });        // discover lines, scan all bins
export function resolvePosition(workpiece_id, lines);   // most-advanced live bin
export function findWorkpieceMatches(query, lines);     // substring across all bins
export function collectIdsForBin(binSpec, lines);       // STATION/BIN → ids
export function readWorkpieceLog(workpiece_dir);        // log.jsonl → array of events
```

Command handlers in `cli/src/cli/{lines,stations,workpieces}/*.js` call these and format. Render helpers (table, folder link, journey-with-durations, last-event-compact) live alongside the handlers.

### What does NOT change

- `@fob/lib-worker` — no new exports, no API surface change.
- Orchestrator API — monitor commands read the filesystem only.
- `fob processes` — keeps working unchanged (Stage 5/6 of nomenclature-migration handles its eventual retirement, separate WIP).
- Definitional behavior of existing `fob lines list/show` (Stage 3 in-flight) — `--state` is purely additive.

### Pre-requisite

The in-flight Stage 3 work in this repo (currently uncommitted) ships first:
- `buildProcessSubcommands()` helper in `cli/src/cli/index.js` — DRY-shared between `fob processes` and `fob stations`
- `fob lines list` and `fob lines show <code>` — definitional, reads `listLocalStations()` from `cli/src/utils/process-files.js`
- Shell completion updates for `stations`, `lines`

This WIP layers on top. Without that pre-req, the operational handlers would have nowhere to plug into.

---

## Implementation Phases

### Phase 0: Pre-req — ship the in-flight Stage 3 work ✅
- [x] Land the uncommitted `fob stations` alias + `fob lines list/show` (definitional) currently in the working tree
- [x] Verify the existing `cli-design-style.md` map reflects the new resources (`stations`, `lines`)
- [x] Confirm `process-files.js#listLocalStations()` derives the line via the JSON `line` field (and that worker-alex JSON needs the `line` key added — Stage 2 of nomenclature-migration)

### Phase 1: `cli/src/utils/line-state.js` ✅
- [x] Port from `workers/worker-alex/scripts/line-monitor.js` + `workpiece-monitor.js`:
  - `loadLineState({ stations_root })` — discover lines by 2-letter station prefix; scan all 5 bins; return `{ code, stations[], terminal, bins[station][bin]: Set<id> | null }`
  - `resolvePosition(id, lines)` — terminal → source, `output > doing > input > failed`, first match wins; fallback to done-only anomaly
  - `findWorkpieceMatches(query, lines)` — substring across every bin; resolve each match to its live position
  - `collectIdsForBin(binSpec, lines)` — `STATION/BIN` → array of ids; validate spec shape
  - `readWorkpieceLog(workpiece_dir)` — parse `log.jsonl`, skip blank lines, drop unparseable lines silently
- [x] Unit tests in `cli/tests/utils/line-state.test.js` (fixtures: synthetic `temp/stations/` tree)
- [x] Resolve `stations_root` from the worker repo cwd via existing CLI conventions

### Phase 2: `--state` flag on lines/stations ✅
- [x] `fob lines list --state` — appends `IN-FLIGHT`, `STUCK`, `FINISHED`, `HEALTH` columns to the existing table; non-state mode unchanged
- [x] `fob lines show <code> --state` — appends the station × live-bin block (with `done` in parens, excluded from totals) below the existing definitional output
- [x] `fob stations show <code> --state` — appends per-bin ids list (single-station drilldown)
- [x] Help text + shell completion updates for the new flag
- [x] Tests in `cli/tests/cli/lines/list.test.js`, `show.test.js`, `cli/tests/cli/processes/show.test.js` (since `stations show` reuses the process handler via `buildProcessSubcommands`)

### Phase 3: `fob workpieces` resource ✅
- [x] Create `cli/src/cli/workpieces/{list,show}.js`
- [x] Wire up `fob workpieces` in `cli/src/cli/index.js` (yargs tree + shell completion)
- [x] `fob workpieces list` — dashboard table (`Workpiece`, `Position`, `Last event`) + `Open` section with folder links
  - [x] `--line <code>` to scope to one line
  - [x] `--bin STATION/BIN` for bin-scoped dashboard (mutex with `--line` or layered? — answer in Open Questions)
  - [x] `--match <substring>` to filter by id substring (mutex with `--bin`?)
- [x] `fob workpieces show <id-or-substring>` — single-workpiece deep view: position + journey (durations from paired `station_started` / `station_complete`) + Cmd-clickable `file://` folder link
  - [x] Substring resolving to >1 match auto-promotes to the dashboard (single workpiece view requires exact-or-unique)
- [x] Tests in `cli/tests/cli/workpieces/{list,show}.test.js`
- [x] Update `cli/docs/cli-design-style.md` command map and `cli/CLAUDE.md` to mention the new resource

### Phase 4: `--watch` flag ✅
- [x] `fob workpieces show <id> --watch` — initial full render, then per-tick: re-resolve position, print bin transitions and new log events (append-style)
- [x] `fob workpieces list ... --watch` — initial dashboard, then per-tick: per-id-tagged notices for moves (`→ moved from X to Y` + new folder link), new log events, and one-time `✓ finished` when reaching terminal output (stops following finished items)
- [x] `--interval N` companion (default 2s); SIGINT clean exit
- [x] Whether `fob lines show --state --watch` makes sense: defer to v2 unless requested
- [x] Tests cover: at least one tick of watch loop with a fake clock

### Phase 5: Retire the local scripts ✅
- [x] Remove `workers/worker-alex/scripts/line-monitor.js`
- [x] Remove `workers/worker-alex/scripts/workpiece-monitor.js`
- [x] Update `workers/worker-alex/CLAUDE.md` Common Development Commands section: replace the two `node scripts/*` lines with their `fob` equivalents
- [x] Mark `workers/worker-alex/docs/wip/{line-monitor,workpiece-monitor}.md` as superseded (or `git rm` with a note in commit body)
- [x] Cross-link from `nomenclature-migration.md` Stage 3 to this WIP completion

---

## Open Questions

- **`fob workpieces list` flag composition**: are `--line`, `--bin`, `--match` mutually exclusive or layered? Layered is more powerful (`--line VM --match 2026060` → 12 matches on the VM line) but means error cases multiply. Recommend: layered with sane defaults; `--bin` implies a line scope so doesn't combine with `--line`.
- **Watch on definitional views**: `fob lines show VM --state --watch` is technically meaningful (counts changing over time) but the dashboard via `fob workpieces list --line VM --watch` is more informative for live operations. Defer until requested.
- **Workpieces resource in shell completion**: add `workpieces` to the top-level completion array and add its action list. Single-line change once handlers exist.
- **Stations_root discovery**: relative to cwd is the existing convention. Confirm it works when the CLI is invoked from a worker repo's root (it does — `temp/stations/` is per-worker).
- **JSON output**: `--json` is the precedent on every other `list/show` command. Add it to the new monitor commands as well for parity (cheap, future-proof).
- **Coupling to JSON `line` field**: `fob lines list --state` could work entirely from filesystem (discover lines via station prefix in `temp/stations/`) without reading any JSON. But `fob lines list` (no `--state`) reads JSON. So `--state` either (a) augments the JSON-derived line list with state counts and silently skips lines that have stations on disk but no JSON definition, or (b) unions the two sources. Recommend (a) for v1 — surfacing the JSON-only view of "lines that exist by definition." A `--include-unconfigured` flag could surface filesystem-only lines later if needed.

---

## Related Files

**Will create**
- `cli/src/utils/line-state.js` — bin-walking helpers (port from worker-alex/scripts)
- `cli/src/cli/workpieces/list.js`, `cli/src/cli/workpieces/show.js`
- `cli/tests/utils/line-state.test.js`
- `cli/tests/cli/workpieces/list.test.js`, `cli/tests/cli/workpieces/show.test.js`

**Will modify**
- `cli/src/cli/lines/list.js`, `cli/src/cli/lines/show.js` — add `--state` rendering
- `cli/src/cli/processes/show.js` (drives `fob stations show`) — add `--state` rendering, single-station drilldown
- `cli/src/cli/index.js` — wire up `fob workpieces`; add `--state` and `--watch` flag definitions
- `cli/docs/cli-design-style.md` — current command map, design note on operational vs definitional
- `cli/CLAUDE.md` — short note on the new monitor surface
- `workers/worker-alex/CLAUDE.md` — replace the two `node scripts/*` lines with `fob` equivalents (Phase 5)

**Will delete**
- `workers/worker-alex/scripts/line-monitor.js` (Phase 5)
- `workers/worker-alex/scripts/workpiece-monitor.js` (Phase 5)

**Reference (do NOT modify)**
- `workers/worker-alex/docs/wip/nomenclature-migration.md` — Stage 3 context this WIP operationalises
- `workers/worker-alex/docs/wip/line-monitor.md`, `workpiece-monitor.md` — local-script designs being ported
- `fde-handbook/patterns/structural/assembly-line-processing.md` — 5-bin contract; live vs receipt; position resolution rule
- `fde-handbook/patterns/conceptual/file-system-as-state-machine.md` — observability rationale
- `cli/docs/cli-design-style.md` — resource/action shape; flag-on-edit pattern; standard verbs
- `cli/docs/architecture/lib-worker-resolution.md` — why CLI does NOT depend on `@fob/lib-worker` (informs the "keep line-state in cli/" decision)
- `cli/docs/wip/refactor-cli-structure.md` — sibling structural WIP if relevant
