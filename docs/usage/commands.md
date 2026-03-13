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
