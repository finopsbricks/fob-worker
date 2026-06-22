# SOR CLI Convergence

A single CLI (`fobs`) serves all FinOpsBricks system-of-record apps. The orchestrator CLI (`fob`) stays separate for now, pending a convergence assessment.

## Context

An earlier iteration of this doc (see this file's git history under the `sor-cli-separation.md` name) recorded the opposite decision: one separate CLI package per SOR app. That decision was reversed shortly after, before any second SOR CLI was built. The reasoning below replaces it.

## Decision

- `fobs` is the single CLI for all SOR apps (statements, billing, recordings, ...). New SOR apps register in [`src/utils/apps.js`](../../../cli-statements/src/utils/apps.js) in the `cli-statements` repo. (The repo name is now historical — it grew beyond statements; renaming is tracked as a follow-up.)
- Command signature: `fobs <app> <resource> <action> [target] [options]`. Short codes (3-letter, matching API key prefixes) are accepted as aliases. See [Command Signature](../../../cli-statements/docs/architecture/command-signature.md).
- Each org has per-app credentials. See [Credential Model](../../../cli-statements/docs/architecture/credential-model.md).
- This orchestrator CLI (`fob`) stays as-is. Its absorption into `fobs orchestrator` is tracked as a follow-up.

## Why convergence won

- **Credentials are already per-org-per-app.** A user adding three apps to one org needs three credential blobs no matter how the CLI is packaged. Putting them in three separate binaries doesn't reduce the burden — it just adds three install paths and three help trees.
- **No PAT needed.** Most customers have 1–3 orgs. Implementation partners with many orgs *prefer* per-org-per-user keys (better security boundary, easier rotation). There's no scenario where a "user-wide token" would simplify life enough to justify building a central token service.
- **Audit attribution works without a PAT.** The operational convention is one key per individual; server logs record which `api_key.id` issued each request. See [Credential Model](../../../cli-statements/docs/architecture/credential-model.md).
- **Shared scaffolding stays shared without an artificial package boundary.** `format.js`, `http.js`, `config.js` serve every app's commands directly — no `@fob/cli-core` extraction needed.
- **One install, one config file, one help tree.** Lower cognitive load.

## Why orchestrator stays separate (for now)

The orchestrator CLI has two flavors of commands:

| Flavor | Example | Worker repo required? |
|---|---|---|
| API client | `fob stations list` | No (just calls the orchestrator API) |
| Worker-context | `fob steps run my_step` | Yes — needs `./src/steps/`, `@fob/lib-worker`, `./temp/` |

Folding the orchestrator CLI into `fobs` is possible: API-client commands move under `fobs orchestrator <resource>` and read creds from `~/.fobs/`; worker-context commands additionally check for a worker repo. But it's a larger refactor than the SOR convergence and the win is smaller — the worker-context commands are the main reason `fob` exists today. Tracked as a follow-up; not blocked on anything.

## Trade-offs

| Aspect | Single SOR CLI (chosen) | Separate per-SOR CLIs (rejected) |
|---|---|---|
| Install steps | One | One per app |
| Help discoverability | `fobs --help` lists all apps | Each binary lists only its own |
| Cross-app workflows | Same binary, same session | Two binaries, two configs |
| Add new SOR app | One line in registry + a handler subtree | New repo + new install + duplicated scaffolding |
| Worker-context coupling | Doesn't apply to SOR apps | N/A |

## Related Notes

- [Command Signature](../../../cli-statements/docs/architecture/command-signature.md)
- [App Registry](../../../cli-statements/docs/architecture/app-registry.md)
- [Credential Model](../../../cli-statements/docs/architecture/credential-model.md)
- [Auth Design](/docs/architecture/auth.md) — this CLI's auth model
- [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md) — why this CLI is still worker-coupled
- [System-of-Record App Inventory](../../../handbooks/platform-handbook/architecture/system-of-record-app-inventory.md)
- [API Key Scoping](../../../handbooks/platform-handbook/security/api-key-scoping.md)
