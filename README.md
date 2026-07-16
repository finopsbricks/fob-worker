# @fob/cli-fob

Developer CLI for FinOpsBricks workers — `fob stations`, `fob lines`, `fob workpieces` and friends.

Command pattern: `fob <resource> <action> [target] [options]`

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
