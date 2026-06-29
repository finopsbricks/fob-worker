---
status: NOT STARTED
---

# FOB CLI v10: Station Run with Step-Config Overrides

## Status: NOT STARTED

Extend `fob stations run <id>` so operators can trigger a station with one-shot step-config overrides (e.g. `--today_override=2026-06-05`) or a saved scenario file. Execution still happens on the orchestrator-dispatched worker — the CLI does not run anything locally. Overrides are recorded on the work record for audit/repro.

---

## Problem Statement

Today the only way to flip a step's `config` value (e.g. `today_override` on `IG0_01_mint_due_invoices`) is to edit the station JSON, `fob stations push`, trigger the run, then revert and push again. This is painful for ad-hoc operator scenarios: backfill last quarter, replay an earlier date, force a dry-run path, etc.

The step's zod `inputSchema` already gates what a step actually consumes at runtime (unknown keys are silently stripped by `z.object()` by default), so we don't need a separate validation layer on the orchestrator or CLI. We just need a transport for operator-supplied keys from the CLI to the worker's `step.config`.

## Proposed Solution

**CLI** accepts step-config keys as direct flags (`--today_override=2026-06-05`) and/or a `--scenario <name>` referencing a flat JSON file under `.orchestrator/scenarios/stations/<short_code>/`. On submit, the CLI POSTs a `step_overrides` object to the orchestrator's run endpoint.

**Orchestrator** accepts `step_overrides` on `POST /api/v1/stations/:id/run`, persists it on the work record (`work_records.step_overrides` jsonb), and shallow-merges it into every step's `config` at job-prepare time. The merged values land in `work_records.process_steps_snapshot[].config`, which is what the worker already reads — **no worker changes needed**. The worker's zod schema handles "is this key actually consumed by this step" at runtime via its default strip-unknown-keys behavior.

### Resolution Order

1. Station JSON `steps[].config` (baseline, as today)
2. `--scenario <name>` values (shallow-merged onto baseline)
3. Direct CLI flags `--key=value` (shallow-merged on top — CLI wins on conflict with scenario)

### Key-Collision Rule (Intentionally Simple)

Every override key is merged into every step's `config`. We do not target a specific step. If a step doesn't care about a given key, its zod schema strips it; if two steps both declare the same key, both receive the override. Justification: new stations are 1-2 steps with distinct functions; the all-steps merge is the simplest thing that works. Revisit only if we actually hit a problem.

### Reserved Flag Names

`id` (positional), `--item`, `--scenario`, `--help` are CLI-reserved. If a step ever declares a config key matching one of these, CLI rejects with "reserved flag name — rename the step's input key." Out of scope for v1.

### What We Are Not Doing (v1)

- **No `input_schema` pushed to station JSON.** zod stays in worker code as the runtime allow-list. Trade-off: typos like `--todayOverride` are not caught at submit time — you discover them when output looks wrong, then read the work record's `step_overrides` to see what you typed. Add `input_schema` later if this becomes a real complaint.
- **No type validation in CLI or orchestrator.** A bad value (e.g. `--today_override=not-a-date`) fails inside the step at runtime, where zod / `new Date()` already validate. Acceptable for v1.

---

## Implementation Phases

### Phase 1: Orchestrator API + snapshot merge ❌

- [ ] DB: add `work_records.step_overrides` jsonb column (nullable) — migration in `apps/orchestrator.finopsbricks.com/migrations/`
- [ ] `POST /api/v1/stations/:id/run` (`src/app/api/v1/stations/[id]/run/route.js`):
  - Accept optional `step_overrides: { [key: string]: any }` in body
  - No key validation — pass through as-is
  - Persist `step_overrides` on the work record at create time
- [ ] `src/jobs/executeStation.js`, `prepareWorkRecord` block (lines 60-97): before persisting `process_steps_snapshot`, shallow-merge `step_overrides` into every step's `config`:
  ```js
  const resolved_steps = steps.map(step => ({
    ...step,
    location: step.location !== undefined ? step.location : process_location,
    config: { ...step.config, ...(step_overrides || {}) },
  }));
  ```
- [ ] Logging: emit `run.created` event with `step_overrides` in `properties` (line 61-67)
- [ ] Verify the deprecated `/api/v1/processes/:id/run` proxy forwards the body unchanged (do not strip `step_overrides`)

### Phase 2: CLI command surface ❌

- [ ] `cli/src/cli/stations/run.js` — currently uses `argv.id` and `argv.item`. Extend to:
  - Read `argv.scenario` if present
  - Treat every remaining `argv` key (excluding `id`, `item`, `scenario`, `_`, `$0`, and yargs internals) as an override candidate
  - Build merged `step_overrides` map: scenario file first, then CLI flags (CLI wins)
  - Pass `step_overrides` through `runStation(stationId, itemId, step_overrides)` in `cli/src/utils/orchestrator.js`
- [ ] `cli/src/utils/orchestrator.js:316-322`: extend `runStation(id, itemId, step_overrides)` to include `step_overrides` in POST body when non-empty
- [ ] yargs config for `stations run` subcommand: disable strict mode (or use `.parserConfiguration({'unknown-options-as-args': false})` + manual extraction) so arbitrary `--key=value` flags don't error
- [ ] Scenario loader: read `.orchestrator/scenarios/stations/<short_code>/<name>.json` (flat key-value JSON); error with available-scenarios list if missing
- [ ] CLI prints the resolved overrides before posting: `Overrides: today_override=2026-06-05 (from scenario backfill-jun + CLI)`
- [ ] Reject if any override key collides with a reserved flag name (`item`, `scenario`)

### Phase 3: Audit display ❌

- [ ] `fob work-records show <id>`: print `Step Overrides:` section if `work_record.step_overrides` is non-null
- [ ] Orchestrator UI: ViewWorkRecord page surfaces overrides alongside the snapshot

### Phase 4: Docs ❌

- [ ] `cli/docs/usage/commands.md`: document `fob stations run <id> --key=value` and `--scenario <name>`
- [ ] `cli/docs/usage/scenarios.md`: add station-scenario file location + flat-shape convention
- [ ] New `cli/docs/usage/running-stations.md` covering the override workflow end-to-end
- [ ] `cli/docs/architecture/task-construction.md`: note that station snapshots now carry merged overrides (workers see the merged config, not the originals)

### Phase 5: Tests ❌

- [ ] CLI: `cli/tests/cli/stations/run.test.js` — direct flag, scenario only, scenario+flag (flag wins), reserved-flag rejection
- [ ] Orchestrator: tests for the run endpoint — happy path with overrides, override persisted on work record, snapshot reflects merge
- [ ] End-to-end: trigger IG0 with `--today_override=2026-06-05` against a local orchestrator + worker, verify minted invoices honor the override

---

## New CLI Surface

```bash
# Direct flag(s) — keys come from step inputSchemas (no CLI validation)
fob stations run IG0 --today_override=2026-06-05

# Saved scenario
fob stations run IG0 --scenario backfill-jun

# Scenario + direct override (direct wins)
fob stations run IG0 --scenario backfill-jun --today_override=2026-06-05
```

## Scenario File Shape (Flat)

```json
// .orchestrator/scenarios/stations/IG0/backfill-jun.json
{
  "today_override": "2026-06-05"
}
```

Flat because the orchestrator merges every key into every step's config — the scenario doesn't need to know which step owns the key.

---

## Related Files

**CLI**
- `cli/src/cli/stations/run.js` — current `runStationHandler`, the entry point to extend
- `cli/src/utils/orchestrator.js:316-322` — `runStation()` API client
- `cli/docs/usage/commands.md`, `cli/docs/usage/scenarios.md`

**Orchestrator**
- `apps/orchestrator.finopsbricks.com/src/app/api/v1/stations/[id]/run/route.js` — accept + persist `step_overrides`
- `apps/orchestrator.finopsbricks.com/src/jobs/executeStation.js:60-97` — merge into `process_steps_snapshot`
- Migration: add `work_records.step_overrides` jsonb column

**Worker (read-only reference — no changes)**
- `workers/worker-nowapps2/src/steps/IG0__mint_due_invoices/IG0_01_mint_due_invoices.js:58-60` — example `inputSchema` with `today_override`
- `workers/worker-nowapps2/.orchestrator/stations/IG0__ingest_due_periods.json` — target station JSON for first end-to-end test
