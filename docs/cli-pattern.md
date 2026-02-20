# CLI Pattern: Resource + Action

This document explains the command structure used in `@fob/cli`.

## Pattern

```
fob <resource> <action> [target] [options]
```

## Rationale

We chose the **resource + action** pattern because it is:

1. **Intuitive** — Matches mental model of "what thing" then "what to do with it"
2. **Discoverable** — Each level shows available options
3. **Expandable** — Easy to add new resources and actions
4. **Consistent** — Same pattern across all commands

## Industry Precedent

This pattern is used by popular CLIs:

| CLI | Pattern | Example |
|-----|---------|---------|
| kubectl | `<action> <resource>` | `kubectl get pods` |
| gh (GitHub) | `<resource> <action>` | `gh repo create` |
| docker | `<resource> <action>` | `docker container ls` |
| aws | `<service> <action>` | `aws s3 ls` |
| gcloud | `<resource> <action>` | `gcloud compute instances list` |

We follow the `<resource> <action>` order (like `gh`, `docker`, `gcloud`) rather than `<action> <resource>` (like `kubectl`) because:

- Resources group related actions together
- Typing `fob steps` shows all step-related actions
- More natural for discoverability: "I want to work with steps... what can I do?"

## Command Hierarchy

```
fob
├── help                          Show global help
└── steps                         Work with step handlers
    ├── list                      List available steps
    └── run <slug>                Run a step locally
```

Future resources might include:

```
fob
├── steps                         (current)
├── processes                     Work with process definitions
│   ├── list
│   └── run <id>
├── config                        Manage CLI configuration
│   ├── show
│   └── init
└── worker                        Worker utilities
    └── status
```

## Explicit Actions

We require explicit actions rather than inferring from arguments:

```bash
# Explicit (what we do)
fob steps list
fob steps run alex/fetch_data

# Implicit (what we avoid)
fob steps                        # Does NOT default to list
fob steps alex/fetch_data        # Does NOT infer "run"
```

**Why explicit?**
- No ambiguity about what will happen
- Easier to add new actions without breaking existing behavior
- Clearer in scripts and documentation
- Consistent with principle of least surprise

## Help at Every Level

Each level shows contextual help:

```bash
fob                    # Shows resources
fob steps              # Shows actions for steps
fob steps run          # Shows usage for run action
```

## Target and Options

After the action, we have optional target and options:

```bash
fob steps run alex/fetch_data          # target only
fob steps run alex/fetch_data --dry    # target + option (future)
```

Options use double-dash convention:
- `--help`, `-h` — Show help
- `--verbose`, `-v` — Verbose output (future)
- `--dry-run` — Preview without execution (future)
