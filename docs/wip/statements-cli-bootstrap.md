# Statements CLI Bootstrap

**Status:** IN PROGRESS (~85%)
**Created:** 2026-06-22

A simple, independent CLI for the statements app (system of record). Read-only v1, org-level API key auth, multi-org switching. Lives in a sibling repo to avoid coupling with this orchestrator CLI.

---

## Problem

There's no programmatic way to query statements (accounts, transactions, statements, rules, reports) from a terminal. Today, all access is via the statements web UI.

The orchestrator CLI in this repo can't be reused — it's coupled to a worker repo's `./.env`, `./src/steps/`, and dynamic `@fob/lib-worker` resolution from `cwd/node_modules/`. None of that applies to a remote API client.

## Solution

A new sibling repo `cli-statements/` with a `fobs` binary.

- Org-level API key + secret (paste from statements UI).
- Multiple orgs stored in `~/.fobs/config.yml` with `chmod 0600`.
- `fobs orgs use <name>` to switch active org.
- Read-only commands for v1: `accounts`, `transactions`, `statements`, `rules`, `reports`.
- Native `fetch()`, yargs, `js-yaml`, ES modules, Jest.

### Explicit non-goals (v1)

- No `@fob/cli-core` extraction
- No central auth service login / device-code flow / PAT support
- No multi-app routing (`--app billing`)
- No mutating commands (no create/edit/delete)
- No environment/profile beyond per-org `api_url`
- No OS keychain
- No shell completion

These are deferred until concrete need emerges.

## Implementation Phases

### Phase 1: Repo + creds management ✅
- [x] Scaffold `/Users/alex/ec2code/finopsbricks/cli-statements/` with `package.json`, `bin/fobs.js`, `src/`
- [x] yargs root + version + help wiring
- [x] `~/.fobs/config.yml` reader/writer with `0600` enforcement (`FOBS_CONFIG_DIR` env var override for tests)
- [x] `fobs orgs add <name>` — interactive prompts (with `--api-url`, `--api-key`, `--api-secret` flags for non-interactive use)
- [x] `fobs orgs list` — table with current marker, `--json` mode
- [x] `fobs orgs use <name>` — switch `current_org`
- [x] `fobs orgs remove <name>` — confirm + `--yes` flag, reassigns `current_org` to a remaining org
- [x] Jest setup mirroring this CLI's `jest.config.cjs` — 13 unit tests for the config module, all passing
- [x] End-to-end smoke test across all four commands (add → list → use → remove)

### Phase 2: HTTP layer + first resource ✅
- [x] `src/utils/http.js` — `apiGet()` with `api-key`/`api-secret` headers, base URL from current org, search-param serialization, `ApiError` with code+status
- [x] `src/utils/format.js` — table/field/date helpers (done in Phase 1)
- [x] `src/cli/accounts/list.js` — `GET /api/v1/accounts` with `--category`, `--include-archived`, `--page`, `--limit`, `--json`; pagination hint when more pages exist
- [x] `src/cli/accounts/show.js` — `GET /api/v1/accounts/:id` with `--json`
- [x] `safe()` wrapper at the yargs layer so API/network errors exit cleanly (no stack trace unless `FOBS_DEBUG=1`)
- [x] 6 tests on `apiGet()` covering auth headers, param serialization, 401/5xx/non-JSON responses, missing current-org

### Phase 3: Remaining read commands ✅
- [x] `transactions list/show` (filters: `--account`, `--from`, `--to`, `--search`)
- [x] `statements list/show` (filters: `--account`, `--period-from`, `--period-to`, `--file-type`, `--parser-type`, `--include-archived`)
- [x] `rules list/show` (filter: `--enabled`; show pretty-prints `conditions` + `actions` JSON)
- [x] `reports show <name>` with `choices` validation (10 report names: expense/cashflow/income/asset/liability/transfer/balance/overview/inflow_outflow/data-coverage); JSON output (custom shape, not paginated)
- [x] `formatPaginationHint()` extracted to format.js; accounts/list.js refactored to use it
- [x] Live-tested against statements.finopsbricks.com (alex2526 org): 17,932 transactions, 298 statements, 49 rules, balance/overview reports

### Phase 4: Docs ❌
- [ ] `README.md` — flesh out beyond quick start
- [ ] `docs/usage/installation.md`
- [ ] `docs/usage/configuration.md` — config file format, `~/.fobs/config.yml` schema, `FOBS_CONFIG_DIR` override
- [ ] `docs/usage/commands.md` — full command reference

## Polish ideas (not blocking)

- API returns amounts in paise (×100 of rupees). Consider a default formatter that divides by 100 and shows `₹` — or a `--paise` flag to opt out. Today the CLI prints raw integers from the API.
- `transactions show` displays `Created: —` because the API omits `created_at` on transactions. Either drop the row or expose it via `--json` only.
- Some `statements list` rows show `—` for ACCOUNT and PERIOD START/END (statements that failed to parse account binding). A `--status parsed|failed` filter could be useful.

## Related Files

- `/Users/alex/ec2code/finopsbricks/cli/docs/architecture/sor-cli-separation.md` — decision record for this repo split
- `/Users/alex/ec2code/finopsbricks/handbooks/platform-handbook/security/api-key-scoping.md` — auth model the CLI consumes
- `/Users/alex/ec2code/finopsbricks/apps/statements.finopsbricks.com/` — API surface to call
