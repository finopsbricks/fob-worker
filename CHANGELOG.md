# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

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
