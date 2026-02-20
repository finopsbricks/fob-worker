# @fob/cli — COMPLETE

Developer CLI for FinOpsBricks process engine workers.

**Repo:** https://github.com/finopsbricks/cli (package name: `@fob/cli`)

**Goal:** Provide shared dev tooling that works across all worker repos without duplicating code.

---

## Commands

Pattern: `fob <resource> <action> [target] [options]`

Built with **yargs** for command parsing and shell completion.

### `fob steps list`

List available steps in current worker.

```bash
fob steps list

# Output:
# alex/
#   fetch_data
#   check_metadata
#   fetch_account_freshness
#   ...
```

### `fob steps run <slug>`

Run a step locally for debugging.

```bash
fob steps run alex/fetch_account_freshness
fob steps run alex/generate_freshness_email
fob steps run alex/send_email
```

### `fob completion`

Output shell completion script.

---

## Shell Completion

Enable tab completion:

```bash
# Add to ~/.zshrc or ~/.bashrc
source <(fob completion)
```

**Tab completion works for:**
- `fob <tab>` → resources (steps)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs from current worker

---

## Installation

```bash
# Clone and link
git clone git@github.com:finopsbricks/cli.git
cd cli
npm install
npm link

# Then enable completion
echo 'source <(fob completion)' >> ~/.zshrc
source ~/.zshrc
```

---

## Package Structure

```
@fob/cli/
├── package.json
├── bin/
│   └── fob.js                  # CLI entry point
├── src/
│   ├── cli.js                  # yargs command definitions
│   └── utils/
│       ├── config.js           # Load .fob.json + defaults
│       ├── steps-loader.js     # Dynamic import of steps registry
│       ├── output.js           # Save/load step outputs
│       └── templates.js        # Template resolution
├── docs/
│   └── cli-pattern.md          # CLI design rationale
└── README.md
```

---

## Implementation Plan

### Phase 1: Core CLI — Complete

1. [x] Create GitHub repo: `finopsbricks/cli`
2. [x] Initialize package with `"bin": { "fob": "./bin/fob.js" }`
3. [x] Implement config loader (`.fob.json` + defaults)
4. [x] Implement steps loader (dynamic import from cwd)
5. [x] Implement `fob steps list` command
6. [x] Implement `fob steps run <slug>` command
7. [x] Refactor to resource + action pattern
8. [x] Refactor to yargs with shell completion
9. [x] Test in worker-alex repo

### Phase 2: Cleanup Workers — Complete

1. [x] Remove `scripts/run-step.js` from worker-alex
2. [x] Update worker-alex package.json (remove `step` script)
3. [x] Other workers don't have run-step.js (was only in worker-alex)

### Phase 3: Documentation — Complete

1. [x] Add README to cli repo
2. [x] Update worker CLAUDE.md files to reference `fob` CLI
3. [x] Update step-testing-strategy.md

---

## Decisions Made

1. **CLI framework:** yargs (built-in completion, auto-generated help)
2. **Command pattern:** `fob <resource> <action>` (like gh, docker, gcloud)
3. **Explicit actions:** `fob steps list` not `fob steps` (clarity over brevity)
4. **dotenv:** CLI loads `.env` automatically
5. **Output format:** Flat files with `__` separator (`alex__fetch_data.json`)

---

## Future Commands (Out of Scope)

Ideas for later:

- `fob processes list` — List process definitions
- `fob processes run <id>` — Run full process locally
- `fob config show` — Show current configuration
- `fob config init` — Create `.fob.json`

---

## Configuration

### Defaults (zero config)

```
./src/steps/index.js    # exports { steps } - step registry
./temp/                  # step output directory
./.env                   # environment variables
```

### Optional `.fob.json`

```json
{
  "stepsPath": "./src/custom/steps.js",
  "tempDir": "./debug"
}
```

---

## Template Resolution

Config files (`temp/<slug>.config.json`) support:

```json
{
  "to": "{{env.EMAIL_RECIPIENTS}}",
  "subject": "{{alex/generate_freshness_email.subject}}",
  "html": "{{alex/generate_freshness_email.html}}"
}
```

**Patterns:**
- `{{env.VAR_NAME}}` — environment variable
- `{{step/slug.field}}` — field from another step's output file
