# Process Push --force: Upsert with Client-Specified ID

## Status: IN PROGRESS (~80%)

Add a `--force` flag to `fob processes push` that creates a process when the ID doesn't exist remotely (404 on PUT). Requires the orchestrator API to accept a client-specified `id` on POST, so the same config file works across environments without ID drift.

---

## Problem Statement

When a process config is committed with an `id` (e.g. after being created in dev), pushing to a different environment (staging/prod) fails with 404 because that ID doesn't exist there. The only workaround is to manually strip the `id` and re-create, which assigns a new ID — making committed configs environment-specific.

**Current behavior**: `fob processes push CP5` → PUT `/api/v1/processes/{id}` → 404 → error

**Desired behavior**: `fob processes push CP5 --force` → PUT returns 404 → fall back to POST with same `id` → process created with that exact ID

## Proposed Solution

Two changes across two repos:

### 1. Orchestrator API: Accept client-specified `id` on process creation

**Repo**: `/Users/alex/ec2code/finopsbricks/apps/orchestrator.finopsbricks.com`
**File**: `src/app/api/v1/processes/route.js`

- Accept optional `id` field in POST body
- Validate format (e.g. length, charset) — reject if it doesn't meet nanoid criteria
- Reject with 409 if the ID already exists
- Fall back to `nanoid(12)` if no `id` provided (backward compatible)
- Update API docs

### 2. CLI: Add `--force` flag to `processes push`

**Repo**: `/Users/alex/ec2code/finopsbricks/cli`
**Files**: `src/cli/index.js`, `src/cli/processes/push.js`

- Add `--force` / `-f` option to `push` command
- On 404 during PUT: if `--force`, strip `id` from local proc, POST with `id` in body → server creates with that exact ID
- Update local file with server response (in case server normalizes anything)

---

## Implementation Phases

### Phase 1: Orchestrator API — accept client `id` on POST ✅

- [x] Modify POST handler to read optional `id` from request body
- [x] Validate `id` format (alphanumeric, 1-24 chars)
- [x] Check uniqueness — return 409 if ID already exists
- [x] Use client `id` or generate `nanoid(12)` if not provided
- [x] Update API docs for POST `/api/v1/processes`

### Phase 2: CLI — add `--force` flag ✅

- [x] Add `--force` / `-f` option in `index.js` command definition
- [x] Pass `force` through to `pushByFilename()`
- [x] On 404 during update + `--force`: call `createProcess()` with `id` included in payload
- [x] Update local file via `finalizeNewProcessFile()` if needed
- [x] Update CLI usage/help text

### Phase 3: Test ❌

- [ ] Test: `push CP5 --force` when ID doesn't exist → creates with same ID
- [ ] Test: `push CP5 --force` when ID exists → normal update (no change)
- [ ] Test: `push CP5` without `--force` when ID doesn't exist → 404 error (unchanged behavior)
- [ ] Test: `push --all --force` → upserts all processes
- [ ] Test: POST with duplicate `id` → 409

## Related Files

- `cli/src/cli/processes/push.js` — push handler
- `cli/src/cli/index.js` — command registration (~line 202)
- `cli/src/utils/orchestrator.js` — API client (`createProcess`, `updateProcess`)
- `orchestrator/src/app/api/v1/processes/route.js` — POST handler (line ~199, nanoid generation)
