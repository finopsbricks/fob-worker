# Process Files Layout

How process definitions and test scenarios are stored in the worker directory.

## Directory Structure

```
.orchestrator/
├── processes/
│   ├── fvVNrEH6kFW1__verify_statement.json
│   ├── NKB2zLGHbJxN__data_freshness_report.json
│   └── 0flNNmVLV5Dg__update_rules.json
└── scenarios/
    └── alex__send_email/
        ├── happy-path.json
        └── missing-recipient.json
```

## .gitignore

`.orchestrator/` contains worker-specific local state (pulled from the orchestrator for a specific org). It should be in `.gitignore` and is not committed to the worker repo.

## Process File Naming

```
<id>__<name_in_snake_case>.json
```

The double underscore separates the opaque process ID from the human-readable name. `listLocalProcesses()` extracts the ID from the filename prefix to locate files when only an ID is known.

## Scenario Directory Naming

```
.orchestrator/scenarios/<org>__<step_name>/
```

The step slug's `/` separator is replaced with `__` — matching the same convention used for step output files in `temp/`. A scenario directory contains one JSON file per scenario name.

## Process File Content

Full process definition JSON as returned by the orchestrator API, including `id`, `name`, `steps[]`, `created_at`, and `org`. When pushing, `id`, `created_at`, and `org` are stripped from the payload.

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Task Construction](/docs/architecture/task-construction.md)
- [Template Resolution](/docs/architecture/template-resolution.md)
- [Process Sync](/docs/usage/process-sync.md)
- [Scenarios](/docs/usage/scenarios.md)
