# Rename cli → cli-fob: fix references across the monorepo

## Status: IN PROGRESS (~20%)

The GitHub repo, local directory, and git remote for this CLI have already been
renamed from `finopsbricks/cli` (dir `cli/cli`) to `finopsbricks/cli-fob` (dir
`cli/cli-fob`). The binary name (`fob`) and npm scope are unaffected. What's
left is fixing every reference to the old name/path/URL — inside this repo and
across the rest of the monorepo — that documentation, handbooks, and other
repos still carry. Full sweep results below; open scope questions are at the
bottom and need answers before Phase 2+ starts.

---

## Problem Statement

`@fob/cli` / `finopsbricks/cli` is referenced by name, GitHub URL, npm package
name, or absolute path in ~25+ files across 9+ separate git repos (this repo,
`fde-handbook`, several `workers/*` repos, `team/*`, `vscode-helper`,
`delivery`, `apps/fob-watch`, and the sibling `cli-fobs` repo). Left as-is,
these become dead links/paths and confuse anyone (or any agent) following them
to the old repo name.

**Scope expanded 2026-07-16**: the npm package names are being renamed too,
not just the repo/URL/path. Both `cli-fob` and its sibling `cli-fobs` are
standalone CLIs installed globally via `npm link` — nothing in the monorepo
declares either as a `package.json` dependency (confirmed by grep), so
renaming the package name is safe.

## Proposed Solution

Fix references repo-by-repo, each its own commit (each is independent git
history — `cli-fob` CLAUDE.md forbids branching before committing, so commit
straight to each repo's current branch). Self-references in this repo first
(source of truth), then external repos in rough order of traffic/impact.

Patterns being replaced:
- `finopsbricks/cli` (GitHub repo/URL) → `finopsbricks/cli-fob`
- `git@github.com:finopsbricks/cli.git` → `git@github.com:finopsbricks/cli-fob.git`
- `@fob/cli` (npm package name) → `@fob/cli-fob`
- `@fob/fobs` (npm package name, sibling repo) → `@fob/cli-fobs`
- `/Users/alex/ec2code/finopsbricks/cli` (absolute path) → `.../cli/cli-fob`
- `../cli` (relative path from sibling dirs) → `../cli-fob`
- `cd cli` (post-clone) → `cd cli-fob`

**Not changing:** the `fob` and `fobs` binary/command names, or the CLI's
user-facing vocabulary. Only repo name/location and npm package names changed.

---

## Implementation Phases

### Phase 1: This repo (`cli-fob`) self-references ✅
- [x] `package.json` — `"name": "@fob/cli"` → `"@fob/cli-fob"`; `repository.url`:
      `git@github.com:finopsbricks/cli.git` → `...cli-fob.git`
- [x] `package-lock.json` — regenerated (`npm install --package-lock-only`) — no diff (lock file doesn't track root name/repo url)
- [x] `README.md:1` — `# @fob/cli` → `# @fob/cli-fob`
- [x] `CLAUDE.md:7` — `@fob/cli` → `@fob/cli-fob`
- [x] `src/index.js:2` — header comment `@fob/cli` → `@fob/cli-fob`
- [x] `docs/cli-design-style.md:3` — `@fob/cli` → `@fob/cli-fob`
- [x] `docs/usage/installation.md:10-11` — `git clone git@github.com:finopsbricks/cli.git` + `cd cli` → `cli-fob.git` + `cd cli-fob`
- [x] `.claude/settings.local.json` — checked, no old-path entries (unrelated pre-existing local diff, not touched)

- [x] `docs/wip/process-push-force-upsert.md:34` — active (~80%), path ref updated
- [x] `docs/wip/fix-dual-module-instance-bug.md:187,194` — active (~90%), headers say "CLI repo (`@fob/cli`)" → update package name to `@fob/cli-fob`

Completed/historical `docs/wip/*.md` files (`fob-cli.md`, `fob-cli-v2.md`,
`fob-cli-v3.md`, `cli-task-structure-mismatch.md`, `process-push-create-fix.md`)
are left as-is — dated snapshots, not updated.

### Phase 2: `handbooks/fde-handbook` ❌
- [ ] `implementation/how-things-work/station-push-chain.md` — 10 lines (120, 123, 128, 135, 145, 161, 169, 266, 272, 273), all `**File:** \`/Users/alex/ec2code/finopsbricks/cli/...\`` path refs
- [ ] `implementation/how-things-work/station-run-cli.md` — 3 lines (143, 146, 152), same style
- [ ] `implementation/step-patterns/step-debugging.md:11-12` — `git clone .../cli.git` + `cd cli`

### Phase 3: `workers/*` repos ❌
- [ ] `workers/worker-agilitas/docs/worker-orchestrator-runbook.md:24` — `@fob/cli` → `@fob/cli-fob`
- [ ] `workers/worker-alex/CLAUDE.md:48` — `https://github.com/finopsbricks/cli` → `.../cli-fob`
- [ ] `workers/worker-alex/docs/wip/fob-stations-delete.md:214` — absolute path ref (check if this WIP is still active)
- [ ] `workers/worker-newnowapps/CLAUDE.md:16` — relative path `../cli` → `../cli-fob`; `@fob/cli` → `@fob/cli-fob`
- [ ] `workers/worker-newnowapps/docs/WIP/station-nomenclature-migration-plan.md:45` — `github.com/finopsbricks/cli` → `cli-fob`
- [ ] `workers/worker-nowapps/docs/wip/old/cli-push-create-support.md` — lines 33, 229-232 (in a `docs/wip/old/` archive folder — likely skip, see open question)
- [ ] `workers/sankalp/worker-nowapps/docs/wip/old/cli-push-create-support.md` — duplicate of above, same call
- [ ] `workers/worker-nowapps/docs/todos/fob-processes-push-ergonomics.md:120` — prose "CLI repo"
- [ ] `workers/sankalp/worker-nowapps/docs/todos/fob-processes-push-ergonomics.md:120` — duplicate of above

### Phase 4: `team/*` docs ❌
- [ ] `team/repo-inventory.md:60` — repo table row: name, GitHub URL, directory
- [ ] `team/scope-of-work/worker-framework-modernization.md:20` — table entry `cli` → `cli-fob`; `@fob/cli` → `@fob/cli-fob`
- [ ] `team/roles/fde.md:23` — `@fob/cli` → `@fob/cli-fob`
- [ ] `team/people/sankalp.md:31` — `@fob/cli` → `@fob/cli-fob`
- [ ] `team/teams/platform.md:10` — `@fob/cli` → `@fob/cli-fob`

### Phase 5: Misc repos ❌
- [ ] `vscode-helper/docs/wip/finopsbricks-vscode-helper.md:83` — absolute path precedent reference
- [ ] `apps/fob-watch/docs/windows-setup.md:153` — `@fob/cli` → `@fob/cli-fob`, check for path/URL alongside package name
- [ ] `delivery/.claude/settings.local.json:28` — permission entry, old binary path (local-only, not git-tracked upstream — low priority)
- [ ] `apps/fob-watch/.claude/settings.local.json:10` — permission entry, old docs path (local-only — low priority)
- [ ] `/Users/alex/ec2code/finopsbricks/.claude/settings.local.json:18-19` — root monorepo permission allowlist entries

### Phase 6: `cli-fobs` sibling repo ❌
Separate repo (`@fob/fobs`, remote `finopsbricks/cli-fobs`) that explicitly
documents worker-context commands as living in `@fob/cli` and links to it.
Its own package name also renames: `@fob/fobs` → `@fob/cli-fobs` (bin `fobs`
unchanged).
- [ ] `package.json` — `"name": "@fob/fobs"` → `"@fob/cli-fobs"`
- [ ] `package-lock.json` — regenerate (`npm install --package-lock-only`)
- [ ] `README.md:1,3,60` — title `# @fob/fobs` → `# @fob/cli-fobs`; `[\`@fob/cli\`](../cli/)` → `[\`@fob/cli-fob\`](../cli-fob/)`
- [ ] `docs/usage/commands.md:442` — `[\`@fob/cli\`](https://github.com/finopsbricks/cli)` → `[\`@fob/cli-fob\`](https://github.com/finopsbricks/cli-fob)`
- [ ] `docs/usage/installation.md:56` — `npm unlink -g @fob/fobs` → `@fob/cli-fobs`
- [ ] `src/cli/orchestrator/index.js:5,7` — code comments referencing `@fob/cli` repo and `docs/architecture/sor-cli-convergence.md in the @fob/cli repo` → `@fob/cli-fob`
- [ ] `src/cli/orchestrator/stations/delete.js:9` — comment, `@fob/cli` → `@fob/cli-fob`
- [ ] `src/utils/apps.js:21` — description string, `@fob/cli` → `@fob/cli-fob`

---

## Findings Not Requiring Action

- `docs/architecture/sor-cli-convergence.md` (this repo) — matched `@fob/cli\b`
  pattern but it's actually `@fob/cli-core`, a *hypothetical* package name
  discussed and rejected in that doc. No real reference to the old repo.
- `apps/recordings.finopsbricks.com`, `statements.finopsbricks.com`,
  `txn.finopsbricks.com` `package-lock.json` — false positives from an
  unrelated third-party npm package (`fxparser`) with its own internal
  `src/cli/cli.js` — nothing to do with FinOpsBricks.
- `handbooks/platform-handbook`, `handbooks/cfo-handbook`,
  `engineering-standards`, `apps/orchestrator.finopsbricks.com`, all
  `lib/*` packages — zero matches, no action needed.
- No `.github/workflows` files anywhere reference the old path/name.
- `docs/wip/fob-cli-v3.md` — title says "WIP" but content is a stale,
  unimplemented v3 plan (unchecked boxes, describes `fob processes run`
  which predates the station vocabulary) superseded by v4–v10, which exist
  and shipped. Treated as historical/abandoned, not "active" — left as-is.
- `apps/statements.finopsbricks.com/docs/wip/public-docs-cleanup.md:20,124` —
  mentions `@fob/fobs`; file status is `COMPLETE` — left as-is.
- Confirmed via `grep` across every `package.json` in the monorepo: nothing
  declares `@fob/cli` or `@fob/fobs` as a `dependencies`/`devDependencies`
  entry — both are npm-link-only global CLIs, so renaming the package name
  carries no install/resolution risk.

---

## Decisions (resolved 2026-07-16)

1. **Historical WIP files** — update active only: this repo's
   `process-push-force-upsert.md` (~80%) and `fix-dual-module-instance-bug.md`
   (~90%). Leave completed WIP files here and the `docs/wip/old/` archives in
   `worker-nowapps` / `sankalp/worker-nowapps` untouched.
2. **Scope across repos** — all 6 phases, full sweep.
3. **`cli-fobs` sibling repo** — included, own commit (folded into Phase 6).
4. **Commits** — commit per repo as each phase completes, straight to that
   repo's current branch (no pre-commit branching, per CLAUDE.md convention).

## Related Files

- This repo: `package.json`, `README.md`, `docs/usage/installation.md`
- `handbooks/fde-handbook/implementation/how-things-work/station-push-chain.md`
- `handbooks/fde-handbook/implementation/how-things-work/station-run-cli.md`
- `handbooks/fde-handbook/implementation/step-patterns/step-debugging.md`
- `cli/cli-fobs/README.md`, `cli/cli-fobs/docs/usage/commands.md`
