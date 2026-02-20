# CLAUDE.md

Guidance for Claude Code when working with this package.

## Overview

`@fob/cli` is a developer CLI for FinOpsBricks process engine workers. It provides commands for local step debugging without duplicating code across worker repos.

Built with **yargs** for command parsing and shell completion.

## Commands

Pattern: `fob <resource> <action> [target] [options]`

```bash
fob steps list                              # List available steps
fob steps run alex/fetch_account_freshness  # Run a step locally
fob completion                              # Output shell completion script
fob --help                                  # Show help
```

See `docs/cli-pattern.md` for design rationale.

## Shell Completion

```bash
# Bash (add to ~/.bashrc)
source <(fob completion)

# Zsh (add to ~/.zshrc)
source <(fob completion)
```

Tab completion works for:
- `fob <tab>` → resources (steps)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs

## Package Structure

```
bin/
  fob.js                  # CLI entry point
src/
  cli.js                  # yargs command definitions
  utils/
    config.js             # Load .fob.json + defaults
    steps-loader.js       # Dynamic import of steps registry
    output.js             # Save/load step outputs
    templates.js          # Template resolution
docs/
  cli-pattern.md          # CLI design rationale
```

## Configuration

The CLI uses conventions by default:
- Steps registry: `./src/steps/index.js`
- Temp directory: `./temp/`
- Environment: `./.env`

Workers can override via `.fob.json`:
```json
{
  "stepsPath": "./src/steps/index.js",
  "tempDir": "./temp"
}
```

## Installation

```bash
# Global install
npm install -g @fob/cli

# Development (link from repo)
npm link
```

## Template Resolution

Config files (`temp/<slug>.config.json`) support:
- `{{env.VAR_NAME}}` - environment variable
- `{{org/step_name.field}}` - field from another step's output

## Standards

- ES modules throughout (`"type": "module"`)
- snake_case for config keys
- camelCase for functions
- yargs for command parsing
