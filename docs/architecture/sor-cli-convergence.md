# SOR CLI Convergence

A single CLI (`fobs`) serves all FinOpsBricks system-of-record apps *and* the orchestrator's API-client commands. The orchestrator CLI (`fob`) stays as the home for worker-context commands only.

## Context

An earlier iteration of this doc (see this file's git history under the `sor-cli-separation.md` name) recorded the opposite decision: one separate CLI package per SOR app. That was reversed before any second SOR CLI was built. Subsequent work folded the orchestrator's API-client surface into `fobs` as well — the present split is by *execution context*, not by app.

## Decision

- `fobs` is the single CLI for all SOR apps (statements, billing, recordings, ...) and for orchestrator API-client commands. New apps register in [`src/utils/apps.js`](../../../fobs/src/utils/apps.js) in the `fobs` repo.
- Command signature: `fobs <app> <resource> <action> [target] [options]`. Short codes (3-letter, matching API key prefixes) are accepted as aliases. See [Command Signature](../../../fobs/docs/architecture/command-signature.md).
- Each org has per-app credentials. See [Credential Model](../../../fobs/docs/architecture/credential-model.md).
- This orchestrator CLI (`fob`) keeps the worker-context commands (steps, lines, workpieces, stations pull/push, config show).

## Why convergence won

- **Credentials are already per-org-per-app.** A user adding three apps to one org needs three credential blobs no matter how the CLI is packaged. Putting them in three separate binaries doesn't reduce the burden — it just adds three install paths and three help trees.
- **No PAT needed.** Most customers have 1–3 orgs. Implementation partners with many orgs *prefer* per-org-per-user keys (better security boundary, easier rotation). There's no scenario where a "user-wide token" would simplify life enough to justify building a central token service.
- **Audit attribution works without a PAT.** The operational convention is one key per individual; server logs record which `api_key.id` issued each request. See [Credential Model](../../../fobs/docs/architecture/credential-model.md).
- **Shared scaffolding stays shared without an artificial package boundary.** `format.js`, `http.js`, `config.js` serve every app's commands directly — no `@fob/cli-core` extraction needed.
- **One install, one config file, one help tree.** Lower cognitive load.

## Orchestrator split: API-client → fobs; worker-context → fob

The orchestrator CLI's commands divide cleanly by execution context:

| Flavor | Example | Lives in | Reads creds from |
|---|---|---|---|
| API client | `fobs orc stations list` | `fobs` | `~/.fobs/config.yml` (`orchestrator` app) |
| Worker-context | `fob steps run my_step` | `fob` (this repo) | the worker repo's `./.env` |

**API-client commands** include: stations list/show/edit/delete/unarchive, work-records list/show/edit/cancel, tags list/create/edit/delete, orchestrator status, supporting-docs show. These call the orchestrator API and have no filesystem dependencies, so they live in `fobs` under `fobs orchestrator <resource>` (alias `fobs orc <resource>`).

**Worker-context commands** include: steps list/run, stations pull/push, stations update-step-metadata, lines list/show/status, workpieces list/show/watch, config show, workers list/start/stop/restart/logs/monit. These read or write `./src/steps/`, `./.orchestrator/stations/`, `./temp/`, or manage local worker processes (`ps`/`lsof`/`pm2`), and/or load `@fob/lib-worker` from the cwd. They stay in `fob` (this repo).

This is the only CLI that retains the worker-context coupling — see [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md).

## Trade-offs

| Aspect | Single SOR + API-client CLI (chosen) | Separate per-app CLIs (rejected) |
|---|---|---|
| Install steps | One (plus `fob` for worker-context) | One per app |
| Help discoverability | `fobs --help` lists all apps | Each binary lists only its own |
| Cross-app workflows | Same binary, same session | Two binaries, two configs |
| Add new app | One line in registry + a handler subtree | New repo + new install + duplicated scaffolding |
| Worker-context coupling | Doesn't apply to `fobs` | N/A |

## Related Notes

- [Command Signature](../../../fobs/docs/architecture/command-signature.md) — in the fobs repo
- [App Registry](../../../fobs/docs/architecture/app-registry.md) — in the fobs repo
- [Credential Model](../../../fobs/docs/architecture/credential-model.md) — in the fobs repo
- [Auth Design](/docs/architecture/auth.md) — this CLI's worker-credential auth model
- [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md) — why this CLI is still worker-coupled
- [System-of-Record App Inventory](../../../handbooks/platform-handbook/architecture/system-of-record-app-inventory.md)
- [API Key Scoping](../../../handbooks/platform-handbook/security/api-key-scoping.md)
