# @fob/worker (`fob-worker`)

Local worker-plane CLI for FinOpsBricks — step execution, local run-state
(`fob-worker steps`, `lines`, `workpieces`, `stations status`), and pm2 process
management (`fob-worker procs`). Reachable via the `fob` dispatcher as
`fob worker <resource> <action>`.

Command pattern: `fob-worker <resource> <action> [target] [options]`

> **Split note (2026-07-26):** this was `@fob/cli-fob` (binary `fob`). The
> **orchestrator control plane** — canonical station definitions, work records,
> tags, supporting docs (`stations list/show/edit/pull/push/run/…`, `work-records`,
> `tags`, `supporting-docs`, `orchestrator status`) — moved to the sibling
> **`fob-orc`** CLI / **`@fob/orc`** client. What remains here is strictly local:
> filesystem run-state + local step execution + pm2. The pm2 resource `workers`
> was renamed **`procs`**.

## Installation Docs

- [Installation](docs/usage/installation.md) — install, link, shell completion
- [Configuration](docs/usage/configuration.md) — paths, environment variables

## Usage Docs

Guides for CLI users:

- [Command Reference](docs/usage/commands.md) — all commands grouped by resource
- [Running Steps](docs/usage/running-steps.md) — local step debugging workflow
- [Station Sync](docs/usage/station-sync.md) — pull/edit/push workflow
- [Scenarios](docs/usage/scenarios.md) — reusable test configs for steps


## Architecture Docs

Internal docs for CLI maintainers:

- [Module Structure](docs/architecture/module-structure.md)
- [Config Resolution](docs/architecture/config-resolution.md)
- [Steps Loading](docs/architecture/steps-loading.md)
- [Task Construction](docs/architecture/task-construction.md)
- [Template Resolution](docs/architecture/template-resolution.md)
- [Station Files Layout](docs/architecture/station-files-layout.md)
- [Auth](docs/architecture/auth.md)
- [CLI Design Style Guide](docs/cli-design-style.md) — command structure and conventions
