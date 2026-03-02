# Auth Design

How the `fob` CLI and the worker process authenticate with the orchestrator.

## One Credential, Two Consumers

Both the production worker process and the `fob` CLI authenticate using the same org-level API key:

| Consumer | Auth Headers |
|----------|-------------|
| Production worker (polling loop) | `api-key`, `api-secret` |
| `fob` CLI (developer tool) | `api-key`, `api-secret` |

There is no separate credential for the CLI. The worker's `.env` is the single source of credentials for both.

## Required Environment Variables

The CLI reads from the worker repo's `.env` (loaded via dotenv). All orchestrator-facing commands require:

| Variable | Purpose |
|----------|---------|
| `ORCHESTRATOR_URL` | Orchestrator API base URL |
| `ORCHESTRATOR_API_KEY` | Org API key |
| `ORCHESTRATOR_API_SECRET` | Org API secret |
| `STEP_PREFIX` | Step slug prefix for this org (e.g. `alex`) |

These are the same variables the production worker process requires. If the worker is configured correctly, the CLI works without any additional setup.

## STEP_PREFIX vs Org Identity

`STEP_PREFIX` (e.g. `alex`) is the step slug prefix used for queue routing — it filters which steps this worker claims. It is sent as `X-Step-Prefix` in requests.

Org identity is derived server-side from the API key record in the database (`Api_keys.org`). The client does not assert its own org — the server determines it from the key.

## What Was Removed

`WORKER_SECRET` was a shared bearer token for worker-to-orchestrator auth. It had no per-org enforcement — org was self-declared via `X-Worker-Org` header, unverified.

This was replaced by `ORCHESTRATOR_API_KEY/SECRET` with server-side org derivation, eliminating the need for a separate machine credential. `WORKER_ORG` was renamed to `STEP_PREFIX` to reflect its actual purpose (step routing, not identity).

See `lib-worker/docs/wip/worker-auth-migration.md` for the full migration record.

## Related Notes

- [Module Structure](/docs/architecture/module-structure.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Configuration Reference](/docs/usage/configuration.md)
