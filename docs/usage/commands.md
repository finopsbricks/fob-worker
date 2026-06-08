# Command Reference

All available CLI commands grouped by resource.

## Steps

```bash
fob steps list                              # List available steps
fob steps run <slug>                        # Run with interactive config picker
fob steps run <slug> --process <id>         # Use config from a process
fob steps run <slug> --scenario <name>      # Use config from a scenario file
fob steps run <slug> --empty                # Run with empty config
```

## Processes

```bash
fob processes list                          # List processes from orchestrator
fob processes list --tag <name>             # Filter by tag
fob processes show <id>                     # Show process definition
fob processes edit <id> --add-tag <name>    # Add tag to process
fob processes edit <id> --remove-tag <name> # Remove tag from process
fob processes pull <id>                     # Pull single process to local
fob processes pull --all                    # Pull all processes
fob processes push <id>                     # Update existing process on orchestrator
fob processes push <filename>              # Create new process (e.g. my_process.json)
fob processes push --all                    # Push all — updates existing, creates new
fob processes update-step-metadata          # Sync step names from code to process files
```

**File naming:** Existing processes are stored as `id__name.json` (e.g., `fvVNrEH6kFW1__verify_statement.json`). New processes use just `name.json` — after pushing, the file is renamed to include the server-assigned ID.

## Stations

`fob stations` is a vocabulary alias for `fob processes` — same handlers, same flags — plus an operational `status` verb for the live bin drilldown.

```bash
fob stations list                           # List stations from orchestrator
fob stations show <id>                      # Definitional: show station config
fob stations status <short_code>            # Snapshot: per-bin workpiece-id drilldown
```

All other actions mirror `fob processes` (run, pull, push, edit, update-step-metadata). `status` is also available as `fob processes status <id>`.

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
fob items edit <id> --add-tag <name>        # Add tag to item
fob items edit <id> --remove-tag <name>     # Remove tag from item
```

## Work Records

```bash
fob work-records list                       # List recent work records
fob work-records list --limit 10            # Limit results
fob work-records list --status running      # Filter by status
fob work-records list --process <id>        # Filter by process
fob work-records list --tag <name>          # Filter by tag
fob work-records show <id>                  # Show work record details
fob work-records edit <id> --add-tag <name> # Add tag to work record
fob work-records edit <id> --remove-tag <name> # Remove tag from work record
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

## Worker

```bash
fob worker status                           # Check connection to orchestrator
```

## Config

```bash
fob config show                             # Show resolved paths and environment variables
```

## Related Notes

- [Running Steps Locally](/docs/usage/running-steps.md) — step debugging workflow
- [Process Sync](/docs/usage/process-sync.md) — pull/edit/push workflow
- [Scenarios](/docs/usage/scenarios.md) — reusable test configs
- [Configuration Reference](/docs/usage/configuration.md) — paths and env vars
