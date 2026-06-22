# Statements CLI Bootstrap

**Status:** IN PROGRESS (~25%)
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

### Phase 2: HTTP layer + first resource ❌
- [ ] `src/utils/http.js` — fetch with `api-key`/`api-secret` headers, base URL from current org
- [ ] `src/utils/format.js` — copy table/field/json helpers from this CLI
- [ ] `src/cli/accounts/list.js` — `GET /api/v1/accounts`
- [ ] `src/cli/accounts/show.js` — `GET /api/v1/accounts/:id`

### Phase 3: Remaining read commands ❌
- [ ] `transactions list/show` (filters: `--account`, `--from`, `--to`)
- [ ] `statements list/show`
- [ ] `rules list/show`
- [ ] `reports show <name>`

### Phase 4: Docs ❌
- [ ] `README.md` — quick start
- [ ] `docs/usage/installation.md`
- [ ] `docs/usage/configuration.md` — config file format
- [ ] `docs/usage/commands.md` — full command reference

## Related Files

- `/Users/alex/ec2code/finopsbricks/cli/docs/architecture/sor-cli-separation.md` — decision record for this repo split
- `/Users/alex/ec2code/finopsbricks/handbooks/platform-handbook/security/api-key-scoping.md` — auth model the CLI consumes
- `/Users/alex/ec2code/finopsbricks/apps/statements.finopsbricks.com/` — API surface to call
