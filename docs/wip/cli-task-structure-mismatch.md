# CLI Task Structure Mismatch — COMPLETE

The `fob steps run` CLI provides a different task structure than the orchestrator, causing steps to work locally but fail in production.

**Context:** `data_freshness_report` process failed in production with "Missing account freshness data from previous step" despite passing all local tests and `fob steps run` working correctly.

**Status:** ✅ Complete — Both steps and CLI updated to use orchestrator structure.

---

## The Problem

Steps written against the CLI's task structure fail when run by the orchestrator.

| Field | CLI currently provides | Orchestrator provides |
|-------|------------------------|----------------------|
| Previous step output | `task.previous_output` | `task.work_record.step_outputs['org/step_slug']` |
| Step config | `task.config` | `task.step.config` |
| Step slug | (not provided) | `task.step.slug` |
| Work record ID | `task.work_record_id` | `task.work_record.id` |
| Item snapshot | (not provided) | `task.work_record.item_snapshot` |
| Org ID | (not provided) | `task.org_id` |

---

## Actual Orchestrator Task Structure

Captured from production logs:

```javascript
{
  "step_queue_id": "NBr8COVhQ2xE",
  "step": {
    "slug": "alex/send_email",
    "config": {
      "to": "recipient@example.com",
      "subject": "Data Freshness Report - Feb 20, 2026",
      "html": "<html>...</html>",
      "text": "..."
    }
  },
  "work_record": {
    "id": "HJdT3p3Z5rJ5",
    "item_snapshot": null,
    "step_outputs": {
      "alex/fetch_account_freshness": {
        "report_date": "2026-02-20",
        "accounts": [...],
        "total_accounts": 11,
        "accounts_needing_action": 10
      },
      "alex/generate_freshness_email": {
        "subject": "Data Freshness Report - Feb 20, 2026",
        "html": "...",
        "text": "..."
      }
    }
  },
  "org_id": "jz6IzjiBwhke"
}
```

---

## Orchestrator Task Typedef (Source of Truth)

From `@fob/lib-worker/src/index.js`:

```javascript
/**
 * @typedef {object} Task
 * @property {string} step_queue_id - StepQueue ID for reporting completion
 * @property {object} step - Step definition
 * @property {string} step.slug - Step slug (e.g., 'alex/fetch_data')
 * @property {object} step.config - Step configuration from process definition
 * @property {object} work_record - Work record context
 * @property {string} work_record.id - Work record ID
 * @property {object} work_record.item_snapshot - Primary entity being processed
 * @property {Object<string, object>} work_record.step_outputs - Outputs from previous steps keyed by slug
 * @property {string} org_id - Organization ID
 */
```

---

## Steps Fixed (in worker-alex)

| Step | Old pattern | New pattern |
|------|-------------|-------------|
| `generate_freshness_email` | `task.previous_output` | `task.work_record?.step_outputs?.['alex/fetch_account_freshness']` |
| `send_email` | `task.config` | `task.step?.config` |

Tests also updated to use orchestrator structure.

---

## CLI Implementation Plan

### Goal

`fob steps run <slug>` should construct a task that matches the orchestrator's structure exactly.

### Current CLI behavior (to change)

```javascript
// Current (wrong)
const task = {
  work_record_id: 'local-test',
  previous_output: loadedFromTempFile,
  config: loadedFromConfigFile,
};
```

### New CLI behavior (target)

```javascript
// New (matches orchestrator)
const task = {
  step_queue_id: `local-${Date.now()}`,
  step: {
    slug: step_slug,                    // e.g., 'alex/send_email'
    config: loadConfigFile(step_slug),  // from temp/<slug>.config.json
  },
  work_record: {
    id: `local-wr-${Date.now()}`,
    item_snapshot: loadItemSnapshot(),  // from temp/item_snapshot.json or null
    step_outputs: loadAllStepOutputs(), // all temp/<slug>.json files as map
  },
  org_id: process.env.WORKER_ORG,
};
```

### Files to modify in `@fob/cli`

1. **`src/commands/steps/run.js`** — Main logic for constructing task
2. **`src/utils/output.js`** — Loading step outputs from temp files

### Step-by-step implementation

1. **Load all previous step outputs as a map:**
   ```javascript
   // Scan temp/ for all *.json files (except *.config.json)
   // Build: { 'alex/fetch_data': {...}, 'alex/generate_email': {...} }
   function loadAllStepOutputs(tempDir) {
     const outputs = {};
     const files = fs.readdirSync(tempDir).filter(f =>
       f.endsWith('.json') && !f.endsWith('.config.json')
     );
     for (const file of files) {
       const slug = file.replace('__', '/').replace('.json', '');
       outputs[slug] = JSON.parse(fs.readFileSync(path.join(tempDir, file)));
     }
     return outputs;
   }
   ```

2. **Load step config:**
   ```javascript
   // Load from temp/<slug>.config.json
   function loadStepConfig(tempDir, slug) {
     const configFile = path.join(tempDir, `${slug.replace('/', '__')}.config.json`);
     if (fs.existsSync(configFile)) {
       return JSON.parse(fs.readFileSync(configFile));
     }
     return {};
   }
   ```

3. **Construct task:**
   ```javascript
   const task = {
     step_queue_id: `local-${Date.now()}`,
     step: {
       slug: stepSlug,
       config: loadStepConfig(tempDir, stepSlug),
     },
     work_record: {
       id: `local-wr-${Date.now()}`,
       item_snapshot: null,
       step_outputs: loadAllStepOutputs(tempDir),
     },
     org_id: process.env.WORKER_ORG || 'local',
   };
   ```

4. **Remove old convenience patterns:**
   - Remove `task.previous_output`
   - Remove `task.config`
   - Remove `task.work_record_id`

---

## Testing the CLI Update

After updating CLI:

```bash
# Step 1: No dependencies, should work
fob steps run alex/fetch_account_freshness

# Step 2: Needs step_outputs['alex/fetch_account_freshness']
fob steps run alex/generate_freshness_email

# Step 3: Needs step.config
fob steps run alex/send_email
```

All three should work without code changes to the steps.

---

## Related

- **Config variable resolution:** `docs/wip/config-variable-resolution.md` — Where to resolve `{{env.*}}` templates
- **CLI repo:** https://github.com/finopsbricks/cli
- **lib-worker typedef:** `/Users/alex/ec2code/finopsbricks/lib/lib-worker/src/index.js`
