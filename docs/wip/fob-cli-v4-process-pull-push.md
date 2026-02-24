# FOB CLI v4: Process Pull/Push & Step Testing

**Status:** COMPLETE
**Created:** 2026-02-24

## Summary

Local process editing workflow with pull/push, scenario support, and interactive config picker for step testing.

---

## Commands

### Process Management

```bash
fob processes list                    # List processes from orchestrator
fob processes show <id>               # Show process definition
fob processes pull <id>               # Pull specific process
fob processes pull --all              # Pull all processes
fob processes push <id>               # Push specific process
fob processes push --all              # Push all local processes
fob processes update-step-metadata    # Update step name/description from code
```

### Step Testing

```bash
fob steps run <slug>                  # Interactive picker (if multiple configs available)
fob steps run <slug> --process <id>   # Use config from specific process
fob steps run <slug> --scenario <name> # Use config from scenario file
fob steps run <slug> --empty          # Use empty config (skip picker)
```

---

## Directory Structure

```
.orchestrator/                        # In .gitignore
├── processes/
│   ├── 0flNNmVLV5Dg__update_rules.json
│   ├── fvVNrEH6kFW1__verify_statement.json
│   └── NKB2zLGHbJxN__data_freshness_report.json
└── scenarios/
    └── alex__send_email/
        ├── happy-path.json
        └── missing-recipient.json
```

**Process naming:** `<id>__<name_in_snake_case>.json`
**Scenario naming:** `<slug_with_double_underscore>/<scenario_name>.json`

---

## Interactive Config Picker

When running `fob steps run <slug>` without explicit flags, the CLI shows an interactive picker:

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

**Options shown:**
1. Processes that contain this step (from `.orchestrator/processes/`)
2. Scenarios for this step (from `.orchestrator/scenarios/<slug>/`)
3. Empty config (always available)

**If only one option:** Auto-selects it without showing picker.

---

## Workflow Examples

### Edit a process locally

```bash
fob processes pull fvVNrEH6kFW1
vim .orchestrator/processes/fvVNrEH6kFW1__verify_statement.json
fob processes push fvVNrEH6kFW1
```

### Create a test scenario

```bash
mkdir -p .orchestrator/scenarios/alex__send_email
echo '{"to": "test@example.com", "subject": "Test"}' > .orchestrator/scenarios/alex__send_email/happy-path.json
fob steps run alex/send_email --scenario happy-path
```

### Test with process config

```bash
fob steps run alex/send_email --process NKB2zLGHbJxN
```

### Sync step metadata from code

```bash
fob processes update-step-metadata
```

---

## Files Added/Modified

| File | Changes |
|------|---------|
| `cli/src/utils/process-files.js` | Added scenario functions, `findProcessesWithStep()` |
| `cli/src/utils/orchestrator.js` | Added `updateProcess()` |
| `cli/src/cli.js` | Added pull/push/update-step-metadata, interactive picker, `--scenario`/`--empty` flags |

---

## Config Priority

When using explicit flags:
1. `--empty` - Empty config `{}`
2. `--process <id>` - Extract from process definition
3. `--scenario <name>` - Load from scenario file

When no flags (interactive):
- Shows picker with all available options
- User selects which config to use
