# Config Resolution

How configuration is loaded and merged from multiple sources.

## Resolution Chain

```
Built-in defaults
    ↓ deep merge
.fob.json (from cwd)
    ↓ result used for stepsPath / tempDir
Env vars (for orchestrator settings — read directly, not merged)
```

## Built-in Defaults

```javascript
{
  stepsPath: './src/steps/index.js',
  tempDir:   './temp',
}
```

## .fob.json

Optional file in the worker's current working directory. Deep merged over defaults.

Paths (`stepsPath`, `tempDir`) are resolved to absolute paths relative to cwd after merging.

## Orchestrator Settings

Orchestrator URL, org, and credentials are **not** read from `.fob.json`. They come from environment variables only (loaded from `.env` via dotenv):

| Env Var | Purpose |
|---------|---------|
| `ORCHESTRATOR_URL` | API base URL |
| `WORKER_ORG` | Organization ID |
| `WORKER_SECRET` | Worker auth secret |
| `ORCHESTRATOR_API_KEY` | API key |
| `ORCHESTRATOR_API_SECRET` | API secret |

## Inspecting Resolved Config

```bash
fob config show    # Displays resolved values and which env vars are set
```

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Task Construction](/docs/architecture/task-construction.md)
- [Configuration Reference](/docs/usage/configuration.md)
