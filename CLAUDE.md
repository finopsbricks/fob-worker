# CLAUDE.md

Guidance for Claude Code when working with this package.

## Overview

`@fob/cli` is a developer CLI for FinOpsBricks process engine workers. It provides commands for local step debugging without duplicating code across worker repos.

## Commands

```bash
fob step <slug>    # Run a step locally
fob steps          # List available steps
fob help           # Show help
```

## Package Structure

```
bin/
  fob.js              # CLI entry point
src/
  cli.js              # Command router
  commands/
    step.js           # fob step <slug>
    steps.js          # fob steps
  utils/
    config.js         # Load .fob.json + defaults
    steps-loader.js   # Dynamic import of steps registry
    output.js         # Save/load step outputs
    templates.js      # Template resolution
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
