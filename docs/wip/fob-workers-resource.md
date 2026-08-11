# Local worker process management: rename `worker status`, add `workers` resource

## Status: COMPLETE

Rename the misleadingly-named `fob worker status` (checks HTTP connectivity to the orchestrator — nothing to do with local processes) to `fob orchestrator status`, and add a new `workers` resource that manages *local* worker processes on this machine: `list`, `start`, `stop`, `restart`, `logs`, `monit` — the last fulfilling the `monit` verb reserved in [[fob-cli-monitor-verbs]] for "a future interactive TUI (pm2-style)."

Companion WIP in the fob-watch repo: `apps/fob-watch/docs/wip/pm2-process-controls.md` — same underlying pm2 conventions, surfaced in the GUI instead of the terminal. The two must derive pm2 process names identically (see Cross-Repo Coherence below) or the CLI and GUI will register the same worker under two different pm2 names.

---

## Problem Statement

Two separate gaps:

1. **`fob worker status` is misnamed.** It calls `checkConnection()` (`src/utils/orchestrator.js`), hitting `GET {url}/api/worker/poll` — a connectivity check against the remote orchestrator. Nothing about it inspects local worker processes. The name actively misleads: someone reading `fob worker status` would reasonably expect to see running worker process state, not an HTTP ping.
2. **No way to see or manage locally-running worker processes.** Developers currently juggle `ps`/`lsof`/`pm2` by hand to answer "is my worker already running?" or "which mode is it running in (direct `node`, or under pm2)?" This was solved ad hoc this session in `ops/devops/scripts/list-running-workers.mjs` (detects workers by reading each candidate node process's own `package.json` for a `@fob/lib-worker` dependency + matching its `main` entry — independent of any fixed folder or entrypoint filename — and cross-references `pm2 jlist` via a ppid-chain walk to distinguish pm2-managed from direct-mode instances). That logic belongs in the CLI itself, not a one-off script in a different repo.

## Proposed Solution

### Rename

`worker` (singular) resource → `orchestrator` resource, action `status` unchanged in behavior. Frees up `worker`/`workers` entirely for local-process management.

### New `workers` resource

Six actions, mapping to standard verbs per [[fob-cli-monitor-verbs]] / `docs/cli-design-style.md`:

```bash
fob workers list                # snapshot: all locally-running fob workers (direct + pm2), whole machine
fob workers start [target]      # start a worker repo under pm2 (target: path, default cwd)
fob workers stop [target]       # pm2 stop (target: pm2 name or worker dirname, default cwd's worker)
fob workers restart [target]    # pm2 restart, same target resolution
fob workers logs [target]       # exec `pm2 logs <name>` with inherited stdio — pm2 already does live-tail correctly
fob workers monit               # exec `pm2 monit` directly — fulfills the reserved TUI verb, zero new code
```

`pm2` is invoked as an already-globally-installed CLI binary (same as any developer's existing `pm2` install) — **not** an npm dependency of this project. Friendly error if missing: `pm2 not found — install with \`npm i -g pm2\``.

**Direct-mode workers are intentionally outside `stop`/`restart`/`logs`'s scope** — `fob workers start` always registers under pm2, so a worker running "direct" (plain `node src/index.js`, no pm2) is one a developer started by hand outside this tooling, and should be killed by hand too (`fob workers list` shows the pid).

### Cross-repo coherence (critical)

Canonical pm2 process name = **the worker repo's directory basename** — no `--name` override on `start`, so `fob workers start` (terminal) and fob-watch's Play button always compute the identical name for the same repo path. fob-watch's Rust side must use `path.basename`, not its own user-editable `label` config field.

## Implementation Phases

### Phase 1: Rename `worker status` → `orchestrator status` ✅
- [x] Move `src/cli/worker/status.js` → `src/cli/orchestrator/status.js`, rename `workerStatusHandler` → `orchestratorStatusHandler`
- [x] Delete `src/cli/worker/`; move `tests/cli/worker/status.test.js` → `tests/cli/orchestrator/status.test.js`
- [x] `src/cli/index.js`: replace `.command('worker', ...)` block with `.command('orchestrator', ...)`; update resource-completion array, `orchestrator` completion branch, `demandCommand` message
- [x] Update `CLAUDE.md`, `docs/cli-design-style.md`, `docs/architecture/module-structure.md`, `docs/usage/commands.md`, `docs/usage/configuration.md`, `docs/usage/installation.md`, `docs/usage/station-sync.md`, `docs/architecture/sor-cli-convergence.md`

### Phase 2: Shared detection util ✅
- [x] `src/utils/worker-processes.js` — port `ops/devops/scripts/list-running-workers.mjs`, add `cwd` to each row, extract `getWorkerPackageInfo(cwd)`, add `isPm2Available()`
- [x] Platform guard: friendly message on non-macOS (unverified on other platforms) — **superseded 2026-08-11**, macOS + Linux both supported; see Open Questions
- [x] **Second bug found + fixed 2026-08-11 (pre-existing, both platforms)**: the `ps` snapshot regex was anchored `^(\d+)`, but `ps` right-aligns the pid/ppid columns and pads them with spaces — so *no* real `ps` line ever matched and `procs` was always empty. On macOS this was invisible because the map is only consulted for the `uptime`/`started` columns, which silently rendered as `-`; detection itself leans on `pm2 jlist`/`lsof` and kept working. The unit-test fixtures hid it too: they were hand-written without column padding. Fixed with a leading `\s*`, fixtures re-padded to match real output, and a regression test asserting `uptime`/`started` actually populate.
- [x] **Bug found + fixed during manual verification**: the ported script's `pm2AppFor()` ppid-walk + `proc.command.includes(info.main)` gate silently failed for workers started via `fob workers start` itself. Root cause: pm2 rewrites the OS process title when directly forking a `.js` script (for its own `pm2 monit`/`pm2 list` display), which on this machine truncated/corrupted the `ps`-visible command text before it ever reached the `main` filename substring — so a freshly-`pm2 start`-ed worker was invisible to `fob workers list`. Fixed by resolving pm2-managed workers directly from `pm2 jlist`'s own `pm_cwd` field instead of matching `ps` command text at all; direct-mode detection (which has no pm2 registry to lean on) still needs the `ps`-command-text check, but now dedupes against pm2-claimed *cwds* (not just pids) to avoid double-counting an `npm run start`-wrapped worker's grandchild as a second "direct" row. `pm2AppFor()` and the ppid-walk were removed entirely — no longer needed.

### Phase 3: `fob workers list` ✅
- [x] `src/cli/workers/list.js` — `listRunningWorkers()` + existing `formatTable()` from `src/utils/format.js`, `--json` flag

### Phase 4: `fob workers start` ✅
- [x] `src/cli/workers/start.js` — resolve target, validate via `getWorkerPackageInfo`, refuse if already running, `execFileSync('pm2', ['start', pkg.main, '--name', name], { cwd: dir, stdio: 'inherit' })`

### Phase 5: `fob workers stop` / `restart` ✅
- [x] `src/cli/workers/stop.js`, `restart.js` — shared target resolution (`requirePm2Target`), refuse cleanly for direct-mode matches

### Phase 6: `fob workers logs` / `monit` ✅
- [x] `src/cli/workers/logs.js` — resolve target, `pm2 logs <name>` inherited stdio
- [x] `src/cli/workers/monit.js` — `pm2 monit` inherited stdio

### Phase 7: Wiring + completion ✅
- [x] `.command('workers', ...)` block in `index.js`, all six actions; **no `withSeparator()` on `logs`/`monit`** (banners would corrupt pm2's own inherited-stdio output)
- [x] Shell completion branch for `workers`

### Phase 8: Docs + tests 🔄
- [x] `docs/cli-design-style.md` Command Map, `docs/usage/commands.md` new "## Workers" section
- [x] Manual end-to-end verification against a disposable pm2-managed test worker (not the user's real worker repos): start → list → duplicate-start refusal → restart → live logs tail → monit TUI launch → clean teardown (`pm2 delete`). All six actions confirmed working; the Phase 2 bug above was caught this way.
- [x] Automated test coverage: `worker-processes.test.js` (15 tests, including the pm2-title-corruption bug fix and the npm-wrapper double-count fix), plus tests for `workers/{list,start,stop,restart,logs,monit}.js` and the moved `orchestrator/status.test.js` — 32 new tests total, all passing
- [x] Full `npm test` run — 252 total (214 passed, 38 failed). The 38 failures are 10 pre-existing suites unrelated to this work, confirmed via `git stash` to fail identically on a clean `main` checkout (unrelated to `worker`/`orchestrator`/`workers` — steps/config/lines/workpieces tests, likely environment-dependent)

---

## Open Questions

- ~~**Linux support**: `worker-processes.js` is macOS/BSD-only, matching the source script. Friendly warning vs silent wrong output — leaning friendly warning, not blocking.~~ **Resolved 2026-08-11**: Linux is now supported. GNU `ps -o lstart` and `lsof -iTCP -sTCP:LISTEN` turned out to emit the same formats the existing parsers already expected; cwd resolution reads `/proc/<pid>/cwd` directly instead of shelling out to `lsof` (no subprocess per pid, and works in minimal containers that omit `lsof`). The guard now only rejects non-macOS/non-Linux platforms. Verifying this surfaced a latent **cross-platform** bug — see Phase 2 note below.
- **`workers monit` v2 scope**: exec `pm2 monit` covers pm2-managed workers only, not direct-mode. Acceptable per the direct-mode-is-opted-out reasoning above; a custom polling table covering both is a possible future v2, not built now.
- **`start` target semantics**: path-only (no bare-name resolution, since nothing is running yet to resolve a name against) — slightly asymmetric with stop/restart/logs where target can be a name. Confirmed acceptable.

---

## Related Files

**Will create**
- `src/cli/orchestrator/status.js`
- `src/utils/worker-processes.js`
- `src/cli/workers/{list,start,stop,restart,logs,monit}.js`
- `tests/cli/orchestrator/status.test.js`
- `tests/cli/workers/{list,start,stop,restart,logs,monit}.test.js`
- `tests/utils/worker-processes.test.js`

**Will modify**
- `src/cli/index.js` — resource rename, new `workers` command tree, completion
- `docs/cli-design-style.md`, `CLAUDE.md`, `docs/architecture/module-structure.md`, `docs/usage/commands.md`, `docs/usage/configuration.md`, `docs/usage/installation.md`

**Will delete**
- `src/cli/worker/` (entire directory)

**Reference (do NOT modify)**
- `ops/devops/scripts/list-running-workers.mjs` — the detection logic being ported, already written and tested this session
- `src/utils/format.js` — existing `formatTable()`, reused as-is
- [[fob-cli-monitor-verbs]] — where `monit` was originally reserved
- `apps/fob-watch/docs/wip/pm2-process-controls.md` — companion GUI-side WIP, same pm2 naming convention
