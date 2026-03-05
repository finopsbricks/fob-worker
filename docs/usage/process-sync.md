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

## Creating a New Process

To create a process that doesn't exist on the orchestrator yet:

1. Create a JSON file in `.orchestrator/processes/` using just the name (no ID prefix):

```bash
# File: .orchestrator/processes/discover_pending_msas.json
```

```json
{
  "name": "nowapps/discover_pending_msas",
  "description": "Batch scan for unprocessed MSA PDFs",
  "applies_to": [],
  "steps": [
    { "order": 0, "slug": "nowapps/find_unprocessed_msas", "name": "Find Unprocessed MSAs" },
    { "order": 1, "slug": "nowapps/dispatch_msa_processing", "name": "Dispatch MSA Processing" }
  ]
}
```

2. Push it:

```bash
fob processes push discover_pending_msas.json
# or: fob processes push --all
```

3. The CLI sends a POST request, receives the server-assigned ID, and renames the file:

```
discover_pending_msas.json → q6NG3lvHzrIZ__discover_pending_msas.json
```

After this, the file behaves like any pulled process — future pushes will update (PUT) instead of create.

## Schedule Configuration

Processes can run automatically on a cron schedule. Add schedule fields to the process JSON:

```json
{
  "name": "Daily Freshness Report",
  "applies_to": [],
  "schedule_cron": "0 8 * * *",
  "schedule_timezone": "Asia/Kolkata",
  "schedule_enabled": false,
  "steps": [...]
}
```

| Field | Description |
|-------|-------------|
| `schedule_cron` | 5-field cron expression (`min hour day month weekday`) |
| `schedule_timezone` | IANA timezone (default: `"UTC"`) |
| `schedule_enabled` | Set `true` to activate, `false` to pause |

> **Tip:** Start with `schedule_enabled: false` and push. Verify the process works manually first, then enable the schedule.

## Local File Location

Processes are saved to `.orchestrator/processes/` inside the worker directory. This directory is local only and should be in `.gitignore`.

## Related Notes

- [Command Reference](/docs/usage/commands.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
- [Scenarios](/docs/usage/scenarios.md)
- [Process Files Layout](/docs/architecture/process-files-layout.md)
