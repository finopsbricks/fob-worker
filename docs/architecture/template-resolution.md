# Template Resolution

How `{{env.VAR}}` and `{{org/step.field}}` placeholders in step configs are resolved.

## Delegation to lib-worker

The CLI does not implement template resolution itself. It delegates to `resolveConfig()` from `@fob/lib-worker`, ensuring the same resolution logic used in production workers applies locally.

```javascript
import { initTemplates, resolveConfig } from '@fob/lib-worker';

// Call once before running any steps — sets the base URL for template discovery
initTemplates('file:///path/to/worker/src/index.js');

// Resolve templates in a config object
const resolved = resolveConfig(rawConfig, step_outputs);
```

## Template Syntax

| Pattern | Resolves To |
|---------|------------|
| `{{env.VAR_NAME}}` | `process.env.VAR_NAME` |
| `{{org/step_name.field}}` | `step_outputs['org/step_name'].field` |

## initTemplates

`initTemplates` receives the worker's entry file URL. The base URL is used internally by lib-worker for any path-relative template lookups. In the CLI, it's set to `file://` + the resolved path of the worker's `src/index.js`.

## Where Templates Appear

Templates appear in step configs inside process definitions:

```json
{
  "to": "{{env.EMAIL_RECIPIENTS}}",
  "subject": "{{alex/generate_email.subject}}",
  "html": "{{alex/generate_email.html}}"
}
```

They are resolved before the step handler receives the config.

## Related Notes

- [Task Construction](/docs/architecture/task-construction.md)
- [Config Resolution](/docs/architecture/config-resolution.md)
- [Process Files Layout](/docs/architecture/process-files-layout.md)
- [Running Steps Locally](/docs/usage/running-steps.md)
