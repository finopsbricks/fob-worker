# FOB CLI: Empty Bins

## Status: COMPLETE

Add `empty-bins` commands on both `fob stations` and `fob lines` to wipe live and archive bins for a station or an entire line. Mirrors the `STATION/BIN` mental model already used by `fob workpieces list --bin <STATION>/<BIN>` and the columns rendered by `fob lines status`/`fob stations status`.

---

## Problem Statement

When iterating on a line (e.g. retrying IG0 against changed scenario data, or resetting a stuck workpiece bundle), the only way to clear bins today is `rm -rf temp/stations/<STATION>/<BIN>` by hand. That's tedious and error-prone — you have to know which stations belong to a line and remember to clear every one.

Operationally we already think in terms of bins (the columns shown in `fob lines status`):

```
STATION  INPUT  DOING  OUTPUT  FAILED  (DONE)
---------------------------------------------
IG0      —      —      159     —       —
IG3      0      0      3       0       (3)
```

We want a CLI verb that maps to the same shape: "empty the OUTPUT bin of IG0" or "empty all bins across the IG line."

## Proposed Solution

Two new commands, both reusing `loadLineState()` to discover topology and bin contents:

```bash
fob stations empty-bins <STATION> --output                 # one bin
fob stations empty-bins <STATION> --output --failed        # multiple bins (flag-combinable)
fob stations empty-bins <STATION> --all-bins               # all 5 bins, registry kept
fob stations empty-bins <STATION> --all                    # all 5 bins + intake-registry (full reset)
fob stations empty-bins <STATION> --intake-registry        # registry only, bins kept
fob stations empty-bins <STATION> --all --yes              # skip confirmation

fob lines empty-bins <LINE> --all                          # every bin × every station + every registry
fob lines empty-bins <LINE> --all-bins                     # bins across the line, registries kept
fob lines empty-bins <LINE> --output --failed
fob lines empty-bins <LINE> --all --yes
```

### Behaviour

- **Bin / scope selection** — must pass at least one of:
  - `--all` → all 5 bins **and** the intake-registry (intake-registry.jsonl, line-head allocation log). The "full reset" verb.
  - `--all-bins` → all 5 bins; registry untouched. Lets you wipe workpiece state without resetting allocation.
  - `--input` / `--doing` / `--output` / `--failed` / `--done` → individual bins, combinable. Registry untouched.
  - `--intake-registry` → registry only. Combinable with any of the above.
- **Resolution**: station handler validates the short_code against `loadLineState()`; line handler validates the line code. Errors mirror `fob stations status` / `fob lines status` wording.
- **Preview**: prints a `STATION  BIN  COUNT` table for what's about to be removed plus a total. Counts come from the already-scanned line state (matches what the user just saw via `status`). The intake registry shows in the BIN column as `intake-registry` with a count of the JSONL line count.
- **Confirmation**: by default, asks `Wipe selected state on <X>?` via `@inquirer/prompts` `confirm` (same dependency `delete.js` already uses). `--yes` / `-y` skips it.
- **Wipe semantics**: `fs.rmSync(path, { recursive: true, force: true })` on each target — handles both directories (bins) and files (intake-registry.jsonl). Worker framework recreates bin directories on demand, so we don't pre-create them. Targets that don't exist on disk are silently skipped (— in the COUNT column).
- **Reporting**: prints the per-target removal count.

### Why `--all` includes the intake-registry

For line-head stations (IG0, HI0, HCN0, HPO0, CD0), the intake-registry.jsonl tracks already-allocated workpiece IDs. Wiping bins without resetting it leaves a footgun: the next sweep skips every file that was just wiped, because the registry still says "already seen." `--all` is the "fresh slate" verb, so it includes the registry by default. `--all-bins` exists for the case where you do want to keep the allocation log (e.g. mid-run cleanup).

For non-line-head stations, the registry doesn't exist — `--all` and `--all-bins` are functionally identical there.

### Naming rationale

`empty-bins` (plural) was chosen over `clear-bin` or `clear-workpieces`:

- "bin" matches the column headers in `fob lines status` (no translation step for the user).
- "empty" reads as "make the bin empty" rather than "destroy the bin itself" (which `clear` ambiguously suggested).
- Plural form reads naturally even when only one bin is targeted (`empty-bins IG0 --output`) and matches the multi-bin reality of `--all`.

## Implementation Phases

### Phase 1: Shared core ✅
- [x] `src/cli/shared/empty-bins.js` — `selectBins`, `shouldWipeIntakeRegistry`, `buildTargets`, `renderPreview`, `wipeTargets`, `confirmWipe`
- [x] Polymorphic targets (`kind: 'bin'` for dirs, `kind: 'file'` for the registry)

### Phase 2: Station handler ✅
- [x] `src/cli/stations/empty-bins.js` — `emptyBinsStationHandler`
- [x] Validates id + selector (bins OR intake-registry)

### Phase 3: Line handler ✅
- [x] `src/cli/lines/empty-bins.js` — `emptyBinsLineHandler`

### Phase 4: Wire-up ✅
- [x] Registered both commands in `src/cli/index.js`
- [x] Updated `demandCommand` messages for both groups
- [x] Added `empty-bins` to shell completion lists
- [x] Shared `withBinSelectorFlags` so the two commands stay in sync

### Phase 5: Smoke test ✅
- [x] Help output, missing-flag error, unknown-station error
- [x] Station preview + cancel
- [x] Line preview + cancel
- [x] "Nothing to remove" branch
- [x] Re-smoked after the `--all-bins` / `--intake-registry` flag-shape change
- [ ] Optional destructive `--yes` test against the live worker-nowapps2 state (skipped — user has real workpieces)

## Related Files

- `src/cli/stations/empty-bins.js` — new (handler)
- `src/cli/lines/empty-bins.js` — new (handler)
- `src/cli/index.js` — register commands + update completions
- `src/utils/line-state.js` — used unchanged (`loadLineState`, `LIVE_BINS`, `defaultStationsRoot`)

## Out of Scope

- No per-workpiece selection — that's what `rm -rf temp/stations/.../<workpiece_id>` is for. If we need it later, `fob workpieces delete <id>` is the natural home.
- No `--dry-run` flag — the preview + confirm prompt already gives a dry-run experience by default; `--yes` is the only escape hatch.
- No undo/trash. The user's mental model is "I want this gone." The framework recreates state on the next worker run.
