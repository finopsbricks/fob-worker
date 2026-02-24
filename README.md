# @fob/cli

Developer CLI for FinOpsBricks process engine workers.

## Installation

```bash
# Clone and link (recommended for development)
git clone git@github.com:finopsbricks/cli.git
cd cli
npm install
npm link
```

### Shell Completion

Enable tab completion by adding to your shell config:

```bash
# Bash (~/.bashrc)
source <(fob completion)

# Zsh (~/.zshrc)
source <(fob completion)
```

Then restart your shell or run `source ~/.zshrc`.

**Tab completion works for:**
- `fob <tab>` → resources (steps, config, processes, work-records, worker)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs from current worker
- `fob processes <tab>` → actions (list, show, pull, push, update-step-metadata)

## Quick Start

Run commands from a worker directory (e.g., `workers/worker-alex`):

```bash
# Check connection to orchestrator
fob worker status

# List and run steps locally
fob steps list
fob steps run alex/fetch_account_freshness

# Work with processes
fob processes list
fob processes pull --all

# Show help
fob --help
```

## Commands

Pattern: `fob <resource> <action> [target] [options]`

### Steps

Debug step handlers locally without the full orchestrator.

```bash
fob steps list                              # List available steps
fob steps run <slug>                        # Run with interactive config picker
fob steps run <slug> --process <id>         # Use config from a process
fob steps run <slug> --scenario <name>      # Use config from a scenario file
fob steps run <slug> --empty                # Run with empty config
```

When running a step, the CLI:
1. Loads step definitions from `./src/steps/index.js`
2. Loads previous step outputs from `./temp/`
3. Resolves `{{env.VAR}}` and `{{org/step.field}}` templates in config
4. Saves output to `./temp/<slug>.json`

### Processes

Sync process definitions between orchestrator and local files.

```bash
fob processes list                          # List processes from orchestrator
fob processes show <id>                     # Show process definition
fob processes pull <id>                     # Pull single process to local
fob processes pull --all                    # Pull all processes
fob processes push <id>                     # Push single process to orchestrator
fob processes push --all                    # Push all local processes
fob processes update-step-metadata          # Sync step names from code to process files
```

Processes are stored in `.orchestrator/processes/<id>.json`.

### Work Records

View work records from the orchestrator.

```bash
fob work-records list                       # List recent work records
fob work-records list --limit 10            # Limit results
fob work-records list --status running      # Filter by status
fob work-records list --process <id>        # Filter by process
fob work-records show <id>                  # Show work record details
```

### Worker

Check worker connectivity and configuration.

```bash
fob worker status                           # Check connection to orchestrator
```

### Config

Manage CLI configuration.

```bash
fob config show                             # Show resolved configuration
fob config init                             # Create .fob.json interactively
```

## Configuration

The CLI uses sensible defaults. Override with `.fob.json` in your worker directory:

```json
{
  "stepsPath": "./src/steps/index.js",
  "tempDir": "./temp",
  "orchestrator": {
    "url": "https://orchestrator.finopsbricks.com",
    "org": "your-org"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ORCHESTRATOR_URL` | Orchestrator API URL |
| `ORCHESTRATOR_API_KEY` | API key for orchestrator |
| `WORKER_SECRET` | Worker authentication secret |
| `WORKER_ORG` | Organization ID |

## Example Workflow

```bash
# 1. Pull process definitions from orchestrator
fob processes pull --all

# 2. Run steps locally with process config
fob steps run alex/fetch_account_freshness --process proc_123

# 3. Chain steps (outputs auto-loaded from temp/)
fob steps run alex/generate_freshness_email --process proc_123
fob steps run alex/send_email --process proc_123

# 4. After editing process locally, push changes
fob processes push proc_123
```

## Scenarios

For repeatable test configs, create scenario files in `./scenarios/<step-slug>/<name>.json`:

```json
{
  "to": "test@example.com",
  "subject": "Test email"
}
```

Then run with: `fob steps run org/send_email --scenario test-email`

## Command Pattern

See [docs/cli-pattern.md](docs/cli-pattern.md) for design rationale.
