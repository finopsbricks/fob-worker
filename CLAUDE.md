# CLAUDE.md

Guidance for Claude Code when working with this package.

## Overview

`@fob/worker` (binary `fob-worker`) is the **local worker-plane** CLI for FinOpsBricks workers: local step debugging/execution, local run-state inspection (lines/workpieces/`stations status`), and pm2 process management (`procs`). The **orchestrator control plane** (canonical station defs, work records, tags, supporting docs) lives in the sibling **`fob-orc`** CLI / **`@fob/orc`** client. This CLI holds no orchestrator API code. Reachable via the `fob` dispatcher as `fob worker <resource> <action>`. (Was `@fob/cli-fob`, binary `fob`, before the 2026-07-26 split.)

### Related Repositories

This package is part of the **FinOpsBricks** monorepo:

- **`workers/*`** — Customer-specific workers. This CLI is used inside worker repos to debug steps locally.
- **`lib/lib-worker`** — Shared worker infrastructure (`@fob/lib-worker`). Workers depend on this. CLI loads it at runtime from the worker's `node_modules/` (not as its own dependency — see `docs/architecture/lib-worker-resolution.md`).
- **`apps/orchestrator.finopsbricks.com`** — Orchestrator. Defines stations and step sequences. (Note: its API and database still use "process" terminology — the rename is CLI-side only.)
- **`apps/statements.finopsbricks.com`** — System of record. Steps may call this API during local debugging.
- **`fde-handbook`** — step patterns, process design, capabilities, library APIs.
- **`platform-handbook`** — platform architecture, operations, internals.
- **`cfo-handbook`** — domain expertise, accounting best practices.

Built with **yargs** for command parsing and shell completion.

## Commands

Pattern: `fob <resource> <action> [target] [options]`

```bash
fob steps list                              # List available steps
fob steps run alex/fetch_account_freshness  # Run a step locally
fob stations list                           # List stations from orchestrator
fob stations pull --all                     # Pull stations to .orchestrator/stations/
fob completion                              # Output shell completion script
fob --help                                  # Show help
```

Note: the orchestrator API and database still use "process" — only the CLI's vocabulary is "station". URL paths like `/api/v1/processes/*` and JSON field names like `record.process` are preserved as the API contract.

See `docs/cli-design-style.md` for design rationale.

## Shell Completion

```bash
# Bash (add to ~/.bashrc)
source <(fob completion)

# Zsh (add to ~/.zshrc)
source <(fob completion)
```

Tab completion works for:
- `fob <tab>` → resources (lines, stations, steps, workpieces, work-records, supporting-docs, tags, orchestrator, workers, config)
- `fob lines <tab>` → actions (list, show, status)
- `fob stations <tab>` → actions (list, show, status, run, pull, push, edit, update-step-metadata)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs
- `fob workpieces <tab>` → actions (list, show, watch)
- `fob work-records <tab>` → actions (list, show, edit, cancel)
- `fob supporting-docs <tab>` → actions (show)
- `fob tags <tab>` → actions (list, create, edit, delete)

## Package Structure

```
bin/
  fob.js                  # CLI entry point
src/
  cli/
    index.js              # yargs command tree and shell completion
    steps/                # list.js, run.js
    stations/             # list.js, show.js, status.js, run.js, edit.js, pull.js, push.js, update-step-metadata.js
    lines/                # list.js, show.js, status.js
    workpieces/           # list.js, show.js, watch.js
    work-records/         # list.js, show.js, edit.js, cancel.js
    supporting-docs/      # show.js
    tags/                 # list.js, create.js, edit.js, delete.js
    orchestrator/         # status.js
    workers/              # list.js, start.js, stop.js, restart.js, logs.js, monit.js
    shared/               # edit-tags.js (shared tag editing logic)
  utils/
    config.js             # Convention-based path resolution
    steps-loader.js       # Dynamic import of steps registry
    lib-worker-loader.js  # Runtime loader for worker's @fob/lib-worker
    output.js             # Save/load step outputs
    orchestrator.js       # HTTP calls to orchestrator API (keeps /api/v1/processes path)
    format.js             # Shared formatting helpers for CLI output
    station-files.js      # Read/write .orchestrator/stations/
    line-state.js         # Live line/bin state from temp/stations/
    worker-processes.js   # Detect locally-running fob workers (direct or pm2-managed)
    tags.js               # Tag name↔ID resolution helpers
docs/
  architecture/           # Internal design notes (for maintainers)
  usage/                  # How-to guides (for CLI consumers)
  cli-design-style.md     # CLI command structure and conventions
```

## Configuration

The CLI uses convention-based paths — no config file:
- Steps registry: `./src/steps/index.js`
- Temp directory: `./temp/`
- Environment: `./.env` (same as the production worker process)

Required env vars (in worker's `.env`):
- `ORCHESTRATOR_URL`
- `ORCHESTRATOR_API_KEY`
- `ORCHESTRATOR_API_SECRET`
- `STEP_PREFIX`

## Template Resolution

Step configs support:
- `{{env.VAR_NAME}}` — environment variable
- `{{org/step_name.field}}` — field from another step's output

Resolution is handled by `resolveConfig()` from `@fob/lib-worker`, loaded at runtime from the worker's `node_modules/`. The CLI does **not** declare `@fob/lib-worker` as its own dependency — see `docs/architecture/lib-worker-resolution.md`.

## Standards

- ES modules throughout (`"type": "module"`)
- snake_case for config keys
- camelCase for functions
- yargs for command parsing
