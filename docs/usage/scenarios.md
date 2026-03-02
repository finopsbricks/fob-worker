# Scenarios

Reusable test configs for running a step with the same input repeatedly.

## When to Use

Use scenarios when you want a fixed, repeatable config that isn't tied to a specific process — for example, a "happy path" case or an edge case you want to test regularly.

## Creating a Scenario

Create a JSON file with the step config:

```
.orchestrator/scenarios/<org>__<step_name>/<scenario-name>.json
```

Example for `alex/send_email`:

```bash
mkdir -p .orchestrator/scenarios/alex__send_email
```

```json
// .orchestrator/scenarios/alex__send_email/happy-path.json
{
  "to": "test@example.com",
  "subject": "Test email",
  "html": "<p>Hello</p>"
}
```

## Running with a Scenario

```bash
fob steps run alex/send_email --scenario happy-path
```

Or select from the interactive picker when running without flags.

## Templates in Scenarios

Scenario files support the same template syntax as process configs:

```json
{
  "to": "{{env.TEST_EMAIL}}",
  "subject": "{{alex/generate_email.subject}}"
}
```

## Directory Convention

The step slug's `/` is replaced with `__` in the directory name:
- Slug `alex/send_email` → directory `alex__send_email`

This matches the same convention used for step output files in `temp/`.

## Related Notes

- [Running Steps Locally](/docs/usage/running-steps.md)
- [Process Sync](/docs/usage/process-sync.md)
- [Process Files Layout](/docs/architecture/process-files-layout.md)
- [Template Resolution](/docs/architecture/template-resolution.md)
