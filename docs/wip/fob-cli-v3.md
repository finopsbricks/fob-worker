# @fob/cli v3 — WIP

Local process execution and enhanced debugging.

**Repo:** https://github.com/finopsbricks/cli

**Previous:** [fob-cli-v2.md](fob-cli-v2.md) (complete)

---

## New Commands

### Process Execution

```bash
fob processes run <id>      # Fetch process definition, run steps locally in sequence
```

---

## Implementation Plan

### Phase 1: Local Process Execution

1. [ ] `fob processes run <id>` — Fetch process definition from orchestrator, run each step locally

**Challenges:**
- Steps may require orchestrator context (`work_record.id`, `item_snapshot`)
- Need to mock or simulate work record for local execution
- Config templates (`{{env.VAR}}`, `{{step/slug.field}}`) need resolution

**Approach options:**
1. Create mock work record locally, chain step outputs
2. Require `--item <id>` flag to fetch real item snapshot
3. Support `--dry-run` to show what would execute without running

---

## Open Questions

1. **Orchestrator context** — How to handle steps that need `work_record.id` or `item_snapshot`?
2. **Step failures** — Continue to next step or abort on failure?
3. **Output storage** — Save all step outputs to temp dir for inspection?

---

## Related

- [fob-cli-v2.md](fob-cli-v2.md) — v2 implementation (complete)
- [fob-cli.md](fob-cli.md) — v1 implementation (complete)
