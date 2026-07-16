# Rename cli → cli-fob: fix references across the monorepo

## Status: COMPLETE

The GitHub repo, local directory, and git remote for this CLI have already been
renamed from `finopsbricks/cli` (dir `cli/cli`) to `finopsbricks/cli-fob` (dir
`cli/cli-fob`). The binary name (`fob`) and npm scope are unaffected. What's
left is fixing every reference to the old name/path/URL — inside this repo and
across the rest of the monorepo — that documentation, handbooks, and other
repos still carry. All 6 phases are done; see "Final Verification" at the
bottom for the closing sweep.

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

### Phase 2: `handbooks/fde-handbook` ✅
- [x] `implementation/how-things-work/station-push-chain.md` — 10 path refs updated
- [x] `implementation/how-things-work/station-run-cli.md` — 3 path refs updated
- [x] `implementation/step-patterns/step-debugging.md:11-12` — clone URL + `cd cli-fob` updated
- Commit: `582fe82`

### Phase 3: `workers/*` repos ✅
- [x] `workers/worker-agilitas/docs/worker-orchestrator-runbook.md:24` — `@fob/cli` → `@fob/cli-fob` — commit `1a3524c`
- [x] `workers/worker-alex/CLAUDE.md:48` — URL updated
- [x] `workers/worker-alex/docs/wip/fob-stations-delete.md:214` — active (~90%), path updated — commit `ab51878`
- [x] `workers/worker-newnowapps/CLAUDE.md:16` — relative path + package name updated
- [x] `workers/worker-newnowapps/docs/WIP/station-nomenclature-migration-plan.md:45` — URL updated — commit `ebf28b6`
- [ ] `workers/worker-nowapps/docs/wip/old/cli-push-create-support.md` — archive folder, left as-is per decision
- [ ] `workers/sankalp/worker-nowapps/docs/wip/old/cli-push-create-support.md` — same, left as-is
- [ ] `workers/worker-nowapps/docs/todos/fob-processes-push-ergonomics.md:120` — re-checked: generic prose "the CLI repo", no literal old name/URL/path present — nothing to replace
- [ ] `workers/sankalp/worker-nowapps/docs/todos/fob-processes-push-ergonomics.md:120` — same, nothing to replace (this is a separate clone of the same `worker-nowapps` remote, not a symlink)

### Phase 4: `team/*` docs ✅
- [x] `team/repo-inventory.md:60` — repo table row updated
- [x] `team/scope-of-work/worker-framework-modernization.md:20` — table entry updated
- [x] `team/roles/fde.md:23` — updated
- [x] `team/people/sankalp.md:31` — updated
- [x] `team/teams/platform.md:10` — updated
- Commit: `cc511d1`

### Phase 5: Misc repos ✅
- [x] `vscode-helper/docs/wip/finopsbricks-vscode-helper.md:83` — path updated — commit `1eca2cb`
- [x] `apps/fob-watch/docs/windows-setup.md:153,154,159,165,183,201` — `@fob/cli` → `@fob/cli-fob`, Windows folder path `finopsbricks - repos\cli` → `...\cli-fob`, and "the `cli` repo" prose → "the `cli-fob` repo" — commit `1a21876`
- [x] `/Users/alex/ec2code/finopsbricks/.claude/settings.local.json:18-19` — root monorepo permission allowlist entries updated (not a git repo — no commit, local-only file)
- [ ] `delivery/.claude/settings.local.json:28` — file no longer exists at check time (gitignored local file, unrelated concurrent change on this machine) — skipped, no action possible
- [ ] `apps/fob-watch/.claude/settings.local.json:10` — gitignored, untracked local file — left as-is (low priority, not visible to anyone else)

### Phase 6: `cli-fobs` sibling repo ✅
Separate repo (`@fob/fobs`, remote `finopsbricks/cli-fobs`) that explicitly
documents worker-context commands as living in `@fob/cli` and links to it.
Its own package name also renamed: `@fob/fobs` → `@fob/cli-fobs` (bin `fobs`
unchanged).
- [x] `package.json` — name + `repository.url` updated
- [x] `package-lock.json` — regenerated
- [x] `README.md` — title, worker-context CLI links, **and** its own clone
      instructions (`git@github.com:finopsbricks/fobs.git` / `cd fobs`) — a
      pre-existing staleness predating even this rename (the repo's remote is
      `finopsbricks/cli-fobs`, not `finopsbricks/fobs`), found and fixed while
      already in this file
- [x] `docs/usage/commands.md:442` — link updated
- [x] `docs/usage/installation.md` — clone URL, `cd fobs` (3x) → `cd cli-fobs`, `npm unlink -g` — same pre-existing `finopsbricks/fobs` staleness fixed here too
- [x] `src/cli/orchestrator/index.js:5,7` — comments updated
- [x] `src/cli/orchestrator/stations/delete.js:9` — comment updated
- [x] `src/utils/apps.js:21` — description string updated
- Commit: `038bc74`

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

## Final Verification

Ran a monorepo-wide `grep -rn` for `@fob/cli\b|@fob/fobs\b|finopsbricks/cli\.git|finopsbricks/cli\b|finopsbricks/fobs\b`
after all 6 phases, excluding `node_modules`/`.git`/`.next`/`.swc`/`temp`.
Remaining hits are all accounted for:
- **Already-fixed false positives** — `\b` matches before the `/` in paths
  like `finopsbricks/cli/cli-fob/...`, so already-correct paths still trip
  the raw pattern. Confirmed each one reads `cli/cli-fob` or `cli/cli-fobs`.
- **Intentionally untouched** — completed/historical WIP files (`fob-cli.md`,
  `fob-cli-v2.md`, `fob-cli-v3.md`, `cli-task-structure-mismatch.md`,
  `process-push-create-fix.md`, `docs/wip/old/cli-push-create-support.md` ×2,
  `apps/statements.finopsbricks.com/docs/wip/public-docs-cleanup.md`), this
  WIP tracking file itself, and `docs/architecture/sor-cli-convergence.md`'s
  `@fob/cli-core` (unrelated hypothetical name).
- **Pre-existing, out-of-scope staleness** — root `.claude/settings.local.json`
  has two `finopsbricks/fobs` (no `cli-` prefix) permission entries that never
  pointed at a real directory; left alone as unrelated dead config.

**Bonus fixes found while sweeping** (pre-existing staleness unrelated to
today's rename, fixed opportunistically since already touching the files):
- `cli-fobs` itself had `git@github.com:finopsbricks/fobs.git` / `cd fobs` in
  its own `README.md` and `docs/usage/installation.md` — the repo's actual
  remote has always been `finopsbricks/cli-fobs`, not `finopsbricks/fobs`.
- `apps/statements.finopsbricks.com/docs/wip/{api-list-filter-extensions,parity-statements,cli-api-ui-feature-parity}.md` linked to the same never-valid `finopsbricks/fobs` URL.
- Local-only (gitignored, no commit) `.claude/settings.local.json` fixes in
  `ops/delivery/` and `apps/fob-watch/`, and the root
  `/Users/alex/ec2code/finopsbricks/.claude/settings.local.json`.

**Note:** midway through this pass, `team/`, `delivery/`, `devops/`,
`bookkeeping/`, `icp-discovery/`, `prd/` moved under a new `ops/` directory,
and `vscode-helper/` moved under `vscode/` — an unrelated concurrent change
on this machine, not part of this task. Verified all commits made against
the old paths (`team/...`, `vscode-helper/...`) landed correctly — these
were directory moves preserving git history, not new clones.

## Related Files

- This repo: `package.json`, `README.md`, `docs/usage/installation.md`
- `handbooks/fde-handbook/implementation/how-things-work/station-push-chain.md`
- `handbooks/fde-handbook/implementation/how-things-work/station-run-cli.md`
- `handbooks/fde-handbook/implementation/step-patterns/step-debugging.md`
- `cli/cli-fobs/README.md`, `cli/cli-fobs/docs/usage/commands.md`
