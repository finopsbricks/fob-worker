# CLI Auth Separation: .env.cli

**Status:** OBSOLETE
**Created:** 2026-03-02
**Superseded by:** worker-auth-migration in lib-worker (unified `ORCHESTRATOR_API_KEY/SECRET` for both worker process and CLI — no separate credential file needed)

## Problem

The worker's `.env` currently contains two unrelated sets of credentials:
- `WORKER_SECRET` — used by the production worker process (polling loop)
- `ORCHESTRATOR_API_KEY/SECRET` — used only by the `fob` CLI (developer tool)

These are different identities. The production worker process should not carry CLI credentials, and the CLI should not read from the worker's machine config file.

## Solution

Split into two env files per worker repo:

| File | Used By | Contents |
|------|---------|----------|
| `.env` | Production worker process | `WORKER_SECRET`, `WORKER_ORG`, `ORCHESTRATOR_URL`, service API keys |
| `.env.cli` | `fob` CLI only | `ORCHESTRATOR_API_KEY`, `ORCHESTRATOR_API_SECRET`, `WORKER_ORG`, `ORCHESTRATOR_URL` |

The CLI loads **only** `.env.cli`. It never touches `.env`.
The worker process loads **only** `.env`. It never touches `.env.cli`.

Both files are gitignored.

---

## Changes Required

### cli/src/cli.js

Remove `import 'dotenv/config'` (currently loads `.env` at startup).

Replace with explicit `.env.cli` loading:
```javascript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.cli' });
```

If `.env.cli` is not found, the CLI should fail with a clear message when any orchestrator command is attempted (not at startup — `fob steps run` works without orchestrator credentials).

### cli/src/utils/orchestrator.js

No changes needed. Already reads from `process.env`.

### worker repos (.gitignore)

Add `.env.cli` to each worker repo's `.gitignore`.

### worker repos (.env)

Remove `ORCHESTRATOR_API_KEY` and `ORCHESTRATOR_API_SECRET` from each worker's `.env`.

### worker repos (.env.cli) — new file per repo

Create in each worker repo (not committed):
```bash
ORCHESTRATOR_URL=https://orchestrator.finopsbricks.com
WORKER_ORG=<org>
ORCHESTRATOR_API_KEY=<key>
ORCHESTRATOR_API_SECRET=<secret>
```

---

## Error Handling

When the CLI attempts an orchestrator command and `ORCHESTRATOR_API_KEY` is not set, the existing error in `orchestrator.js` already handles this:
> `ORCHESTRATOR_API_KEY and ORCHESTRATOR_API_SECRET environment variables are required`

Consider adding a hint: "Run from a worker directory with a .env.cli file."

---

## Notes

- `fob steps run`, `fob steps list`, `fob config show/init` do not require orchestrator credentials — they work without `.env.cli`
- `fob processes *`, `fob work-records *`, `fob worker status` require `.env.cli`
- This is a stopgap until personal tokens are implemented (see auth architecture doc)
