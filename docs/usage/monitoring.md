# Monitoring an Assembly Line

How to use the `fob` CLI to answer "is my line flowing?" and "where is this workpiece?" — both for one-shot snapshots and live tailing.

All monitoring commands read `temp/stations/` in the current worker repo. `cd` into your worker first. None of these hit the orchestrator API; it's pure filesystem inspection.

## Verb shape

The monitor surface separates three lifecycles, each its own verb:

| Verb | What it does | Lifecycle | Data source |
|---|---|---|---|
| `show` | Definitional view: what is this thing configured to do? | one-shot | `.orchestrator/stations/*.json` |
| `status` | Snapshot of live state: what is it doing *right now*? | one-shot | `temp/stations/{station}/{bin}/` |
| `watch` | Live tail: tell me as things change | streaming | same as status, polled |

`monit` is **reserved** for a future interactive TUI (pm2-style); not implemented yet.

## Mental model — the bins

| Bin | Meaning |
|---|---|
| `input` | Waiting at this station |
| `doing` | Being mutated right now (transient) |
| `output` | Produced; not yet drained by the downstream conveyor — or terminal "finished" |
| `failed` | Stuck; needs operator attention |
| `done` | Pristine archive of a successfully forwarded input — **not** a current position |

A workpiece's *live position* is the most-advanced live bin (`output > doing > input > failed`, terminal → source). The `done` bin is a receipt, not a position — every monitor view treats it that way.

## Line-level

```bash
fob lines list                          # definitional list of all lines + their member stations
fob lines show VM                       # definitional: stations in dependency order + conveyor topology
fob lines status                        # snapshot: per-line summary (in-flight / stuck / finished + health)
fob lines status VM                     # snapshot: station × live-bin table for one line
```

`fob lines status` (no arg) is the daily "is everything OK?" view:

```
LINE  IN-FLIGHT  STUCK  FINISHED  HEALTH
----------------------------------------------------
VM    0          2      13        ⚠ 2 at VM3/failed
```

`fob lines status VM` drills in with `done` shown in parens so the math reconciles (`live` total excludes `done`).

## Station-level

```bash
fob stations show VM3                   # definitional: config from .orchestrator/
fob stations status VM3                 # snapshot: per-bin workpiece-id drilldown
```

`fob stations status VM3` reads disk only; no orchestrator round-trip.

## Workpiece-level

Workpieces are inherently operational (they exist only as runtime filesystem entities — no definitional layer), so they don't have a `show`-vs-`status` split. Two verbs cover everything:

```bash
fob workpieces list                                # dashboard of every workpiece on disk
fob workpieces list --line VM                      # scope to one line
fob workpieces list --bin VM3/failed               # scope to one bin (STATION/BIN)
fob workpieces list --match 2026060                # substring filter
fob workpieces list --line VM --bin VM3/failed     # flags layer

fob workpieces show 20260605                       # exact or substring → 1 match → deep view
fob workpieces show 2026060                        # substring → many matches → dashboard
```

The deep view shows position + journey from `log.jsonl` (with computed durations) + a Cmd-clickable `file://` folder link.

## Live tail

```bash
fob workpieces watch 20260605                       # tail one workpiece
fob workpieces watch --bin VM3/failed               # tail every workpiece in a bin
fob workpieces watch --line VM                      # tail every workpiece on a line
fob workpieces watch --match 2026060                # tail by substring
fob workpieces watch --bin VM3/input --interval 5   # 5s poll instead of the 2s default
```

Append-style: initial snapshot, then new events and bin transitions as they happen — friendly to scrollback and `>` redirection. In the multi-workpiece form each notice is tagged with the workpiece id:

```
14:23:01  20260605 192535  → moved from VM3/failed to VM3/input
14:23:15  20260605 192535  VM3  station_started
14:23:42  20260605 192535  VM3  station_complete (27s)
14:23:42  20260605 192535  → moved to VM4/input
```

Workpieces that reach the terminal station's `output` bin emit a one-time `✓ finished` notice and drop out of polling for the rest of the session. Ctrl-C exits cleanly.

## Common workflows

| Question | Command |
|---|---|
| Is my line healthy right now? | `fob lines status` |
| Where in the VM line is work piling up? | `fob lines status VM` |
| What's at this station? | `fob stations status VM3` |
| What failed? | `fob workpieces list --bin VM3/failed` |
| What happened to this specific item? | `fob workpieces show <id>` |
| I just retried N stuck items — track them through | `fob workpieces watch --bin VM3/input` |
| What's the VM line *configured* to do? | `fob lines show VM` |
| What's *this station* configured to do? | `fob stations show VM3` |

## Discoverability

Every verb advertises itself in `fob <resource> --help`:

```
$ fob lines
Specify an action: list, show, status

Commands:
  fob lines list           List lines grouped from local station files (definitional)
  fob lines show [line]    Show line config: stations in dependency order + conveyor topology (definitional)
  fob lines status [line]  Snapshot of live bin state (reads temp/stations/). No arg = per-line summary.
```

You shouldn't have to remember verb names — typing `fob lines` (or any resource) lists them.

## Machine-readable output

Every command accepts `--json` for piping into other tools, scripts, or AI sessions:

```bash
fob lines status --json | jq 'to_entries[] | select(.value.stuck > 0)'
fob workpieces list --bin VM3/failed --json
fob workpieces show <id> --json
```

## Related

- [Command Reference](commands.md) — every command and flag
- [Assembly Line Processing](../../../handbooks/fde-handbook/patterns/structural/assembly-line-processing.md) — the 5-bin contract these commands operate on
- [File System as State Machine](../../../handbooks/fde-handbook/patterns/conceptual/file-system-as-state-machine.md) — why bins are the source of truth
