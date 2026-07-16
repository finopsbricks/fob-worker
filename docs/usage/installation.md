# Installation

How to install and set up the `fob` CLI.

## Development Install (Recommended)

Clone and link from the monorepo:

```bash
git clone git@github.com:finopsbricks/cli-fob.git
cd cli-fob
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
fob <tab>                  # → steps, config, stations, lines, workpieces, items, work-records, tags, worker
fob steps <tab>            # → list, run
fob steps run <tab>        # → step slugs from current worker
fob stations <tab>         # → list, show, status, run, pull, push, edit, update-step-metadata
fob tags <tab>             # → list, create, edit, delete
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
