# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.5.0] - 2026-03-02

### Added
- Comprehensive test suite — unit tests for all `src/utils/` modules (47 tests) with AAA pattern, 80% coverage thresholds, and GitHub Actions CI
- gh-style handler tests for all 11 CLI command handlers (44 tests) — dependencies mocked at module boundary, `captureOutput` helper captures stdout/stderr, `ExitError` halts execution on `process.exit` for assertable exit codes
- `src/utils/picker.js` — `interactivePicker` extracted as a standalone utility
- `getStepSlugs()` exported from `src/utils/steps-loader.js`

### Changed
- Refactored `src/cli.js` (~1000 lines) into `src/cli/` folder structure that mirrors the CLI command tree — each handler in its own file (e.g. `fob processes pull` → `src/cli/processes/pull.js`)
- Simplified CLI environment variable configuration
- Auth and worker status connection handling improvements

## [0.4.0] - 2026-03-02

### Changed
- Worker endpoints now authenticate with `ORCHESTRATOR_API_KEY` and `ORCHESTRATOR_API_SECRET` instead of `WORKER_SECRET`
- Replaced `WORKER_ORG` env var with `STEP_PREFIX` for step namespace identification
- Upgraded `@fob/lib-worker` to v0.6.0

### Removed
- `WORKER_SECRET` environment variable support
- `WORKER_ORG` environment variable support
- `orchestrator.url` and `orchestrator.org` keys from `.fob.json` config (orchestrator URL now read directly from `ORCHESTRATOR_URL` env var only)
- `FOB_TXN_API_URL` and `TXN_ORG_ID` from relevant env vars display

## [0.3.0] - 2026-03-02

### Added
- Extensive architecture documentation: config-resolution, module-structure, steps-loading, task-construction, template-resolution
- Usage documentation: configuration, installation, process-sync, running-steps, scenarios

### Changed
- Orchestrator connection (`ORCHESTRATOR_URL`, `WORKER_ORG`) now read directly from environment variables instead of `.fob.json` config — remove `orchestrator` keys from `.fob.json` if present
- `fob config init` no longer prompts for orchestrator URL or org
- `getRelevantEnvVars` no longer includes `FOB_TXN_API_URL` / `TXN_ORG_ID`
- Upgraded `@fob/lib-worker` to v0.5.0
- README substantially expanded with usage examples and architecture overview

### Fixed

### Removed
- `orchestrator.url` and `orchestrator.org` config defaults from `.fob.json` schema
- Env var config layer for `ORCHESTRATOR_URL` and `WORKER_ORG` (now read directly)

## [0.2.1] - 2026-02-24

### Changed
- Replaced local `resolveTemplates` with `resolveConfig` from `@fob/lib-worker` for template resolution
- Template resolution now uses `step_outputs` context instead of `tempDir` for better orchestrator compatibility
- Updated README documentation

## [0.2.0] - 2026-02-24

### Added
- Initial CLI implementation with `fob steps list` and `fob steps run` commands
- Template resolution for config files (`{{env.VAR}}`, `{{step/slug.field}}`)
- Shell completion support via yargs for bash/zsh (`fob completion`)
- Config commands: `fob config show` and `fob config init`
- Orchestrator integration commands:
  - `fob processes list/show` - view processes from orchestrator
  - `fob work-records list/show` - view work records with filters (`--limit`, `--status`, `--process`)
  - `fob worker status` - check orchestrator connectivity
- API client with dual auth support (Worker endpoints and V1 API endpoints)
- Folder and file columns in `fob steps list` output for readability
- Steps loader module for dynamic step imports from worker repos
- Task structure matching orchestrator's Task typedef (`step.config`, `work_record.step_outputs`)
- Documentation: README, CLI pattern rationale, task structure docs

### Changed
- Deduplicated `createHandler` by importing from `@fob/lib-worker`
- Refactored to resource + action pattern for consistency and expandability
