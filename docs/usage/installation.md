# Installation

How to install and set up the `fob` CLI.

## Development Install (Recommended)

Clone and link from the monorepo:

```bash
git clone git@github.com:finopsbricks/cli.git
cd cli
npm install
npm link
```

Verify:
```bash
fob --help
```

## Shell Completion

Tab completion is enabled per-shell. Add to your shell config and restart.

**Bash** (`~/.bashrc`): for linux
```bash
source <(fob completion)
```

**Zsh** (`~/.zshrc`): for mac
```bash
source <(fob completion)
```

After restarting your shell:
```bash
fob <tab>                  # → steps, config, processes, work-records, worker
fob steps <tab>            # → list, run
fob steps run <tab>        # → step slugs from current worker
fob processes <tab>        # → list, show, pull, push, update-step-metadata
```

## Running from a Worker Repo

The CLI is designed to run from inside a worker directory. It looks for:
- `./src/steps/index.js` — step registry (convention-based)
- `./.env` — environment variables (loaded automatically)
- `./temp/` — step outputs (created automatically)

```bash
cd /path/to/workers/worker-alex
fob steps list
```

## Related Notes

- [Command Reference](/docs/usage/commands.md)
- [Configuration Reference](/docs/usage/configuration.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
