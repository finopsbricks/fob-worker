# Monitoring an Assembly Line

How to use the `fob` CLI to answer "is my line flowing?" and "where is this workpiece?" from on-disk bin state.

All monitoring commands read `temp/stations/` in the current worker repo — `cd` into your worker first. Nothing hits the orchestrator API; this is pure filesystem inspection.

## Mental model

| Bin | Meaning |
|---|---|
| `input` | Waiting at this station |
| `doing` | Being mutated right now (transient) |
| `output` | Produced; not yet drained by the downstream conveyor — or terminal "finished" |
| `failed` | Stuck; needs operator attention |
| `done` | Pristine archive of a successfully forwarded input — **not** a current position |

A workpiece's *live position* is the most-advanced live bin (`output > doing > input > failed`, terminal → source). The `done` bin is a receipt, not a position — every monitor view treats it that way.

## Line-level: "is the line flowing?"

```bash
fob lines list --state              # one row per line: in-flight / stuck / finished + health
fob lines show VM --state           # station × live-bin table for one line
fob stations show VM3 --state       # single-station drilldown with workpiece ids per bin
```

In `lines list --state`:

- **In-flight** = `input + doing + output` across non-terminal stations
- **Stuck** = total of `failed` across the line
- **Finished** = terminal-station `output` count
- **Health** = a one-line callout (`flowing, biggest at X` / `⚠ N at X/failed` / `idle` / `N finished, drained`)

In `lines show <code> --state` the `(done)` column is shown in parens and excluded from the live totals so the math reconciles (e.g. `8 finished + 7 stuck = 15` matches the workpiece count, ignoring archive receipts).

## Workpiece-level: "where is this one, and what happened to it?"

```bash
fob workpieces show '20260605 192535'      # exact id → deep view
fob workpieces show 192535                  # substring resolving to 1 → deep view
fob workpieces show 2026060                 # substring matching N → dashboard
fob workpieces list --bin VM3/failed        # everything stuck at VM3/failed
fob workpieces list --line VM               # every workpiece on the VM line
fob workpieces list --match 2026060         # substring filter across all lines
fob workpieces list --line VM --bin VM3/failed   # flags layer
```

The deep view renders:

- The current position with a status hint (`stuck` / `finished` / `active` / `anomaly`)
- The journey — every event from `log.jsonl` with computed durations on each `station_complete` / `station_failed`
- A Cmd-clickable `file://` folder link to the workpiece directory

The dashboard view renders one row per workpiece (id, position, last log event) and a separate `Open` section with one folder link per row — clicking opens that workpiece's directory in Finder so you can inspect `error.txt`, the accumulated `*.md` artifacts, etc., without leaving the terminal.

## Watching it move

Append-style: initial render, then new events and bin transitions print as they happen. Friendly to scrollback and `>` redirection.

```bash
fob workpieces show '20260605 192535' --watch                    # tail one workpiece
fob workpieces list --bin VM3/failed --watch                     # tail every stuck item
fob workpieces list --line VM --watch --interval 5               # 5s poll instead of 2s
```

In dashboard watch each notice is tagged with the workpiece id, so you can attribute events when many move at once:

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
| Is my line healthy right now? | `fob lines list --state` |
| Where in the VM line is work piling up? | `fob lines show VM --state` |
| What failed? | `fob workpieces list --bin VM3/failed` |
| What happened to this specific item? | `fob workpieces show <id>` |
| I just retried N stuck items — track them through | `fob workpieces list --bin VM3/input --watch` |

## Machine-readable output

Every command accepts `--json` for piping into other tools, scripts, or AI sessions:

```bash
fob lines list --state --json | jq '.[] | select(.state.stuck > 0)'
fob workpieces list --bin VM3/failed --json
fob workpieces show <id> --json
```

## Related

- [Command Reference](commands.md) — every command and flag
- [Assembly Line Processing](../../../handbooks/fde-handbook/patterns/structural/assembly-line-processing.md) — the 5-bin contract these commands operate on
- [File System as State Machine](../../../handbooks/fde-handbook/patterns/conceptual/file-system-as-state-machine.md) — why bins are the source of truth
