# CLI Design Style Guide

Design principles and conventions for `@fob/cli`. Consult this when adding new commands.

## Core Pattern

```
fob <resource> <action> [target] [options]
```

Every command follows this shape. No exceptions.

## Resources

Resources are top-level nouns representing the thing you're working with.

```bash
fob steps ...
fob processes ...
fob work-records ...
fob items ...
fob tags ...
fob config ...
fob worker ...
```

Typing `fob <resource>` shows all available actions for that resource.

## Actions

Actions are verbs that operate on a resource. Standard actions:

| Action | Purpose | Example |
|--------|---------|---------|
| `list` | List all instances | `fob processes list` |
| `show` | Show one instance in detail | `fob processes show <id>` |
| `create` | Create a new instance | `fob tags create <name>` |
| `edit` | Modify an existing instance | `fob processes edit <id> --add-tag x` |
| `delete` | Remove an instance | `fob tags delete <id>` |
| `pull` | Download from orchestrator to local | `fob processes pull <id>` |
| `push` | Upload from local to orchestrator | `fob processes push <id>` |
| `run` | Execute locally | `fob steps run <slug>` |

Not every resource needs every action. Only add what's useful.

## Explicit Actions — No Inference

Always require the action. Never infer it from arguments.

```bash
# Correct
fob steps list
fob steps run alex/fetch_data

# Wrong — no default action
fob steps                        # shows help, does NOT default to list
fob steps alex/fetch_data        # error, does NOT infer "run"
```

This eliminates ambiguity and makes scripts self-documenting.

## Relationships: Flags on `edit`, Not Nested Actions

When an entity has relationships to other entities (tags, assignments, etc.), manage them as **flags on `edit`** — not as standalone actions or sub-resources.

```bash
# Correct — follows gh CLI pattern
fob processes edit <id> --add-tag high-priority
fob processes edit <id> --remove-tag monthly
fob processes edit <id> --add-tag urgent --remove-tag low-priority

# Wrong — creates a new action just for the relationship
fob processes tag <id> high-priority
fob processes untag <id> monthly

# Wrong — puts target before action, breaks resource-action order
fob processes <id> tag high-priority

# Wrong — overloads unrelated resource with filtering
fob tags list --process <id>
```

**Why flags on `edit`?**

1. **Stays flat** — Keeps the `resource action target options` shape. No nested sub-commands.
2. **Scales** — Future editable fields (name, description, is_enabled) are more flags on the same command.
3. **Composable** — Can add a tag and remove another in a single call.
4. **Precedent** — GitHub CLI uses this exact pattern: `gh issue edit 23 --add-label bug --remove-label stale`.

Repeatable flags for multiple values:

```bash
fob processes edit <id> --add-tag a --add-tag b --remove-tag c
```

## Standalone Resource CRUD vs. Relationship Management

There are two separate concerns:

**1. CRUD on the resource itself** — standalone commands:
```bash
fob tags list                                    # List all tags
fob tags create high-priority --color '#ef4444'  # Create a tag
fob tags delete <id>                             # Delete a tag
```

**2. Linking a resource to an entity** — flags on the entity's `edit`:
```bash
fob processes edit <id> --add-tag high-priority  # Link tag to process
```

These are separate because they do different things. `fob tags create` creates the tag definition. `fob processes edit --add-tag` creates the association.

## Options

Options use double-dash convention with short aliases where useful:

```bash
--help, -h          # Show help
--all               # Apply to all (e.g., fob processes pull --all)
--color '#hex'      # Tag color
--description '...' # Description text
--add-tag <name>    # Add a tag (repeatable)
--remove-tag <name> # Remove a tag (repeatable)
--limit <n>         # Pagination limit
--status <s>        # Filter by status
--process <id>      # Filter by process
```

**Boolean flags** — no value needed: `--all`, `--empty`
**Value flags** — require a value: `--color '#ef4444'`, `--limit 10`
**Repeatable flags** — can appear multiple times: `--add-tag a --add-tag b`

## Help at Every Level

Every level of the command hierarchy shows contextual help:

```bash
fob                        # Shows all resources
fob processes              # Shows all actions for processes
fob processes edit         # Shows usage and flags for edit
```

## Naming Conventions

- **Resources**: plural nouns, kebab-case (`work-records`, not `workRecords`)
- **Actions**: singular verbs (`list`, `show`, `create`, `edit`, `delete`)
- **Targets**: the ID or slug of the entity being acted on
- **Options**: kebab-case with `--` prefix (`--add-tag`, not `--addTag`)

## Industry Precedent

| CLI | Pattern | Example |
|-----|---------|---------|
| gh (GitHub) | `<resource> <action>` | `gh issue edit 23 --add-label bug` |
| docker | `<resource> <action>` | `docker container ls` |
| gcloud | `<resource> <action>` | `gcloud compute instances list` |
| aws | `<service> <action>` | `aws s3 ls` |
| kubectl | `<action> <resource>` | `kubectl get pods` (opposite order) |

We follow the `<resource> <action>` order like `gh`, `docker`, and `gcloud`.

## Current Command Map

```
fob
├── steps
│   ├── list                              List available step handlers
│   └── run <slug>                        Run a step locally
│       ├── --process <id>                Use config from process
│       ├── --scenario <name>             Use config from scenario file
│       └── --empty                       Use empty config
├── processes
│   ├── list                              List processes from orchestrator
│   ├── show <id>                         Show process definition
│   ├── edit <id>                         Modify a process
│   │   ├── --add-tag <name>              Add tag (repeatable)
│   │   └── --remove-tag <name>           Remove tag (repeatable)
│   ├── pull <id>                         Pull process to local file
│   │   └── --all                         Pull all processes
│   ├── push <id>                         Push local file to orchestrator
│   │   └── --all                         Push all local processes
│   └── update-step-metadata              Sync step names from code
├── work-records
│   ├── list                              List recent work records
│   │   ├── --limit <n>                   Max results
│   │   ├── --status <s>                  Filter by status
│   │   └── --process <id>               Filter by process
│   ├── show <id>                         Show work record details
│   └── edit <id>                         Modify a work record
│       ├── --add-tag <name>              Add tag (repeatable)
│       └── --remove-tag <name>           Remove tag (repeatable)
├── items
│   └── edit <id>                         Modify an item
│       ├── --add-tag <name>              Add tag (repeatable)
│       └── --remove-tag <name>           Remove tag (repeatable)
├── tags
│   ├── list                              List all tags in org
│   ├── create <name>                     Create a tag
│   │   ├── --color '#hex'                Tag color (default: #6b7280)
│   │   └── --description '...'           Tag description
│   └── delete <id>                       Delete a tag
├── config
│   └── show                              Show current configuration
├── worker
│   └── status                            Check orchestrator connection
└── completion                            Output shell completion script
```

## Related

- [Architecture](/docs/architecture/) — Internal design notes
- [Usage](/docs/usage/) — How-to guides
