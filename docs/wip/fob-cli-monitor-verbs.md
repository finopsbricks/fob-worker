## Status: COMPLETE

Refactor the monitor commands from `show --state` / `--watch` flags to dedicated verbs (`status`, `watch`). Replace conflated views with one verb per lifecycle. Reserves `monit` for a future interactive TUI so no command claims it accidentally.

Supersedes the operational-flag pieces of [[fob-cli-monitor-commands]]; the underlying `line-state.js` helpers and `workpieces` resource stay.

---

## Problem Statement

The current monitor surface uses flags to switch what the command does:

```bash
fob lines show VM                # definitional: .orchestrator/stations/*.json
fob lines show VM --state        # operational: temp/stations/{station}/{bin}/
fob workpieces show <id>         # snapshot deep view
fob workpieces show <id> --watch # streaming tail (different lifecycle)
```

Three concrete signs the design is wrong:

1. **`--state` changes the data source.** Flags should refine output from the same source. Here it switches sources entirely (`.orchestrator/` → `temp/stations/`). Different question, different answer, same verb.
2. **`--watch` changes the lifecycle.** A snapshot command and a streaming command are not the same command with extra detail. `gh run watch` is its own verb for this reason.
3. **Operational is more commonly asked but takes more typing.** Daily question is "is the line flowing?", not "what's the configured topology?". The harder thing to type should be the rarer one.

## CLI precedent

| CLI | Definitional | Snapshot of live | Live tail | TUI |
|---|---|---|---|---|
| **gh** | `gh workflow view` | `gh run view <id>` | `gh run watch <id>` | — |
| **kubectl** | `kubectl describe` | `kubectl get` | `kubectl get -w` | — |
| **systemd** | `systemctl show` | `systemctl status` | `journalctl -fu` | — |
| **docker** | `docker inspect` (JSON, mixed) | `docker ps`, `docker stats --no-stream` | `docker stats`, `docker logs -f` | — |
| **pm2** | `pm2 show <id>` (mixed) | `pm2 list` | `pm2 logs` | `pm2 monit` |
| **brew** | `brew info` | `brew list`, `brew outdated` | — | — |
| **git** | `git show <ref>` | `git status` | — | — |

`status` is the most universal verb for "snapshot of live state." `watch` is the universal verb for "stream as it changes." `monit` is pm2-specific but uniquely telegraphs "interactive monitoring view."

## Proposed Solution

### Verb-to-view mapping

| Lifecycle | Verb | Reads from |
|---|---|---|
| Configured shape, one-shot | `show` | `.orchestrator/stations/*.json` |
| Operational state, one-shot | `status` | `temp/stations/{station}/{bin}/` |
| Operational state, streaming | `watch` | same, tailed |
| Operational state, interactive TUI | `monit` *(reserved)* | same, rendered in-place |

### Concrete surface

```
# Lines
fob lines list                       # group local stations by line (definitional list)
fob lines show <code>                # config + topology for one line (definitional)
fob lines status                     # snapshot summary across all lines
fob lines status <code>              # snapshot of one line's station × live-bin table

# Stations  (alias path: fob processes ...)
fob stations list                    # remote list (definitional)
fob stations show <code>             # config (definitional)
fob stations status <code>           # snapshot per-bin workpiece-id drilldown

# Workpieces  (inherently operational — no definitional layer)
fob workpieces list [--line] [--bin] [--match]   # snapshot dashboard
fob workpieces show <id>                          # snapshot deep view of one
fob workpieces watch [<id> | --line | --bin | --match]   # streaming tail
```

`watch` accepts the same scope flags as `list`, plus a positional id for the single-workpiece tail. One verb, scope-controlled.

### Removed (hard cut)

- `--state` flag on `fob lines list`, `fob lines show`, `fob stations show`, `fob processes show`
- `--watch` flag on `fob workpieces list`, `fob workpieces show`

Both shipped less than 24 hours ago in `cli/420bc89`. Hard cut is cheap before any external worker repo depends on them.

### Reserved for future

- `fob lines monit` / `fob workpieces monit` / etc. — interactive TUI (pm2-style). Roadmap: "within a few months" (user statement 2026-06-07). Do not claim `monit` for anything in this phase.

### What does NOT change

- `cli/src/utils/line-state.js` helpers — unchanged.
- `cli/src/cli/workpieces/` directory — files reshape but the resource itself stays.
- Output format of the operational views — same tables, same `Open` section, same Cmd-clickable folder links.
- `--json` on every command.

## Implementation Phases

### Phase 1: `status` verb on lines + stations ✅
- [x] Add `fob lines status [code]` handler (`cli/src/cli/lines/status.js`)
- [x] Add `fob stations status <code>` handler — shares the per-station drilldown logic with what's currently inside `processes/show.js` `--state` branch (`cli/src/cli/stations/status.js` or a shared util)
- [x] Wire both into `cli/src/cli/index.js` yargs tree + shell completion
- [x] Remove `--state` flag definitions from yargs for lines/processes/stations show
- [x] Strip the `--state` branch from `lines/list.js`, `lines/show.js`, `processes/show.js`

### Phase 2: `watch` verb on workpieces ✅
- [x] Add `fob workpieces watch <id> | --line | --bin | --match` handler (`cli/src/cli/workpieces/watch.js` exports `watchHandler`)
- [x] Refactor existing `watch.js` into helpers (`watchSingle`, `watchMulti`) called from the new top-level handler
- [x] Wire `fob workpieces watch` into yargs + shell completion
- [x] Remove `--watch` flag from `workpieces list` and `workpieces show`

### Phase 3: Tests ✅
- [x] Add `tests/cli/lines/status.test.js`
- [x] Add `tests/cli/workpieces/watch.test.js` (minimum: single-id snapshot + immediate exit path)
- [x] Remove any tests referencing `--state` or `--watch` flags
- [x] All 36 of the previous phase's tests should still pass (line-state.js untouched)

### Phase 4: Docs ✅
- [x] Rewrite `cli/docs/usage/monitoring.md` around show / status / watch
- [x] Update `cli/docs/usage/commands.md` Lines / Stations / Workpieces sections
- [x] Add `status` and `watch` to the standard-actions table in `cli/docs/cli-design-style.md`; note that `monit` is reserved for the future TUI
- [x] Update `workers/worker-alex/CLAUDE.md` Common Development Commands to point at the new verbs

### Phase 5: This WIP ✅

---

## Open Questions

- **`fob lines watch <code>`**: Should the streaming form exist for lines too? Today the WIP scopes watch to workpieces. A line-level watch would stream bin-count deltas rather than per-workpiece events (a different aggregate view). Defer — `fob workpieces watch --line VM` covers the same surface for now.
- **`fob stations watch <code>`**: same question, same answer (defer).
- **Naming for the TUI**: `monit` (pm2 precedent, less familiar) vs `dash` (more universal, less specific). Decide when the TUI gets designed — not now.

---

## Related Files

**Will create**
- `cli/src/cli/lines/status.js`
- `cli/src/cli/stations/status.js` (or extract shared station-drilldown helper)
- `cli/src/cli/workpieces/watch.js` (refactored — new top-level handler entry point)
- `cli/tests/cli/lines/status.test.js`
- `cli/tests/cli/workpieces/watch.test.js`

**Will modify**
- `cli/src/cli/index.js` — yargs wiring, shell completion
- `cli/src/cli/lines/list.js`, `cli/src/cli/lines/show.js` — drop `--state` branch
- `cli/src/cli/processes/show.js` — drop `--state` branch
- `cli/src/cli/workpieces/list.js`, `cli/src/cli/workpieces/show.js` — drop `--watch` flag handling
- `cli/docs/usage/monitoring.md`, `cli/docs/usage/commands.md`, `cli/docs/cli-design-style.md`
- `workers/worker-alex/CLAUDE.md`

**Reference**
- [[fob-cli-monitor-commands]] — the immediately superseded WIP for the original implementation
- `cli/docs/cli-design-style.md` — the resource/action shape this refactor brings the monitor surface back into alignment with
