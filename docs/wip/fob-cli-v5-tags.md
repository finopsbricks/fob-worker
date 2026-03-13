# FOB CLI v5: Tag Management

**Status:** WIP
**Created:** 2026-03-11

**Previous:** [fob-cli-v4-process-pull-push.md](fob-cli-v4-process-pull-push.md) (complete)

## Summary

Add tag management to the CLI — CRUD for tags, linking/unlinking tags to processes, items, and work records, and including tags in the process pull/push workflow. Push auto-creates missing tags.

---

## Background

The orchestrator has a `tags` table and a polymorphic `entity_tags` join table that links tags to processes, items, and work records. The web UI manages associations via Next.js server actions, but there are **no REST API endpoints** for tag associations — only CRUD on the tags themselves.

This means two things need to happen:
1. **Orchestrator** — New REST API endpoints for tag associations
2. **CLI** — New commands for tag management + update pull/push to include tags

---

## New Commands

### Tags

```bash
fob tags list                                    # List all tags in org
fob tags create <name> [--color '#hex'] [--description '...']
fob tags delete <id>
```

### Entity Tag Associations (via `edit`)

Following the [GitHub CLI pattern](https://cli.github.com/manual/gh_issue_edit) — tag associations are flags on `edit`, not standalone actions.

```bash
# Processes
fob processes edit <id> --add-tag <tag-name>     # Add tag to process
fob processes edit <id> --remove-tag <tag-name>  # Remove tag from process

# Items
fob items edit <id> --add-tag <tag-name>         # Add tag to item
fob items edit <id> --remove-tag <tag-name>      # Remove tag from item

# Work Records
fob work-records edit <id> --add-tag <tag-name>       # Add tag to work record
fob work-records edit <id> --remove-tag <tag-name>    # Remove tag from work record
```

Multiple tags in one call:

```bash
fob processes edit <id> --add-tag high-priority --add-tag monthly
fob processes edit <id> --add-tag high-priority --remove-tag low-priority
```

### Updated Commands

```bash
fob processes show <id>                          # Now includes tags
fob processes pull <id>                          # Now includes tags in local file
fob processes push <id>                          # Now syncs tags + auto-creates missing tags
fob work-records show <id>                       # Now includes tags
```

---

## Process File Format Change

Process files in `.orchestrator/processes/` gain a `tags` field:

```json
{
  "id": "IcdiWfWi0EFS",
  "name": "Monthly Debt & Equity Monitoring",
  "tags": ["high-priority", "monthly"],
  "dependencies": [],
  "applies_to": [],
  "is_enabled": true,
  "steps": [ ... ]
}
```

**Tags are stored by name, not ID** — names are unique per org and more readable. The CLI resolves name ↔ ID when talking to the API.

---

## New Orchestrator API Endpoints

### Entity Tag Associations

Same pattern for all three entity types: processes, items, work records.

| Method | Route | Permission | Purpose |
|--------|-------|------------|---------|
| `GET` | `/api/v1/processes/:id/tags` | `processes:read` | List tags on a process |
| `PUT` | `/api/v1/processes/:id/tags` | `processes:edit` | Set tags on a process (full replace) |
| `GET` | `/api/v1/items/:id/tags` | `items:read` | List tags on an item |
| `PUT` | `/api/v1/items/:id/tags` | `items:edit` | Set tags on an item (full replace) |
| `GET` | `/api/v1/work-records/:id/tags` | `work_records:read` | List tags on a work record |
| `PUT` | `/api/v1/work-records/:id/tags` | `work_records:edit` | Set tags on a work record (full replace) |

**GET /api/v1/{entity-type}/:id/tags**

```json
{
  "data": [
    { "id": "tag_abc", "name": "high-priority", "color": "#ef4444" },
    { "id": "tag_def", "name": "monthly", "color": "#6b7280" }
  ]
}
```

**PUT /api/v1/{entity-type}/:id/tags**

Request body — array of tag IDs:

```json
{ "tags": ["tag_abc", "tag_def"] }
```

Response — updated tag list:

```json
{
  "data": [
    { "id": "tag_abc", "name": "high-priority", "color": "#ef4444" },
    { "id": "tag_def", "name": "monthly", "color": "#6b7280" }
  ]
}
```

The PUT replaces all tags on the entity. This keeps push logic simple — the CLI sends the full desired state rather than computing add/remove diffs.

### Tags CRUD (already exists, document only)

| Method | Route | Permission | Purpose |
|--------|-------|------------|---------|
| `GET` | `/api/v1/tags` | `tags:read` | List all tags with usage counts |
| `POST` | `/api/v1/tags` | `tags:create` | Create a tag |
| `GET` | `/api/v1/tags/:id` | `tags:read` | Get tag details |
| `PUT` | `/api/v1/tags/:id` | `tags:edit` | Update tag (name, color, description) |
| `DELETE` | `/api/v1/tags/:id` | `tags:delete` | Delete tag + cascade associations |

---

## Implementation Plan

### Phase 1: Orchestrator API — Entity Tag Endpoints

**Repo:** `apps/orchestrator.finopsbricks.com`

Shared handler pattern — all three entity types use the same logic with `entity_type` parameter.

1. [ ] Create shared helper `getEntityTags(org, entityType, entityId)` and `setEntityTags(org, entityType, entityId, tagIds)`
2. [ ] Add `GET /api/v1/processes/:id/tags` route
3. [ ] Add `PUT /api/v1/processes/:id/tags` route
   - Accept `{ tags: [tag_id, ...] }`
   - Delete existing `EntityTags` for this process, insert new ones
   - Return updated tag list
4. [ ] Add `GET /api/v1/items/:id/tags` route
5. [ ] Add `PUT /api/v1/items/:id/tags` route
6. [ ] Add `GET /api/v1/work-records/:id/tags` route
7. [ ] Add `PUT /api/v1/work-records/:id/tags` route

### Phase 2: Orchestrator API — Enhance Process Response

1. [ ] Update `GET /api/v1/processes/:id` to include `tags` in response
   - Add `tags` array (tag objects with id, name, color) to process response
2. [ ] Update `GET /api/v1/processes` (list) to include `tags` per process
   - Same tag objects, nested in each process

### Phase 3: CLI — Tag Commands

**Repo:** `cli`

1. [ ] Add `listTags()`, `createTag(data)`, `deleteTag(id)` to `src/utils/orchestrator.js`
2. [ ] Add `getEntityTags(entityType, entityId)`, `setEntityTags(entityType, entityId, tagIds)` to `src/utils/orchestrator.js`
3. [ ] Add shared `resolveTagName(name)` helper — looks up tag by name, returns ID
4. [ ] Add shared `ensureTag(name)` helper — resolves tag by name, auto-creates with default color if missing, returns ID
5. [ ] Add `fob tags list` command
6. [ ] Add `fob tags create <name>` command (with `--color`, `--description` options)
7. [ ] Add `fob tags delete <id>` command
8. [ ] Add `fob processes edit <id>` command with `--add-tag` and `--remove-tag` flags
   - `--add-tag`: call `ensureTag(name)` to get ID (auto-creates if missing)
   - `--remove-tag`: resolve tag name → ID, remove from list
   - Fetch current tags, apply adds/removes, call `setEntityTags('process', ...)`
9. [ ] Add `fob items edit <id>` command with `--add-tag` and `--remove-tag` flags
10. [ ] Add `fob work-records edit <id>` command with `--add-tag` and `--remove-tag` flags
11. [ ] Update `fob processes show` to display tags
12. [ ] Update `fob work-records show` to display tags

### Phase 4: CLI — Pull/Push with Tags

1. [ ] Update `fob processes pull` to include tags in local file
   - Fetch process (which now includes tags from Phase 2)
   - Write tag names (not IDs) to the `tags` field
2. [ ] Update `fob processes push` to sync tags
   - Read tag names from local file
   - For each name, call `ensureTag(name)` — auto-creates with default color if missing
   - Call `setEntityTags('process', ...)` after updating the process
   - Log created tags so the user knows what was auto-created
3. [ ] Update `saveProcess()` / `loadProcess()` in `process-files.js` if needed

### Phase 5: API Documentation

**Repo:** `apps/orchestrator.finopsbricks.com`

1. [ ] Create `content/docs/api/endpoints/tags/` directory
   - `index.mdx` — Tags overview
   - `list.mdx` — GET /api/v1/tags
   - `create.mdx` — POST /api/v1/tags
   - `get.mdx` — GET /api/v1/tags/:id
   - `update.mdx` — PUT /api/v1/tags/:id
   - `delete.mdx` — DELETE /api/v1/tags/:id
2. [ ] Create `content/docs/api/endpoints/processes/tags.mdx`
   - GET /api/v1/processes/:id/tags
   - PUT /api/v1/processes/:id/tags
3. [ ] Create `content/docs/api/endpoints/items/tags.mdx`
   - GET /api/v1/items/:id/tags
   - PUT /api/v1/items/:id/tags
4. [ ] Create `content/docs/api/endpoints/work-records/tags.mdx`
   - GET /api/v1/work-records/:id/tags
   - PUT /api/v1/work-records/:id/tags
5. [ ] Update `content/docs/api/endpoints/processes/get.mdx` — document `tags` in response
6. [ ] Update `content/docs/api/endpoints/processes/list.mdx` — document `tags` in response

### Phase 6: Tests

1. [ ] Orchestrator: Route tests for new tag endpoints
2. [ ] CLI: Unit tests for new orchestrator client methods
3. [ ] CLI: Unit tests for tag commands
4. [ ] CLI: Update process-files tests for tags field

---

## Design Decisions

### Tag names in process files, not IDs

Tag IDs are opaque (nanoid). Storing names makes files human-readable and diffable. Names are unique per org so there's no ambiguity.

### PUT (full replace) for process tags

Simpler than incremental add/remove. The CLI always knows the full desired state from the local file. Avoids race conditions with partial updates.

### Relationships as flags on `edit`, not standalone actions

Follows the [GitHub CLI pattern](https://cli.github.com/manual/gh_issue_edit) where `gh issue edit 23 --add-label bug` uses flags rather than `gh issue label add 23 bug`. This keeps the command structure flat (`resource action target options`) and scales naturally — future editable fields (name, description, is_enabled) become more flags on the same `edit` command.

See [CLI Design Style Guide](/docs/cli-design-style.md) for the full rationale.

### Auto-create missing tags on push

When `fob processes push` encounters a tag name that doesn't exist in the org, it auto-creates the tag with the default color (`#6b7280`). This avoids a two-step workflow (create then push) and keeps the process file as the source of truth. The CLI logs which tags were created so the user can customize color/description later via `fob tags create` or the web UI.

### Consistent `edit --add-tag/--remove-tag` across all entity types

All three entity types (processes, items, work records) get the same `edit` flags. The orchestrator API uses a shared handler pattern internally, and the CLI uses a shared `ensureTag()` + `setEntityTags()` flow.

---

## Remaining Work

### `fob tags update` command

The orchestrator already supports `PUT /api/v1/tags/:id` to update a tag's name, color, and description, but the CLI has no command to call it.

**Command:**

```bash
fob tags update <id> [--name <name>] [--color '#hex'] [--description '...']
```

At least one flag is required.

**Implementation:**

1. [ ] Add `updateTag(id, data)` to `src/utils/orchestrator.js` — `PUT /api/v1/tags/:id`
2. [ ] Create `src/cli/tags/update.js` — `updateTagHandler(argv)`
   - Validate at least one of `--name`, `--color`, `--description` is provided
   - Call `updateTag(id, { name, color, description })` (only non-undefined fields)
   - Print updated tag
3. [ ] Register `update` action in `src/cli/index.js` under `tags` resource
   - Options: `--name` (string), `--color` (string), `--description` (string)
   - Update shell completion for tags actions
4. [ ] Add `tests/cli/tags/update.test.js`
   - Success with single field
   - Success with multiple fields
   - Exit 1 when no flags provided
   - Exit 1 on API error
5. [ ] Update API docs: `content/docs/api/endpoints/tags/index.mdx` already references update — no changes needed

---

## Open Questions

1. **Tag filtering on list commands?** — Should `fob processes list --tag high-priority` filter processes by tag? Useful but requires orchestrator support (query param on list endpoint). Defer to future version?

---

## Files to Add/Modify

### Orchestrator (`apps/orchestrator.finopsbricks.com`)

| File | Changes |
|------|---------|
| `src/utils/entity-tags.js` | **New** — Shared `getEntityTags()` / `setEntityTags()` helpers |
| `src/app/api/v1/processes/[id]/tags/route.js` | **New** — GET and PUT handlers |
| `src/app/api/v1/items/[id]/tags/route.js` | **New** — GET and PUT handlers |
| `src/app/api/v1/work-records/[id]/tags/route.js` | **New** — GET and PUT handlers |
| `src/app/api/v1/processes/[id]/route.js` | Include tags in GET response |
| `src/app/api/v1/processes/route.js` | Include tags in list response |
| `content/docs/api/endpoints/tags/index.mdx` | **New** — Tags overview |
| `content/docs/api/endpoints/tags/list.mdx` | **New** — List tags docs |
| `content/docs/api/endpoints/tags/create.mdx` | **New** — Create tag docs |
| `content/docs/api/endpoints/tags/get.mdx` | **New** — Get tag docs |
| `content/docs/api/endpoints/tags/update.mdx` | **New** — Update tag docs |
| `content/docs/api/endpoints/tags/delete.mdx` | **New** — Delete tag docs |
| `content/docs/api/endpoints/processes/tags.mdx` | **New** — Process tag association docs |
| `content/docs/api/endpoints/items/tags.mdx` | **New** — Item tag association docs |
| `content/docs/api/endpoints/work-records/tags.mdx` | **New** — Work record tag association docs |
| `content/docs/api/endpoints/processes/get.mdx` | Update response example with tags |
| `content/docs/api/endpoints/processes/list.mdx` | Update response example with tags |

### CLI (`cli`)

| File | Changes |
|------|---------|
| `src/utils/orchestrator.js` | Add tag API methods (`listTags`, `createTag`, `deleteTag`, `getEntityTags`, `setEntityTags`) |
| `src/utils/tags.js` | **New** — `ensureTag()` and `resolveTagName()` helpers |
| `src/utils/process-files.js` | Handle `tags` field in process files |
| `src/cli/index.js` | Add tags resource, `edit` command with `--add-tag`/`--remove-tag` on processes/items/work-records |
| `tests/utils/orchestrator.test.js` | Tests for new API methods |
| `tests/utils/tags.test.js` | **New** — Tests for ensureTag/resolveTagName |
| `tests/utils/process-files.test.js` | Tests for tags in process files |

---

## Related

- [fob-cli-v4-process-pull-push.md](fob-cli-v4-process-pull-push.md) — v4 implementation (complete)
- [fob-cli-v3.md](fob-cli-v3.md) — v3 (WIP)
- [fob-cli-v2.md](fob-cli-v2.md) — v2 (complete)
