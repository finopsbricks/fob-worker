# Restructure README as Index, Deduplicate Usage Docs

## Status: COMPLETE

Separate concerns: README as index, `commands.md` for command inventory, workflow docs for workflows only.

---

## Problem Statement

README.md duplicated nearly every section in docs/usage/. Command listings were mixed into workflow docs (running-steps, process-sync). Work-records and worker-status had no docs at all.

## Proposed Solution

1. Create `docs/usage/commands.md` as single command inventory
2. Slim README to documentation index
3. Refactor workflow docs to remove command listings
4. Delete standalone command-only files (work-records.md, worker-status.md)

## Implementation Phases

### Phase 1: Create Command Reference ✅
- [x] Create `docs/usage/commands.md` — all commands grouped by resource

### Phase 2: Restructure README as Index ✅
- [x] README links to installation, configuration, commands, workflows, architecture
- [x] No duplicated content

### Phase 3: Separate Concerns in Workflow Docs ✅
- [x] `running-steps.md` — removed command listings, kept config picker, chaining, CLI injection
- [x] `process-sync.md` — removed command listings, kept typical workflow, metadata sync, file location
- [x] Deleted `work-records.md` — was just commands, now in commands.md
- [x] Deleted `worker-status.md` — was just commands, now in commands.md

### Phase 4: Cross-Link Audit ✅
- [x] All docs/usage/ files have 3-5 Related Notes links
- [x] Workflow docs link to commands.md
- [x] installation.md and configuration.md link to commands.md

## Related Files

- `README.md` — index
- `docs/usage/commands.md` — new, command inventory
- `docs/usage/running-steps.md` — refactored, workflow only
- `docs/usage/process-sync.md` — refactored, workflow only
- `docs/usage/installation.md` — updated cross-links
- `docs/usage/configuration.md` — updated cross-links
- `docs/usage/scenarios.md` — unchanged
