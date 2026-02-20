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

## Shell Completion

Enable tab completion by adding to your shell config:

```bash
# Bash (~/.bashrc)
source <(fob completion)

# Zsh (~/.zshrc)
source <(fob completion)
```

Then restart your shell or run `source ~/.zshrc`.

**Tab completion works for:**
- `fob <tab>` → resources (steps)
- `fob steps <tab>` → actions (list, run)
- `fob steps run <tab>` → step slugs from current worker

## Usage

Run commands from a worker directory (e.g., `workers/worker-alex`):

```bash
# List available steps
fob steps list

# Run a step
fob steps run alex/fetch_account_freshness

# Show help
fob --help
fob steps --help
```

## How It Works

1. **Steps registry** — Loads steps from `./src/steps/index.js`
2. **Previous output** — Auto-loads from `./temp/<previous_step>.json`
3. **Config templates** — Resolves `{{env.VAR}}` and `{{step/slug.field}}`
4. **Output** — Saves to `./temp/<step_slug>.json`

### Example Flow

```bash
# Step 1: Fetch data (output saved to temp/)
fob steps run alex/fetch_account_freshness

# Step 2: Generate email (auto-loads step 1 output)
fob steps run alex/generate_freshness_email

# Step 3: Send email (uses config with template resolution)
fob steps run alex/send_email
```

### Config Files

For steps that need config (like `send_email`), create `temp/<slug>.config.json`:

```json
{
  "to": "{{env.EMAIL_RECIPIENTS}}",
  "subject": "{{alex/generate_freshness_email.subject}}",
  "html": "{{alex/generate_freshness_email.html}}"
}
```

## Configuration

The CLI uses sensible defaults. Override with `.fob.json` in your worker directory:

```json
{
  "stepsPath": "./src/steps/index.js",
  "tempDir": "./temp"
}
```

## Command Pattern

```
fob <resource> <action> [target] [options]
```

See [docs/cli-pattern.md](docs/cli-pattern.md) for design rationale.
