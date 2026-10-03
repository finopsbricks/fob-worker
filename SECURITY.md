# Security policy

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/finopsbricks/fob-worker/security/advisories/new),
not in a public issue.

fob-worker runs on your machine against a local worker repository. It reads the repository's
`.env` (for example `ORCHESTRATOR_API_KEY` and `ORCHESTRATOR_API_SECRET`) but does not send
those credentials anywhere itself; step handlers you run with `steps run` may call remote
systems.

If you think an Orchestrator API key was exposed, revoke it in the Orchestrator and issue a
new one.
