# Remove Config Object Anti-pattern for Orchestrator Settings

## Status: COMPLETE

The `orchestrator` section of `config.js` mirrored env vars into a config object with no added value. Fixed to read `process.env` directly at call sites. Defaults documented in `.env.example`.

---

## Problem Statement

`src/utils/config.js` violated the config-object anti-pattern for orchestrator settings. `ORCHESTRATOR_URL` and `WORKER_ORG` were env vars renamed into `config.orchestrator.url` and `config.orchestrator.org` — pure indirection with no benefit. The hardcoded default `http://localhost:3000` was also wrong (should be the production URL) and belonged in `.env.example`, not in code.

## Proposed Solution

- Remove `orchestrator` from `DEFAULTS` and `ENV_MAPPINGS` in `config.js`
- Read `process.env.ORCHESTRATOR_URL` and `process.env.WORKER_ORG` directly in `orchestrator.js`
- Create `.env.example` with the correct production default documented

## Implementation Phases

### Phase 1: Update config.js ✅
- [x] Remove `orchestrator` key from `DEFAULTS`
- [x] Remove `ORCHESTRATOR_URL` and `WORKER_ORG` from `ENV_MAPPINGS`
- [x] Remove `setByPath` helper (only used for ENV_MAPPINGS loop)
- [x] Remove ENV_MAPPINGS loop from `loadConfig()`

### Phase 2: Update call sites ✅
- [x] Replace `config.orchestrator.url` with `process.env.ORCHESTRATOR_URL` in `orchestrator.js`
- [x] Replace `config.orchestrator.org` with `process.env.WORKER_ORG` in `orchestrator.js`
- [x] Remove orchestrator prompts from `fob config init` in `cli.js` (env vars, not .fob.json settings)

### Phase 3: Add .env.example ✅
- [x] Create `.env.example` at repo root
- [x] Document `ORCHESTRATOR_URL=https://orchestrator.finopsbricks.com`
- [x] Document all other env vars used by the CLI

## Related Files

- `src/utils/config.js` — removed orchestrator from DEFAULTS and ENV_MAPPINGS
- `src/utils/orchestrator.js` — reads process.env directly
- `src/cli.js` — removed orchestrator prompts from init command
- `.env.example` — created with defaults documented
