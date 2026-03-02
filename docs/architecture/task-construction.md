# Task Construction

How the CLI builds a local Task object that matches the orchestrator's Task structure.

## Why It Matters

Step handlers receive a `task` argument from the orchestrator in production. To run locally without an orchestrator, the CLI must construct a compatible Task so the handler code runs unchanged.

## Task Structure

```javascript
{
  step_queue_id: `local-${Date.now()}`,   // synthetic
  step: {
    slug: slug,                            // from command arg
    config: stepConfig,                    // resolved from process/scenario/empty
  },
  work_record: {
    id: `local-wr-${Date.now()}`,          // synthetic
    item_snapshot: null,                   // always null locally
    step_outputs: step_outputs,            // loaded from temp/*.json
  },
  org_id: process.env.WORKER_ORG || 'local',
}
```

## item_snapshot is null

`item_snapshot` holds the source entity snapshot (e.g., a bank statement) in production. Locally it is always `null`. Steps that require it will fail — this is expected for steps with live dependencies.

## step_outputs from temp/

All `*.json` files in `temp/` (excluding `*.config.json`) are loaded and keyed by slug:

```
temp/alex__fetch_data.json  →  step_outputs['alex/fetch_data']
temp/alex__check_balances.json  →  step_outputs['alex/check_balances']
```

Running steps in sequence chains their outputs naturally — each step's output is available to the next.

## stepConfig Sources

| Flag | Config Source |
|------|--------------|
| `--empty` | `{}` |
| `--process <id>` | Extracted from process definition, then template-resolved |
| `--scenario <name>` | Loaded from scenario file, then template-resolved |
| (none) | Interactive picker → then resolved like above |

## Related Notes

- [Steps Loading](/docs/architecture/steps-loading.md)
- [Template Resolution](/docs/architecture/template-resolution.md)
- [Process Files Layout](/docs/architecture/process-files-layout.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
