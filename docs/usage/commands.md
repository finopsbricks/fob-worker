# Command Reference

All available CLI commands grouped by resource.

## Steps

```bash
fob steps list                              # List available steps
fob steps run <slug>                        # Run with interactive config picker
fob steps run <slug> --station <id>         # Use config from a station
fob steps run <slug> --scenario <name>      # Use config from a scenario file
fob steps run <slug> --empty                # Run with empty config
```

## Stations

```bash
fob stations list                           # List stations from orchestrator
fob stations list --tag <name>              # Filter by tag
fob stations list --line <slug>              # Filter by line (e.g. VM, BR)
fob stations show <id>                      # Show station definition
fob stations status <short_code>            # Snapshot: per-bin workpiece-id drilldown for one station
fob stations edit <id> --add-tag <name>     # Add tag to station
fob stations edit <id> --remove-tag <name>  # Remove tag from station
fob stations edit <id> --short-code <code>  # Set the station short_code (e.g. P1, VM3)
fob stations pull <id>                      # Pull single station to local
fob stations pull --all                     # Pull all stations
fob stations push <id>                      # Update existing station on orchestrator
fob stations push <filename>                # Create new station (e.g. my_station.json)
fob stations push --all                     # Push all — updates existing, creates new
fob stations push <id> --force              # Create with the given id (cross-env promotion)
fob stations update-step-metadata           # Sync step names from code to station files
fob stations delete <id>                    # Interactive delete: preview, archive/cascade choice
fob stations delete <id> --archive          # Archive without prompt (preserves history)
fob stations delete <id> --force-delete     # Skip the action prompt; cascade if work records exist
fob stations delete <id> --force-delete -y  # Also skip the type-the-short-code guard
```

### Delete vs. Archive

`fob stations delete <id>` walks you through the destructive workflow safely:

1. **Preview** — prints the station's identity, line, location, schedule, work-record count + last-run + recent 3, and whether a local `src/steps/` folder matches (signals what will be orphaned in code).
2. **Confirmation:**
   - With **0 work records** → single `y/N` confirm → DELETE.
   - With **>0 work records** → choose **Archive** (preserve history, hide from default list, block execution), **Cascade delete** (destroy the station AND every linked work record + step queue row + supporting document — irreversible), or **Cancel**.
3. **Guard** — cascade requires typing the station's `short_code` before the API call goes out. Skipped with `--yes`.

Archive is the safer retirement path. Cascade is reserved for stub cleanup or genuine data deletion.

**File naming:** Existing stations are stored as `id__name.json` (e.g., `fvVNrEH6kFW1__verify_statement.json`). New stations use just `name.json` — after pushing, the file is renamed to include the server-assigned ID. Files live in `.orchestrator/stations/`.

## Lines

`fob lines` derives lines from locally-saved stations grouped by their `line` field, and reads `temp/stations/` for live state.

```bash
fob lines list                              # Definitional: group local stations by line
fob lines show <line>                       # Definitional: dependency order + conveyor topology
fob lines status                            # Snapshot: per-line summary across all lines
fob lines status <line>                     # Snapshot: station × live-bin table for one line
```

`status` reads `temp/stations/{STATION}/{BIN}/` directly. The `done` bin is shown in parens and excluded from live totals — it's an archive receipt, not a current position.

## Workpieces

`fob workpieces` answers operational questions about items flowing through bins. Workpieces are runtime filesystem entities — there's no orchestrator-side resource for them.

```bash
fob workpieces list                              # Snapshot: every workpiece on disk
fob workpieces list --line VM                    # Scope to one line
fob workpieces list --bin VM3/failed             # Scope to one bin (STATION/BIN)
fob workpieces list --match <substring>          # Filter by workpiece-id substring
fob workpieces show <id-or-substring>            # Snapshot deep view: position + journey + folder link
fob workpieces watch <id>                        # Live tail: one workpiece
fob workpieces watch --bin VM3/failed            # Live tail: every workpiece in a bin
fob workpieces watch --line VM                   # Live tail: every workpiece on a line
fob workpieces watch --match <substring>         # Live tail: substring scope
fob workpieces watch ... --interval 5            # Override the 2s default poll interval
```

`show` with a substring resolving to >1 id auto-promotes to the dashboard view. Pass `--json` on any of these for machine-readable output. See [Monitoring](monitoring.md) for the mental model and common workflows.

## Items

```bash
fob items list                              # List items from orchestrator
fob items show <id>                         # Show item details
fob items show <id> --stations              # Include configured stations
fob items show <id> --work-records          # Include execution history
fob items edit <id> --add-tag <name>        # Add tag to item
fob items edit <id> --remove-tag <name>     # Remove tag from item
```

## Work Records

```bash
fob work-records list                       # List recent work records
fob work-records list --limit 10            # Limit results
fob work-records list --status running      # Filter by status
fob work-records list --station <id>        # Filter by station
fob work-records list --tag <name>          # Filter by tag
fob work-records show <id>                  # Show work record details
fob work-records edit <id> --add-tag <name> # Add tag to work record
fob work-records edit <id> --remove-tag <name> # Remove tag from work record
fob work-records cancel <id>                # Cancel a running/pending work record
```

## Tags

```bash
fob tags list                               # List all tags in org
fob tags create <name>                      # Create a tag
fob tags create <name> --color '#ef4444'    # Create with color
fob tags create <name> --description '...'  # Create with description
fob tags edit <id> --name '...'             # Rename a tag
fob tags edit <id> --color '#hex'           # Change tag color
fob tags edit <id> --description '...'      # Change tag description
fob tags delete <id>                        # Delete a tag
```

## Orchestrator

```bash
fob orchestrator status                     # Check connection to orchestrator
```

## Workers

Manage locally-running fob worker processes on this machine (as opposed to `orchestrator`, which is about the remote API).

```bash
fob workers list                            # Snapshot of all locally-running fob workers (direct or pm2-managed)
fob workers list --json                     # Same, as raw JSON
fob workers start                           # Start the worker in the current directory under pm2
fob workers start <path>                    # Start a worker repo at a given path under pm2
fob workers stop                            # Stop the current directory's pm2-managed worker
fob workers stop <name>                     # Stop a pm2-managed worker by pm2 name or directory name
fob workers restart [name]                  # Restart a pm2-managed worker (same target resolution as stop)
fob workers logs [name]                     # Live-tail a pm2-managed worker's logs
fob workers monit                           # Interactive pm2 process monitor (CPU/RAM)
```

`start` always registers the worker under pm2 — a worker running directly (`node src/index.js`, no pm2) is one started by hand outside this tooling, and `stop`/`restart`/`logs` intentionally refuse to touch it; use `fob workers list` to find its pid and `kill` it manually.

## Config

```bash
fob config show                             # Show resolved paths and environment variables
```

## Related Notes

- [Running Steps Locally](/docs/usage/running-steps.md) — step debugging workflow
- [Station Sync](/docs/usage/station-sync.md) — pull/edit/push workflow
- [Scenarios](/docs/usage/scenarios.md) — reusable test configs
- [Configuration Reference](/docs/usage/configuration.md) — paths and env vars
