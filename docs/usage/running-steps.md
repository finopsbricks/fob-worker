# Running Steps Locally

How to debug step handlers using the CLI without the full orchestrator.

## List Available Steps

```bash
fob steps list
```

Shows each step's slug, source folder, and file.

## Run a Step

```bash
fob steps run alex/fetch_account_freshness
```

When no flags are given, an interactive picker appears:

```
Select config for alex/send_email:

 ❯ Process: data_freshness_report (NKB2zLGHbJxN)
   Process: alert_on_anomaly (abc123)
   ─────────────────────────────
   Scenario: happy-path
   Scenario: missing-recipient
   ─────────────────────────────
   No config (empty)

   ↑/↓ to navigate, Enter to select, Esc to cancel
```

Options come from:
1. Process definitions pulled to `.orchestrator/processes/` that contain this step
2. Scenario files in `.orchestrator/scenarios/<step-slug>/`
3. Empty config (always available)

If only one option exists, it is auto-selected.

## Explicit Config Flags

```bash
fob steps run <slug> --process <id>      # Use config from a specific process
fob steps run <slug> --scenario <name>   # Use a scenario file
fob steps run <slug> --empty             # Skip picker, use empty config
```

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

- [Installation](/docs/usage/installation.md)
- [Scenarios](/docs/usage/scenarios.md)
- [Process Sync](/docs/usage/process-sync.md)
- [Task Construction](/docs/architecture/task-construction.md)
