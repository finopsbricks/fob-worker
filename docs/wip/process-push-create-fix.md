# Fix Process Push Classification & Add `processes create` Command

## Status: COMPLETE

Fix the process push flow so create-vs-update is decided by JSON content (presence of `id` field), not by filename convention (`__` separator). Also add a dedicated `fob processes create <filename>` command for creating a single process at a time.

---

## Problem Statement

`fob processes push --all` classifies files as "existing" or "new" based on whether the filename contains `__`:

- `AP1__document_intake.json` → has `__` → treated as existing → **PUT update** → 404 because no `id` in JSON
- `AP1_document_intake.json` → no `__` → treated as new → **POST create** → works

This is fragile. The JSON content already has the answer: if `id` is present, it's existing; if not, it's new. The filename convention should be cosmetic only.

Additionally, there's no way to create a single new process — `push --all` creates all new files at once, and `push <id>` only works for existing processes.

## Proposed Solution

Two changes in the CLI codebase (`/Users/alex/ec2code/finopsbricks/cli`):

### Change 1: Content-based classification in `process-files.js`

Replace filename-based filtering with JSON content inspection.

### Change 2: Add `fob processes create <filename>` command

A dedicated command that creates a single process from a local JSON file. Fails if the file already has an `id` (already exists on server).

---

## Implementation Phases

### Phase 1: Fix `listLocalProcesses()` and `listNewProcessFiles()` ✅

**File**: `src/utils/process-files.js`

- [x] `listLocalProcesses()`: Read all `.json` files, return IDs from those that have an `id` field
- [x] `listNewProcessFiles()`: Read all `.json` files, return filenames of those without an `id` field
- [x] Remove dependency on `__` separator for classification logic
- [x] Keep `buildFilename()` using `__` for cosmetic naming (no change needed)

### Phase 2: Consolidate push to use content-based routing ✅

Instead of a separate `create` command, unified all paths through `pushByFilename()`:

**File**: `src/cli/processes/push.js`

- [x] Single `pushByFilename(filename)` function: has `id` → PUT update, no `id` → POST create
- [x] Removed `pushExistingProcess()` — no longer needed
- [x] `push <filename>` resolves directly
- [x] `push <id|short_code>` resolves via `findProcessFile()` → filename → `pushByFilename()`
- [x] `push --all` uses `listAllProcessFiles()` → `pushByFilename()` for each

**File**: `src/utils/process-files.js`

- [x] Exported `findProcessFile()` (was internal)
- [x] Added `listAllProcessFiles()` — returns all `.json` filenames

### Phase 3: Cleanup dead code ✅

- [x] Removed `extractPrefixFromFilename` — dead code
- [x] Removed `listNewProcessFiles` — replaced by `listAllProcessFiles`
- [x] Fixed `findProcessFile` content scan to not skip files without `__`

### Phase 4: Test & verify ✅

- [x] Test: file with `__` in name but no `id` → `push --all` creates it (not 404)
- [x] Test: file with `__` in name and `id` → `push --all` updates it
- [x] Test: `fob processes push AP1__document_intake.json` → creates (no `id` in JSON)
- [x] Test: `fob processes push AP1` → resolves via short_code prefix, creates or updates based on content

## Related Files

- `src/utils/process-files.js` — `listLocalProcesses()`, `listNewProcessFiles()` classification logic
- `src/cli/processes/push.js` — push handler, `pushNewProcess()`, `pushExistingProcess()`
- `src/cli/index.js` — command registration (processes group starts ~line 107)
