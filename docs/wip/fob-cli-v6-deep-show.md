# FOB CLI v6: Deep Show & Items

**Status:** Complete
**Created:** 2026-03-16

**Previous:** [fob-cli-v5-tags.md](fob-cli-v5-tags.md) (complete)

## Summary

Expand `show` commands to expose the full depth of processes, work records, and items — reports, step outputs, supporting documents, activity logs, and linked entities. Add `items list`, `items show`, and `processes run` (trigger remote execution for an item). Add `supporting-docs` as a new resource. All output is structured text readable by both humans and LLMs.

---

## Background

Currently `fob processes show` and `fob work-records show` dump the raw API JSON. The orchestrator web UI surfaces much richer detail — reports, supporting documents with content, step outputs per step, activity timelines, configured processes per item with run buttons — but none of this is accessible from the CLI.

Three gaps:

1. **Orchestrator API** — The work record GET response omits `report`, `step_outputs`, and supporting documents. EventLogs have no API routes. SupportingDocuments have no individual-fetch endpoint. No cross-entity endpoints for process↔item links.
2. **CLI** — `show` commands output raw JSON with no section filtering or human-readable formatting. No `items list` or `items show`. No way to trigger a process run for an item.
3. **Actions** — The web UI lets you trigger a process run on an item (the "Run" button). The orchestrator has `POST /api/v1/processes/:id/run` but the CLI has no command to call it.

---

## New & Updated Commands

### Process Show — Include Related Entities

```bash
fob processes show <id>                    # process definition (current behavior, now formatted)
fob processes show <id> --work-records     # include recent work records for this process
fob processes show <id> --items            # include items linked to this process
fob processes show <id> --all              # include everything
fob processes show <id> --json             # raw JSON (preserves current behavior)
```

### Process Run — Trigger Remote Execution

```bash
fob processes run <process-id> --item <item-id>    # trigger a process run for an item
```

This calls `POST /api/v1/processes/:id/run` (already exists in the orchestrator). Returns the created work record ID so you can follow up with `fob work-records show`.

### Work Record Show — Section Flags

Mirrors the tabs in the orchestrator web UI.

```bash
fob work-records show <id>                       # overview (formatted summary)
fob work-records show <id> --report              # include report
fob work-records show <id> --supporting-docs     # list supporting documents
fob work-records show <id> --steps               # include step outputs
fob work-records show <id> --activity            # include activity log
fob work-records show <id> --all                 # all sections
fob work-records show <id> --json                # raw JSON
```

Flags are combinable:

```bash
fob work-records show <id> --report --steps      # report + step outputs
```

### Items — List, Show & Linked Entities

Mirrors the item view page in the orchestrator web UI.

```bash
fob items list                                   # list all items
fob items list --type <type>                     # filter by type (e.g. msa_file, invoice)
fob items list --status <status>                 # filter by status
fob items list --tag <name>                      # filter by tag
fob items list --json                            # raw JSON
fob items show <id>                              # item details (formatted)
fob items show <id> --processes                  # configured processes with execution counts
fob items show <id> --work-records               # execution history
fob items show <id> --all                        # include everything
fob items show <id> --json                       # raw JSON
```

### Supporting Docs — New Resource

```bash
fob supporting-docs show <doc-id>                # show document content
fob supporting-docs show <doc-id> --save <path>  # download binary file to disk
fob supporting-docs show <doc-id> --json         # raw JSON with metadata
```

---

## Output Format

All `show` and `list` commands switch from raw JSON to **structured text** by default. This format works for both humans scanning output in a terminal and LLMs processing CLI output. Use `--json` for raw API response.

### Process Show (default)

```
Process: IcdiWfWi0EFS
Name: Monthly Debt & Equity Monitoring
Short Code: monthly_debt_equity
Status: enabled
Tags: high-priority, monthly
Dependencies: none
Applies To: bank_statement

Steps (3):
  1. nowapps2/extract_msa_data
  2. nowapps2/validate_and_normalize
  3. nowapps2/sync_msa_sheet

Schedule: 0 9 1 * * (Asia/Kolkata) — enabled
```

### Process Show --work-records

```
Process: IcdiWfWi0EFS
Name: Monthly Debt & Equity Monitoring
...

--- Recent Work Records ---

ID              STATUS      ITEM                                      CREATED
ohoZbe5QUSSS    Completed   NTPL Service Agreement - Kutchina (1)     2026-03-15 10:23:01
k9xYp2mNqR4S    Failed      Acme Corp Master Agreement                2026-03-14 08:11:45
rT3vWx8LmQ7N    Completed   Vendor Invoice Batch 2026-03              2026-03-13 14:02:30

Showing 3 most recent. Use `fob work-records list --process IcdiWfWi0EFS` for full list.
```

### Process Show --items

```
Process: IcdiWfWi0EFS
Name: Monthly Debt & Equity Monitoring
...

--- Items ---

ID              TYPE            NAME                                      RUNS
jK4mNp2qR8sT    msa_file       NTPL Service Agreement - Kutchina (1)     3
xY7vWz1LmQ4N    msa_file       Acme Corp Master Agreement                2
```

### Process Run

```
Triggered: extract_and_validate_msa
Item:      NTPL Service Agreement - Kutchina (1).pdf (YMkhTBMlt4X4)
Work Record: ohoZbe5QUSSS

Use `fob work-records show ohoZbe5QUSSS` to check status.
```

### Items List

```
ID              TYPE            STATUS    NAME                                      CREATED
YMkhTBMlt4X4    msa_file       active    NTPL Service Agreement - Kutchina (1)     2026-03-13 19:44:00
xY7vWz1LmQ4N    msa_file       active    Acme Corp Master Agreement                2026-03-14 08:11:45
pQ3rSt6uVw9X    invoice        active    INV-2026-0342                             2026-03-13 14:02:30

Total: 3 items
```

### Items Show (default)

```
Item: YMkhTBMlt4X4

Name:         NTPL Service Agreement - Kutchina (1).pdf
Type:         msa_file
Status:       active
External ID:  msa_file:9597e4c687e256c119f8b93bf11537edfd6e45530de31...
Tags:         —
Created:      2026-03-13 19:44:00

Metadata:
  file_hash: 9597e4c687e256c119f8b93bf11537edfd6e45530de3172bdfd3c32a6c789d1d
  file_path: C:\Users\sanka\OneDrive\Desktop\client\...

Configured Processes: 4
Work Records: 15

Use --processes, --work-records, or --all for linked entities.
```

### Items Show --processes

```
Item: YMkhTBMlt4X4
Name: NTPL Service Agreement - Kutchina (1).pdf
...

--- Configured Processes ---

SHORT CODE                    NAME                              RUNS    LAST RUN
P2  extract_and_validate_msa  Extract and Validate MSA           3      2026-03-16 12:58:00
P5  transform_and_finalize    Transform and Finalize MSA         7      2026-03-16 12:58:00
P7  generate_invoice          Generate Invoice                   4      2026-03-15 10:23:01
AP2 extract_msa               Extract MSA                        1      2026-03-16 12:58:00

Use `fob processes run <process-id> --item YMkhTBMlt4X4` to trigger a run.
```

### Items Show --work-records

```
Item: YMkhTBMlt4X4
Name: NTPL Service Agreement - Kutchina (1).pdf
...

--- Execution History ---

ID              PROCESS                    STATUS      STARTED               COMPLETED
ohoZbe5QUSSS    extract_msa                Completed   2026-03-16 12:58:00   2026-03-16 13:00:00
k9xYp2mNqR4S    extract_msa                Running     2026-03-16 12:58:00   —
rT3vWx8LmQ7N    extract_msa                Running     2026-03-15 19:59:00   —
aB3cDe4fGh5I    extract_msa                Running     2026-03-15 19:55:00   —
jK6lMn7oPq8R    extract_msa                Failed      2026-03-15 17:41:00   2026-03-15 17:41:00

Showing 5 most recent. Use `fob work-records list --item YMkhTBMlt4X4` for full list.
```

### Work Record Show (default — overview)

```
Work Record: ohoZbe5QUSSS                                    Completed

Item:      NTPL Service Agreement - Kutchina (1).pdf          msa_file
Process:   extract_msa
Assigned:  Alex
Duration:  1m
Tags:      high-priority, monthly
Created:   2026-03-15 10:23:01
Completed: 2026-03-15 10:24:01

Steps:     3 completed, 0 failed
Docs:      3 supporting documents
Activity:  19 entries

Use --report, --steps, --supporting-docs, --activity, or --all for details.
```

### Work Record Show --report

```
Work Record: ohoZbe5QUSSS                                    Completed

--- Report ---

[report markdown content rendered as-is]
```

### Work Record Show --steps

```
Work Record: ohoZbe5QUSSS                                    Completed

--- Step Outputs (3) ---

## nowapps2/extract_msa_data

{
  "parties": ["NTPL", "Kutchina"],
  "effective_date": "2024-01-15",
  ...
}

## nowapps2/validate_and_normalize

{
  "status": "valid",
  "warnings": [],
  ...
}

## nowapps2/sync_msa_sheet

{
  "appended": 0,
  "updated": 0,
  "unchanged": 0
}
```

### Work Record Show --supporting-docs

```
Work Record: ohoZbe5QUSSS                                    Completed

--- Supporting Documents (3) ---

ID              STEP                                TYPE        TITLE
sD1kLm3nPq5R    nowapps2/extract_msa_data           markdown    Extraction Summary
sD7xYz2wVu8T    nowapps2/validate_and_normalize     markdown    Validation Report
sD4rSt6qWe9P    nowapps2/sync_msa_sheet             markdown    MSA Sheet Sync

Use `fob supporting-docs show <id>` to view document content.
```

### Work Record Show --activity

```
Work Record: ohoZbe5QUSSS                                    Completed

--- Activity (19) ---

2026-03-15 10:24:01    step.completed       nowapps2/sync_msa_sheet
2026-03-15 10:23:55    step.started         nowapps2/sync_msa_sheet
2026-03-15 10:23:50    step.completed       nowapps2/validate_and_normalize
2026-03-15 10:23:40    step.started         nowapps2/validate_and_normalize
2026-03-15 10:23:35    step.completed       nowapps2/extract_msa_data
2026-03-15 10:23:10    step.started         nowapps2/extract_msa_data
2026-03-15 10:23:01    run.created          —
...
```

### Supporting Docs Show

```
Supporting Document: sD1kLm3nPq5R

Title:        Extraction Summary
Step:         nowapps2/extract_msa_data
Type:         markdown
Work Record:  ohoZbe5QUSSS
Created:      2026-03-15 10:23:35

--- Content ---

[markdown content rendered as-is]
```

For `type: file`, output metadata and note the file type:

```
Supporting Document: sD9aBc4dEf6G

Title:        Source Invoice Scan
Step:         nowapps2/extract_invoice
Type:         file (application/pdf, 245 KB)
Work Record:  ohoZbe5QUSSS
Created:      2026-03-15 10:23:35

Content: Binary file — use --save <path> to download.
```

---

## New Orchestrator API Endpoints

### Expand Work Record GET Response

The existing `GET /api/v1/work-records/:id` returns only public fields. Add an `include` query parameter to optionally return heavy fields.

**`GET /api/v1/work-records/:id?include=report,step_outputs,supporting_docs`**

| Include Value | Field Added | Source |
|---------------|-------------|--------|
| `report` | `report` (text) | `WorkRecords.report` column |
| `step_outputs` | `step_outputs` (object) | `WorkRecords.step_outputs` JSONB column |
| `supporting_docs` | `supporting_docs` (array) | `SupportingDocuments` table, joined by `work_record_id` |

When `supporting_docs` is included, return metadata only (not content):

```json
{
  "data": {
    "id": "ohoZbe5QUSSS",
    "status": "completed",
    "report": "# Extraction Report\n...",
    "step_outputs": {
      "nowapps2/extract_msa_data": { ... },
      "nowapps2/validate_and_normalize": { ... }
    },
    "supporting_docs": [
      {
        "id": "sD1kLm3nPq5R",
        "title": "Extraction Summary",
        "step_slug": "nowapps2/extract_msa_data",
        "type": "markdown",
        "created_at": "2026-03-15T10:23:35Z"
      }
    ],
    ...
  }
}
```

### Work Record Activity

**`GET /api/v1/work-records/:id/activity`**

Queries EventLogs for events related to this work record.

```json
{
  "data": [
    {
      "event": "step.completed",
      "action_type": "complete",
      "properties": { "step_slug": "nowapps2/sync_msa_sheet" },
      "user": null,
      "created_at": "2026-03-15T10:24:01Z"
    }
  ]
}
```

Filter EventLogs where `properties->work_record_id = :id` OR `object = 'work_record'` with matching ID.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/work-records/:id/activity` | List activity events for a work record |

### Supporting Documents

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/supporting-docs/:id` | Get document metadata + content |

**Response (markdown type):**

```json
{
  "data": {
    "id": "sD1kLm3nPq5R",
    "work_record_id": "ohoZbe5QUSSS",
    "title": "Extraction Summary",
    "step_slug": "nowapps2/extract_msa_data",
    "type": "markdown",
    "content": "# Extraction Summary\n\n...",
    "created_at": "2026-03-15T10:23:35Z"
  }
}
```

**Response (file type):**

```json
{
  "data": {
    "id": "sD9aBc4dEf6G",
    "work_record_id": "ohoZbe5QUSSS",
    "title": "Source Invoice Scan",
    "step_slug": "nowapps2/extract_invoice",
    "type": "file",
    "filename": "invoice-scan.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 250880,
    "created_at": "2026-03-15T10:23:35Z"
  }
}
```

File content is NOT returned in JSON. For binary download:

**`GET /api/v1/supporting-docs/:id/download`** — Returns raw file with `Content-Type` and `Content-Disposition` headers.

### Cross-Entity Endpoints

Items linked to a process (and vice versa) are tracked in the `ItemProcesses` join table.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/processes/:id/items` | List items that have been run through this process |
| `GET` | `/api/v1/items/:id/processes` | List processes configured on this item |

**`GET /api/v1/processes/:id/items`** — Returns items from `ItemProcesses` join with item details:

```json
{
  "data": [
    {
      "id": "YMkhTBMlt4X4",
      "type": "msa_file",
      "name": "NTPL Service Agreement - Kutchina (1).pdf",
      "execution_count": 3,
      "last_executed_at": "2026-03-15T10:23:01Z"
    }
  ]
}
```

**`GET /api/v1/items/:id/processes`** — Returns processes from `ItemProcesses` join with process details:

```json
{
  "data": [
    {
      "id": "IcdiWfWi0EFS",
      "name": "Extract and Validate MSA",
      "short_code": "extract_and_validate_msa",
      "execution_count": 3,
      "last_executed_at": "2026-03-16T12:58:00Z"
    }
  ]
}
```

### Process Run (already exists — no changes needed)

`POST /api/v1/processes/:id/run` already exists in the orchestrator. Accepts `{ "item_id": "..." }` and returns `{ "status": "success", "work_record_id": "...", "job_id": "..." }`. The CLI just needs a command to call it.

---

## Implementation Plan

### Phase 1: Orchestrator API — Expand Work Record Response

**Repo:** `apps/orchestrator.finopsbricks.com`

1. [ ] Update `GET /api/v1/work-records/:id` route to accept `?include=` query parameter
   - Parse comma-separated include values: `report`, `step_outputs`, `supporting_docs`
   - When `report` included: add `report` field to response
   - When `step_outputs` included: add `step_outputs` field to response
   - When `supporting_docs` included: query `SupportingDocuments` table by `work_record_id`, return metadata array (no content)
   - Default (no include): current behavior unchanged

### Phase 2: Orchestrator API — Activity & Supporting Docs Endpoints

**Repo:** `apps/orchestrator.finopsbricks.com`

1. [ ] Add `GET /api/v1/work-records/:id/activity` route
   - Query `EventLogs` where `properties.work_record_id = :id`
   - Return array of event objects sorted by `created_at` desc
2. [ ] Add `GET /api/v1/supporting-docs/:id` route
   - Return document metadata + content (for markdown type)
   - Omit `file_content` BLOB from JSON response
3. [ ] Add `GET /api/v1/supporting-docs/:id/download` route
   - Return raw binary with `Content-Type` and `Content-Disposition` headers
   - 404 if type is `markdown` (use GET for content instead)

### Phase 3: Orchestrator API — Cross-Entity Endpoints

**Repo:** `apps/orchestrator.finopsbricks.com`

1. [ ] Add `GET /api/v1/processes/:id/items` route
   - Join `ItemProcesses` with `Items` table
   - Return item details with `execution_count` and `last_executed_at`
2. [ ] Add `GET /api/v1/items/:id/processes` route
   - Join `ItemProcesses` with `Processes` table
   - Return process details with `execution_count` and `last_executed_at`

### Phase 4: CLI — Output Formatting Utilities

**Repo:** `cli`

1. [ ] Create `src/utils/format.js` — shared formatting helpers
   - `formatHeader(label, id, status)` — top line with right-aligned status
   - `formatField(label, value)` — left-aligned label: value pair
   - `formatTable(headers, rows)` — simple ASCII table with column alignment
   - `formatSection(title, content)` — `--- Title ---` section divider
   - `formatDate(iso)` — human-readable date
   - `formatDuration(start, end)` — human-readable duration

### Phase 5: CLI — Enhanced Process Show

**Repo:** `cli`

1. [ ] Add `getProcessItems(processId)` to `src/utils/orchestrator.js`
2. [ ] Rewrite `src/cli/processes/show.js` — formatted output with section flags
   - Default: formatted process summary (name, short_code, status, tags, steps list, schedule)
   - `--work-records`: fetch `listWorkRecords({ process: id })`, append table
   - `--items`: fetch `getProcessItems(id)`, append table
   - `--all`: all sections
   - `--json`: raw JSON (current behavior)
3. [ ] Register new options in `src/cli/index.js` for `processes show`

### Phase 6: CLI — Process Run

**Repo:** `cli`

1. [ ] Add `runProcess(processId, itemId)` to `src/utils/orchestrator.js`
   - Calls `POST /api/v1/processes/:id/run` with `{ "item_id": itemId }`
2. [ ] Create `src/cli/processes/run.js` — `runProcessHandler(argv)`
   - Requires `--item <id>` flag (process may require an item based on `applies_to`)
   - Calls `runProcess(processId, itemId)`
   - Prints work record ID and follow-up hint
3. [ ] Register `processes run <id>` in `src/cli/index.js`
   - Options: `--item <id>` (required)
   - Update shell completion

### Phase 7: CLI — Items List & Show

**Repo:** `cli`

1. [ ] Add `getItemProcesses(itemId)` to `src/utils/orchestrator.js`
2. [ ] Create `src/cli/items/list.js` — formatted item list
   - Default: formatted table (id, type, status, name, created)
   - `--type <type>`: filter by item type
   - `--status <status>`: filter by status
   - `--tag <name>`: filter by tag
   - `--json`: raw JSON
3. [ ] Create `src/cli/items/show.js` — formatted output with section flags
   - Default: formatted summary (name, type, status, external_id, tags, metadata)
   - `--processes`: fetch `getItemProcesses(id)`, append table with execution_count
   - `--work-records`: fetch `listWorkRecords({ item: id })`, append table
   - `--all`: all sections
   - `--json`: raw JSON
4. [ ] Register `items list` and `items show` in `src/cli/index.js` with options
   - Update shell completion

### Phase 8: CLI — Enhanced Work Record Show

**Repo:** `cli`

1. [ ] Add `getWorkRecordActivity(id)` to `src/utils/orchestrator.js`
2. [ ] Rewrite `src/cli/work-records/show.js` — formatted output with section flags
   - Default: formatted overview (item, process, status, duration, tags, section counts)
   - `--report`: fetch work record with `?include=report`, output report text
   - `--supporting-docs`: fetch with `?include=supporting_docs`, output table
   - `--steps`: fetch with `?include=step_outputs`, output per-step sections
   - `--activity`: fetch `getWorkRecordActivity(id)`, output timeline
   - `--all`: all sections
   - `--json`: raw JSON
3. [ ] Register new options in `src/cli/index.js` for `work-records show`

### Phase 9: CLI — Supporting Docs Resource

**Repo:** `cli`

1. [ ] Add `getSupportingDoc(id)` and `downloadSupportingDoc(id, path)` to `src/utils/orchestrator.js`
2. [ ] Create `src/cli/supporting-docs/show.js`
   - Markdown type: print metadata header + content
   - File type: print metadata + "use --save to download" message
   - `--save <path>`: download binary file to disk
   - `--json`: raw JSON
3. [ ] Register `supporting-docs` resource in `src/cli/index.js`
   - Action: `show <id>` with `--save <path>` and `--json` options
   - Update shell completion

### Phase 10: CLI — `--json` Flag on All Show/List Commands

All `show` and `list` commands currently output raw JSON. After reformatting:

1. [ ] Ensure `--json` flag on all `show` and `list` commands outputs the raw API response
2. [ ] Document the `--json` flag in help text

### Phase 11: Tests

1. [ ] Orchestrator: Tests for `?include=` parameter on work record GET
2. [ ] Orchestrator: Tests for activity endpoint
3. [ ] Orchestrator: Tests for supporting-docs endpoints
4. [ ] Orchestrator: Tests for process-items and item-processes endpoints
5. [ ] CLI: Tests for `src/utils/format.js`
6. [ ] CLI: Tests for enhanced `processes/show.js`
7. [ ] CLI: Tests for `processes/run.js`
8. [ ] CLI: Tests for `items/list.js` and `items/show.js`
9. [ ] CLI: Tests for enhanced `work-records/show.js`
10. [ ] CLI: Tests for `supporting-docs/show.js`
11. [ ] CLI: Tests for new orchestrator client methods

---

## Design Decisions

### Flags on `show` for sections, not sub-actions

`fob work-records report <id>` would make `report` an action verb, but it's a noun — a section of the entity. Flags on `show` keep the `resource action target options` shape and allow combining sections: `--report --steps`.

### `?include=` query parameter, not separate endpoints for report/steps

Report and step outputs are columns on the WorkRecord model — not separate entities. A query parameter on the existing GET route is simpler than creating sub-resource routes for fields. The `include` pattern is well-established (JSON:API, GraphQL-style includes).

Activity and supporting docs ARE separate entities (EventLogs, SupportingDocuments tables), so they get their own endpoints.

### `fob processes run`, not `fob items run`

The process is the thing being executed — the item is the input. `fob processes run <process-id> --item <item-id>` reads naturally: "run this process on this item." This also avoids confusion with `fob steps run` (local step execution) by keeping `run` as a process-level action.

### `--json` for raw output

The default switches from raw JSON to structured text. `--json` preserves the current behavior for scripts and programmatic consumers. This follows the `gh` CLI pattern where `gh pr view` shows formatted text and `gh pr view --json` outputs JSON.

### `--all` as shorthand

`--all` avoids typing `--report --steps --supporting-docs --activity`. It's a convenience flag, not a different mode.

### `supporting-docs` as a resource, not flags on work-records

You need to fetch a specific document by its own ID. `fob work-records show <wr-id> --document <doc-id>` would overload `show` with a second positional-ish argument. A separate resource keeps things clean: list via `--supporting-docs` flag, read via `fob supporting-docs show <id>`.

### Binary file download via `--save`

Binary content (PDFs, images) can't be printed to stdout usefully. `--save <path>` downloads to disk. Markdown content prints directly since it's text.

### Structured text output for human + LLM readability

Not raw JSON (hard for humans to scan), not fancy terminal UI with colors and box-drawing (hard for LLMs to parse). Plain structured text with clear section headers (`--- Title ---`), aligned columns, and consistent formatting works well for both audiences.

### Cross-entity endpoints via `ItemProcesses` join table

`GET /api/v1/processes/:id/items` and `GET /api/v1/items/:id/processes` both use the `ItemProcesses` join table. This returns `execution_count` and `last_executed_at` which a simple filter on the items/processes list endpoint wouldn't provide. Dedicated sub-resource routes are the right call.

---

## Open Questions

1. **Activity log completeness** — EventLogs stores events with `properties.work_record_id`. Do all relevant events consistently include this property? Need to verify the logging coverage before building the activity endpoint.

---

## Files to Add/Modify

### Orchestrator (`apps/orchestrator.finopsbricks.com`)

| File | Changes |
|------|---------|
| `src/app/api/v1/work-records/[id]/route.js` | Add `?include=` parameter support for report, step_outputs, supporting_docs |
| `src/app/api/v1/work-records/[id]/activity/route.js` | **New** — GET handler for work record activity |
| `src/app/api/v1/supporting-docs/[id]/route.js` | **New** — GET handler for document metadata + content |
| `src/app/api/v1/supporting-docs/[id]/download/route.js` | **New** — GET handler for binary file download |
| `src/app/api/v1/processes/[id]/items/route.js` | **New** — GET handler for items linked to process |
| `src/app/api/v1/items/[id]/processes/route.js` | **New** — GET handler for processes linked to item |

### CLI (`cli`)

| File | Changes |
|------|---------|
| `src/utils/format.js` | **New** — Shared formatting helpers (header, field, table, section, date, duration) |
| `src/utils/orchestrator.js` | Add `runProcess()`, `getProcessItems()`, `getItemProcesses()`, `getWorkRecordActivity()`, `getSupportingDoc()`, `downloadSupportingDoc()` |
| `src/cli/processes/show.js` | Rewrite — formatted output, `--work-records`, `--items`, `--all`, `--json` flags |
| `src/cli/processes/run.js` | **New** — Trigger remote process execution with `--item` flag |
| `src/cli/items/list.js` | **New** — Formatted item list with `--type`, `--status`, `--tag`, `--json` filters |
| `src/cli/items/show.js` | **New** — Formatted item details, `--processes`, `--work-records`, `--all`, `--json` flags |
| `src/cli/work-records/show.js` | Rewrite — formatted output, `--report`, `--steps`, `--supporting-docs`, `--activity`, `--all`, `--json` flags |
| `src/cli/supporting-docs/show.js` | **New** — Show document content with `--save` and `--json` flags |
| `src/cli/index.js` | Register `supporting-docs` resource, `items list`/`show`, `processes run`, add flags to `processes show` and `work-records show`, update shell completion |
| `tests/utils/format.test.js` | **New** — Tests for formatting helpers |
| `tests/cli/processes/show.test.js` | **New** — Tests for enhanced process show |
| `tests/cli/processes/run.test.js` | **New** — Tests for process run command |
| `tests/cli/items/list.test.js` | **New** — Tests for items list |
| `tests/cli/items/show.test.js` | **New** — Tests for items show |
| `tests/cli/work-records/show.test.js` | **New** — Tests for enhanced work record show |
| `tests/cli/supporting-docs/show.test.js` | **New** — Tests for supporting docs show |

---

## Updated Command Map (v6)

```
fob
├── steps
│   ├── list                              List available step handlers
│   └── run <slug>                        Run a step locally
├── processes
│   ├── list                              List processes from orchestrator
│   │   └── --tag <name>                  Filter by tag
│   ├── show <id>                         Show process definition (formatted)
│   │   ├── --work-records                Include recent work records
│   │   ├── --items                       Include linked items
│   │   ├── --all                         Include everything
│   │   └── --json                        Raw JSON output
│   ├── run <id>                          Trigger remote process execution
│   │   └── --item <id>                   Item to run the process on
│   ├── edit <id>                         Modify a process
│   ├── pull <id>                         Pull process to local file
│   ├── push <id>                         Push local file to orchestrator
│   └── update-step-metadata              Sync step names from code
├── work-records
│   ├── list                              List recent work records
│   ├── show <id>                         Show work record details (formatted)
│   │   ├── --report                      Include report
│   │   ├── --supporting-docs             List supporting documents
│   │   ├── --steps                       Include step outputs
│   │   ├── --activity                    Include activity log
│   │   ├── --all                         Include everything
│   │   └── --json                        Raw JSON output
│   └── edit <id>                         Modify a work record
├── items
│   ├── list                              List items
│   │   ├── --type <type>                 Filter by type
│   │   ├── --status <status>             Filter by status
│   │   ├── --tag <name>                  Filter by tag
│   │   └── --json                        Raw JSON output
│   ├── show <id>                         Show item details (formatted)
│   │   ├── --processes                   Include configured processes
│   │   ├── --work-records                Include execution history
│   │   ├── --all                         Include everything
│   │   └── --json                        Raw JSON output
│   └── edit <id>                         Modify an item
├── tags
│   ├── list                              List all tags in org
│   ├── create <name>                     Create a tag
│   ├── edit <id>                         Edit a tag
│   └── delete <id>                       Delete a tag
├── supporting-docs  (NEW)
│   └── show <id>                         Show document content
│       ├── --save <path>                 Download binary file to disk
│       └── --json                        Raw JSON output
├── config
│   └── show                              Show current configuration
├── worker
│   └── status                            Check orchestrator connection
└── completion                            Output shell completion script
```

---

## Related

- [fob-cli-v5-tags.md](fob-cli-v5-tags.md) — v5 implementation (complete)
- [fob-cli-v4-process-pull-push.md](fob-cli-v4-process-pull-push.md) — v4 (complete)
- [cli-design-style.md](/docs/cli-design-style.md) — CLI command structure and conventions
