# @fob/cli v2 — Complete

Expand the fob CLI with orchestrator integration and additional developer tools.

**Repo:** https://github.com/finopsbricks/cli

**Previous:** [fob-cli.md](fob-cli.md) (v1 complete)

---

## New Commands

### Processes

```bash
fob processes list          # List processes from orchestrator
fob processes show <id>     # Show process definition (steps, config)
fob processes run <id>      # Run full process locally (chain all steps)
```

### Work Records

```bash
fob work-records list       # List recent work records
fob work-records show <id>  # Show work record details + step outputs
```

### Config

```bash
fob config show             # Show current .fob.json + defaults + env
fob config init             # Create .fob.json interactively
```

### Worker

```bash
fob worker status           # Check connection to orchestrator
```

---

## Implementation Plan

### Phase 1: Config Commands — Complete

1. [x] `fob config show` — Display merged config (.fob.json + defaults + relevant env vars)
2. [x] `fob config init` — Interactive prompts to create .fob.json

**Env vars mapped:**
- `ORCHESTRATOR_URL` → `orchestrator.url`
- `WORKER_ORG` → `orchestrator.org`

**Displayed in `config show`:**
- `ORCHESTRATOR_URL`, `WORKER_ORG`, `WORKER_SECRET`, `FOB_TXN_API_URL`, `TXN_ORG_ID`

### Phase 2: Orchestrator Integration — Complete

**Auth decision:** Uses `WORKER_SECRET` for Bearer auth, `X-Worker-Org` header for org context.

1. [x] Add orchestrator API client to CLI (`src/utils/orchestrator.js`)
2. [x] `fob processes list` — GET /api/processes
3. [x] `fob processes show <id>` — GET /api/processes/:id
4. [x] `fob work-records list` — GET /api/work-records (with --limit, --status, --process filters)
5. [x] `fob work-records show <id>` — GET /api/work-records/:id
6. [x] `fob worker status` — Check orchestrator connectivity

### Phase 3: Local Process Execution — Deferred to v3

1. [ ] `fob processes run <id>` — Fetch process definition, run steps in sequence locally

---

## Configuration

New `.fob.json` fields for orchestrator integration:

```json
{
  "stepsPath": "./src/steps/index.js",
  "tempDir": "./temp",
  "orchestrator": {
    "url": "http://localhost:3000",
    "org": "alex"
  }
}
```

Or use environment variables:
- `ORCHESTRATOR_URL`
- `WORKER_ORG`
- `WORKER_SECRET` (for worker status check)
- `ORCHESTRATOR_API_KEY` (for v1 API - processes, work-records)
- `ORCHESTRATOR_API_SECRET` (for v1 API - processes, work-records)

---

## Resolved Questions

1. **Orchestrator API auth** — Two auth methods:
   - Worker endpoints (`/api/worker/*`): `WORKER_SECRET` Bearer token
   - V1 API endpoints (`/api/v1/*`): `ORCHESTRATOR_API_KEY` + `ORCHESTRATOR_API_SECRET` headers
2. **Work record filtering** — Implemented: `--limit`, `--status`, `--process` filters.

## Open Questions

1. **Process run locally** — How to handle steps that require orchestrator context (work_record.id, item_snapshot)?

---

## Dependencies

- Orchestrator API endpoints for processes and work records
- May need new endpoints if not already available

---

## Related

- [fob-cli.md](fob-cli.md) — v1 implementation (complete)
- [step-testing-strategy.md](step-testing-strategy.md) — Testing strategy using fob CLI
