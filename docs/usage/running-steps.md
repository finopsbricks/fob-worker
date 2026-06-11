# Running Steps Locally

How to debug step handlers using the CLI without the full orchestrator.

## Interactive Config Picker

When running `fob steps run <slug>` without flags, an interactive picker appears:

```
Select config for alex/send_email:

 ❯ Station: data_freshness_report (NKB2zLGHbJxN)
   Station: alert_on_anomaly (abc123)
   ─────────────────────────────
   Scenario: happy-path
   Scenario: missing-recipient
   ─────────────────────────────
   No config (empty)

   ↑/↓ to navigate, Enter to select, Esc to cancel
```

Options come from:
1. Station definitions pulled to `.orchestrator/stations/` (or legacy `.orchestrator/processes/`) that contain this step
2. Scenario files in `.orchestrator/scenarios/<step-slug>/`
3. Empty config (always available)

If only one option exists, it is auto-selected.

## Step Output

Output is printed to console and saved:

```
temp/alex__fetch_account_freshness.json
```

## Chaining Steps

Run steps in sequence. Each step's output is automatically available to the next as `step_outputs`:

```bash
fob steps run alex/fetch_account_freshness    # saves to temp/
fob steps run alex/generate_freshness_email   # reads temp/alex__fetch_account_freshness.json
fob steps run alex/send_email                 # reads both previous outputs
```

## What the CLI Injects

Each local run constructs a synthetic task matching the orchestrator's structure:

- `work_record.step_outputs` — loaded from all `temp/*.json` files
- `work_record.id` — synthetic `local-wr-<timestamp>`
- `work_record.item_snapshot` — always `null` (steps requiring live data will fail)
- `org_id` — from `WORKER_ORG` env var or `'local'`

## Related Notes

- [Command Reference](/docs/usage/commands.md)
- [Scenarios](/docs/usage/scenarios.md)
- [Station Sync](/docs/usage/station-sync.md)
- [Task Construction](/docs/architecture/task-construction.md)
