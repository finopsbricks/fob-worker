# CLAUDE.md

Guidance for Claude Code when working with this package.

## Overview

`@fob/cli` is a developer CLI for FinOpsBricks process engine workers. It provides commands for local step debugging without duplicating code across worker repos.

### Related Repositories

This package is part of the **FinOpsBricks** monorepo (`/Users/alex/ec2code/finopsbricks/`):

- **`workers/*`** — Customer-specific workers. This CLI is used inside worker repos to debug steps locally.
- **`lib/lib-worker`** — Shared worker infrastructure (`@fob/lib-worker`). Workers depend on this. CLI loads it at runtime from the worker's `node_modules/` (not as its own dependency — see `docs/architecture/lib-worker-resolution.md`).
- **`apps/orchestrator.finopsbricks.com`** — Process orchestrator. Defines processes and step sequences.
- **`apps/txn.finopsbricks.com`** — System of record. Steps may call this API during local debugging.
- **`accounting-process-standards/`** — Documentation for step design patterns.

Built with **yargs** for command parsing and shell completion.

## Commands

Pattern: `fob <resource> <action> [target] [options]`

```bash
fob steps list                              # List available steps
fob steps run alex/fetch_account_freshness  # Run a step locally
fob completion                              # Output shell completion script
fob --help                                  # Show help
```

See `docs/cli-design-style.md` for design rationale.

## Shell Completion

```bash
# Bash (add to ~/.bashrc)
source <(fob completion)

# Zsh (add to ~/.zshrc)
source <(fob completion)
```

Tab completion works for:
- `fob <tab>` → resources (steps, config, processes, work-records, worker)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs
- `fob processes <tab>` → actions (list, show, pull, push, update-step-metadata)

## Package Structure

```
bin/
  fob.js                  # CLI entry point
src/
  cli.js                  # yargs command definitions and handlers
  utils/
    config.js             # Convention-based path resolution
    steps-loader.js       # Dynamic import of steps registry
    lib-worker-loader.js  # Runtime loader for worker's @fob/lib-worker
    output.js             # Save/load step outputs
    orchestrator.js       # HTTP calls to orchestrator API
    process-files.js      # Read/write .orchestrator/ directory
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
