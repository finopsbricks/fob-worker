# SOR CLI Separation

System-of-record CLIs are separate packages from the orchestrator CLI. No shared core (yet).

## Context

This CLI (`fob`) serves the orchestrator and the workers that connect to it. Several system-of-record apps (statements, billing, recordings) also need CLI access for inspection and operator workflows. See [System-of-Record App Inventory](../../../handbooks/platform-handbook/architecture/system-of-record-app-inventory.md).

## Decision

Each system-of-record CLI is an independent package, sibling to this one. The orchestrator CLI is not extended with SOR commands. No `@fob/cli-core` package is extracted.

The first SOR CLI is `cli-statements/` (`fobs` binary) at `/Users/alex/ec2code/finopsbricks/cli-statements/`.

## Why separate

This CLI is coupled to a worker repo's runtime context:
- Reads `./.env` from `process.cwd()` via dotenv
- Requires `./src/steps/index.js` and a populated `./temp/`
- Dynamically loads `@fob/lib-worker` from the cwd's `node_modules/` — see [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md)

SOR CLIs are remote API clients. They do not run inside a worker repo, do not need `lib-worker`, do not load steps. Sharing a binary or a credential-resolution path would conflate two unrelated execution contexts.

## Why no shared core yet

The duplication is small (yargs scaffolding, table/field formatters, JSON-mode plumbing) and the SOR apps don't yet share enough API shape to justify a `@fob/cli-core` extraction. Premature extraction would lock in abstractions before two real consumers exist.

Re-evaluate when:
- A second SOR CLI exists (e.g. `cli-billing`) and visible duplication accumulates
- Or the central auth service gains PATs, at which point a shared auth/HTTP layer becomes worth extracting

## Trade-offs

| Aspect | Independent CLIs (chosen) | Shared core | Single CLI for all |
|---|---|---|---|
| Coupling | None | Shared scaffolding | Worker context bleeds into SOR commands |
| Duplication | Small | Eliminated | Eliminated |
| Cognitive load | One binary = one purpose | Two binaries, one shared concept | One binary, two auth models |
| Migration cost later | Refactor when 2nd appears | Done upfront | Hard to split if needed |

Independent CLIs were chosen because v1 of any SOR CLI is small enough that duplication is cheaper than premature abstraction.

## Related Notes

- [Auth Design](/docs/architecture/auth.md) — this CLI's auth model
- [lib-worker Resolution](/docs/architecture/lib-worker-resolution.md) — why this CLI is worker-coupled
- [System-of-Record App Inventory](../../../handbooks/platform-handbook/architecture/system-of-record-app-inventory.md)
- [API Key Scoping](../../../handbooks/platform-handbook/security/api-key-scoping.md)
