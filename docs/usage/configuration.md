# Configuration Reference

How the CLI is configured — convention-based paths and environment variables.

## Paths (Convention-Based)

The CLI always uses these paths relative to the current working directory. They are not configurable:

| Path | Value |
|------|-------|
| Steps registry | `./src/steps/index.js` |
| Temp directory | `./temp` |

All worker repos follow this structure. Run `fob config show` to see the resolved absolute paths.

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

Displays resolved paths and which environment variables are set (secrets shown as `***`).

## Related Notes

- [Installation](/docs/usage/installation.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Auth Design](/docs/architecture/auth.md)
