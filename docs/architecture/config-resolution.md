# Config Resolution

How the CLI resolves its runtime configuration.

## Convention-Based Paths

The CLI uses fixed conventions for the two paths it needs. No config file — all worker repos follow the same structure:

| Path | Convention |
|------|-----------|
| `stepsPath` | `./src/steps/index.js` (resolved to absolute path from cwd) |
| `tempDir` | `./temp` (resolved to absolute path from cwd) |

`loadConfig()` in `src/utils/config.js` is a one-liner — it just resolves these paths relative to `process.cwd()`.

## Orchestrator Settings

Read directly from environment variables (loaded from `.env` via dotenv at startup):

| Env Var | Purpose |
|---------|---------|
| `ORCHESTRATOR_URL` | API base URL |
| `ORCHESTRATOR_API_KEY` | Org API key |
| `ORCHESTRATOR_API_SECRET` | Org API secret |
| `STEP_PREFIX` | Step slug prefix for this org |

These are the same variables required by the production worker process. The `.env` in the worker repo is the single source for both.

## Inspecting Resolved Config

```bash
fob config show    # Displays resolved paths and which env vars are set
```

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Auth Design](/docs/architecture/auth.md)
- [Configuration Reference](/docs/usage/configuration.md)
