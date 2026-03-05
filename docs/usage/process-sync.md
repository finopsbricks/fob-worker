# Process Sync

Workflow for pulling process definitions from the orchestrator, editing locally, and pushing back.

## Prerequisites

Orchestrator credentials must be set in `.env`. Check connectivity first with `fob worker status`.

## Typical Workflow

```bash
# 1. See what processes exist
fob processes list

# 2. Pull the process(es) you want to edit
fob processes pull fvVNrEH6kFW1
# or pull everything
fob processes pull --all

# 3. Edit the local JSON file
vim .orchestrator/processes/fvVNrEH6kFW1__verify_statement.json

# 4. Push changes back
fob processes push fvVNrEH6kFW1
# or push all
fob processes push --all
```

## Syncing Step Metadata from Code

After adding or renaming steps in code, sync `name` and `description` into local process files:

```bash
fob processes update-step-metadata
```

This is a one-way sync: code (`defineStep`) → local process JSON files. It does not push to the orchestrator — run `fob processes push` afterward.

## Local File Location

Processes are saved to `.orchestrator/processes/` inside the worker directory. This directory is local only and should be in `.gitignore`.

## Related Notes

- [Command Reference](/docs/usage/commands.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
- [Scenarios](/docs/usage/scenarios.md)
- [Process Files Layout](/docs/architecture/process-files-layout.md)
