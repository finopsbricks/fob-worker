# Station Sync

Workflow for pulling station definitions from the orchestrator, editing locally, pushing back, and retiring them.

> The canonical orchestrator API surface is `/api/v1/stations/*`. The `/api/v1/processes/*` paths remain functional as deprecation aliases.

## Prerequisites

Orchestrator credentials must be set in `.env`. Check connectivity first with `fob orchestrator status`.

## Typical Workflow

```bash
# 1. See what stations exist
fob stations list

# 2. Pull the station(s) you want to edit
fob stations pull fvVNrEH6kFW1
# or pull everything
fob stations pull --all

# 3. Edit the local JSON file
vim .orchestrator/stations/fvVNrEH6kFW1__verify_statement.json

# 4. Push changes back
fob stations push fvVNrEH6kFW1
# or push all
fob stations push --all
```

## Retiring a Station

When a station is no longer needed, `fob stations delete` walks through the destructive workflow:

```bash
fob stations delete <id-or-short-code>
```

The interactive flow:

1. Prints a preview: identity, line, location, work-record count (with the last 3), schedule + next run, and whether a local `src/steps/` folder is matched.
2. If the station has **no work records**, prompts a single `y/N` confirm and DELETEs.
3. If the station has **work records**, offers three choices:
   - **Archive (preserve history)** — `POST /api/v1/stations/:id/archive`. Hides the station from the default `list`, blocks execution (scheduler + `/run`), keeps every work record, step queue row, and supporting document queryable.
   - **Cascade delete (destructive)** — `DELETE /api/v1/stations/:id?cascade=true`. Permanently destroys the station AND every linked work record + step queue row + supporting document. Asks you to type the `short_code` before sending the request.
   - **Cancel** — exit without changes.

Non-interactive flags for scripts:

```bash
fob stations delete <id> --archive          # Archive directly
fob stations delete <id> --force-delete     # Cascade-delete (still prompts for short_code)
fob stations delete <id> --force-delete -y  # Skip the short_code guard too
```

Archive is reversible — see the orchestrator's [unarchive endpoint](https://orchestrator.finopsbricks.com/docs/api/endpoints/processes/unarchive). Note that unarchiving does **not** automatically re-enable a previously-active schedule; you opt in explicitly with `fob stations edit` or `PUT`.

## Syncing Step Metadata from Code

After adding or renaming steps in code, sync `name` and `description` into local station files:

```bash
fob stations update-step-metadata
```

This is a one-way sync: code (`defineStep`) → local station JSON files. It does not push to the orchestrator — run `fob stations push` afterward.

## Creating a New Station

To create a station that doesn't exist on the orchestrator yet:

1. Create a JSON file in `.orchestrator/stations/` using just the name (no ID prefix):

```bash
# File: .orchestrator/stations/discover_pending_msas.json
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
fob stations push discover_pending_msas.json
# or: fob stations push --all
```

3. The CLI sends a POST request, receives the server-assigned ID, and renames the file:

```
discover_pending_msas.json → q6NG3lvHzrIZ__discover_pending_msas.json
```

After this, the file behaves like any pulled station — future pushes will update (PUT) instead of create.

## Schedule Configuration

Stations can run automatically on a cron schedule. Add schedule fields to the station JSON:

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

> **Tip:** Start with `schedule_enabled: false` and push. Verify the station works manually first, then enable the schedule.

## Local File Location

Stations are saved to `.orchestrator/stations/` inside the worker directory. This directory is local only and should be in `.gitignore`.

## Related Notes

- [Command Reference](/docs/usage/commands.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
- [Scenarios](/docs/usage/scenarios.md)
- [Station Files Layout](/docs/architecture/station-files-layout.md)
