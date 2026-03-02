# Configuration Reference

All configuration options for the CLI.

## .fob.json

Optional file in the worker directory. Create interactively with `fob config init`.

| Key | Default | Description |
|-----|---------|-------------|
| `stepsPath` | `./src/steps/index.js` | Path to the worker's steps registry |
| `tempDir` | `./temp` | Directory for step output files |

Example:
```json
{
  "stepsPath": "./src/steps/index.js",
  "tempDir": "./temp"
}
```

Paths are resolved relative to the current working directory.

## Environment Variables

Set in `.env` in the worker directory (loaded automatically by dotenv).

| Variable | Required For | Description |
|----------|-------------|-------------|
| `ORCHESTRATOR_URL` | `processes`, `work-records`, `worker status` | Orchestrator API base URL |
| `ORCHESTRATOR_API_KEY` | `processes`, `work-records`, `worker status` | Org API key |
| `ORCHESTRATOR_API_SECRET` | `processes`, `work-records`, `worker status` | Org API secret |
| `STEP_PREFIX` | `steps run` (org_id fallback) | Step slug prefix for this org (e.g. `alex`) |

These are the same variables required by the production worker process. No separate CLI credentials are needed.

Variables are also accessible inside step templates as `{{env.VAR_NAME}}`.

## Inspect Resolved Config

```bash
fob config show
```

Displays the merged config values and which environment variables are set (secrets shown as `***`).

## Related Notes

- [Installation](/docs/usage/installation.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Template Resolution](/docs/architecture/template-resolution.md)
