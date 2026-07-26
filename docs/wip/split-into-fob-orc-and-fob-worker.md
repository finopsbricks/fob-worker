# Split `cli-fob` into `fob-orc` (orchestrator client) + `fob-worker` (local tool)

## Status: IN PROGRESS — Phase 1 (extract `@fob/orc`) started 2026-07-26; design + naming decided

`cli-fob` is two tools wearing one binary. Every command sits cleanly on one of two **data
planes**: a remote **orchestrator control plane** (canonical station/process definitions,
work-records, tags — all HTTP) and a machine-**local execution plane** (worker step code, the
local station-file cache, live run-state, pm2 processes). This WIP splits them into two standalone
`fob-<tool>` wrappers, which also turns today's `fob` binary into the pure git-style dispatcher —
unblocking Phase 4 of the parent family WIP.

---

> **Parent WIP:** `cli/fob-stm/docs/wip/cli-standards-and-wrappers.md` (Phase 4, the `fob`
> dispatcher). This split is the **precondition** for that phase and **resolves its open
> "`fob` naming collision" question**: orchestrator commands move to `fob-orc`, worker-context
> commands to `fob-worker`, and `fob` becomes a dispatcher owning no built-ins.

## Problem Statement

`cli-fob` (`@fob/cli-fob`, binary `fob`) mixes two unrelated concerns behind one command tree:

- **Orchestrator control plane (remote API).** `src/utils/orchestrator.js` is a self-contained HTTP
  client (reads `ORCHESTRATOR_URL/API_KEY/SECRET`) exposing `listStations`, `getStation`,
  `createStation`, `updateStation`, `deleteStation`, `cancel/listWorkRecords`, `listTags`, `getItem`,
  `runStation`, `getSupportingDoc`, `setEntityTags`, … — **already the exact shape of a publishable
  `@fob/stm`-style client.**
- **Local execution plane (this machine).** `worker-processes.js` (pm2/`ps`/`lsof`),
  `station-files.js` (the `.orchestrator/stations/` cache), `line-state.js` (`temp/stations/` live
  run-state → lines/workpieces/bins), `steps-loader.js`/`lib-worker-loader.js` (run a step in-process).
  Zero network; pure filesystem + local processes.

**Why it matters.** The same resource word means different things on each plane — `stations list`
reads canonical defs *from the orchestrator*, while `stations status` reads live run-state *on this
box*. One binary can't cleanly own both meanings, and it blocks the dispatcher (the `fob` name is
taken by this hybrid).

## Proposed Solution

Decisions locked in 2026-07-26 (grounded in a per-handler backend audit of all 39 commands):

1. **Two standalone `fob-<tool>` wrappers, one per plane.** The tool name becomes the namespace that
   disambiguates shared resource words (`fob orc stations …` vs `fob worker stations …`).

2. **`fob-orc` / `@fob/orc` — the orchestrator client, a 2-in-1 published like `@fob/stm`.**
   Lift `orchestrator.js` into a `fobOrc(credentials)` bound client factory with per-resource
   namespaces (`orc.stations.list()`, `orc.workRecords.cancel(id)`, `orc.tags.*`, `orc.items.get()`).
   **Explicit credentials, no ambient env** (per the [No Ambient Configuration] standard, same as
   fob-stm v0.2.0). CLI handlers presentation-only. Workers and `fob-worker` import the client.
   ```js
   import { fobOrc } from '@fob/orc';
   const orc = fobOrc({ api_key, api_secret });   // api_url optional
   await orc.stations.list();
   ```

3. **`fob-worker` — the local plane, CLI-only worker-context variant.** Keeps `.env` (not a config
   file) — the grandfathered worker-context exception already documented in the standard. Renames the
   pm2 resource **`workers` → `procs`** (avoids the `fob worker workers …` double-word).

4. **The bridges (`stations pull`/`push`/`run`) live in `fob-orc`.** `pull` (remote → local files),
   `push` (local files → remote), and `run` (triggers a remote orchestrator run, returns a
   `work_record_id`) all center on the canonical station definitions; `fob-orc` owns both the remote
   API *and* its local station-file cache I/O. `stations run` reads the local station file only for
   scenario/override convenience — it is a remote action, not local execution.

5. **`fob` becomes the pure dispatcher** (parent-WIP Phase 4): no built-ins; resolves `fob orc …` →
   `fob-orc`, `fob worker …` → `fob-worker`, and the rest of the family (`fob stm …`, `fob email …`).

### Command classification (all 39 handlers)

**→ `fob-orc` (remote CRUD + bridges):**
`stations list · show · create · edit · delete · archive · unarchive · pull · push · run` ·
`work-records list · show · edit · cancel` · `tags list · create · edit · delete` ·
`supporting-docs show` · `orchestrator status` (→ becomes `fob-orc status`/health)
_(no `items` namespace — the item object is deprecated on the orchestrator; dropped.)_

**→ `fob-worker` (filesystem + pm2, zero network):**
`steps list · run` · `lines list · show · status · empty-bins` · `workpieces list · show · watch` ·
`procs list · start · stop · restart · logs · monit` (was `workers`) ·
`stations status · empty-bins · update-step-metadata` (local run-state / local-file ops) · `config show`

## Open Questions

- [x] **`fob-worker` → `@fob/orc` cross-dependency — RESOLVED 2026-07-26: eliminated.** The `item`
      object is being **deprecated on the orchestrator**, so `steps run --item` and the whole `items`
      namespace/`getItem` are **dropped** entirely (not just locally). `fob-worker` therefore has **no**
      orchestrator touchpoint and needs no `@fob/orc` dependency. Follow-up: `stations run` also passed
      an `itemId` to `runStation` + called `getItem` for display — revisit whether `runStation` still
      takes an item once the orchestrator-side deprecation lands (flag during Phase 1 port).
- [ ] **`fob-worker` package identity.** Published `@fob/worker`, or CLI-only/unpublished (no library
      consumers — it's the worker-context variant)? Note potential confusion with existing
      `@fob/lib-worker`. Leaning CLI-only, binary `fob-worker`, package name TBD.
- [ ] **`stations update-step-metadata`** writes *local* station files (no orchestrator import today)
      but station metadata is conceptually orchestrator-owned. Confirm it stays local (edit-then-push)
      vs. becoming an `fob-orc` mutation.
- [ ] **Migration/sequencing.** `cli-fob` is installed as `fob` inside worker repos. Renaming to
      `fob-worker` + introducing `fob-orc` + the dispatcher touches every worker repo's tooling.
      Sequence so nothing breaks mid-flight (dispatcher last).

## Implementation Phases

### Phase 1: Extract `@fob/orc` (orchestrator 2-in-1) 🔄
New repo `finopsbricks/cli/fob-orc`, built to the CLI standard (copy the fob-stm skeleton).
- [x] **Client library DONE** (2026-07-26). `fobOrc(credentials)` factory + `src/resources/*`
      (`stations`, `work-records`, `tags`, `supporting-docs`) lifted from `orchestrator.js`.
      Category-based return shapes (unwrapped record / `{data, page_context}` / flat array), mirroring
      fob-stm. **Explicit creds, no ambient env** (`http.js` never reads `process.env`; optional
      `X-Location` via a `location` cred for the `checkConnection` worker-poll). `@ts-check` + written
      types (`src/types/api/*`, `src/types/general/*`); co-located `*Api` typedefs with `@returns` so
      `tsc` verifies each impl. **Path contract preserved**: CRUD → `/api/v1/processes/*`,
      archive/unarchive → canonical `/api/v1/stations/*`, work-records `station`→`?process=`. `items`
      dropped (deprecated). `npm run typecheck` → 0 errors.
- [x] **Client tests DONE** — `tests/resources/stations.test.js` (mock `fetch`, 9 cases): unwrap,
      envelope, pagination, POST bodies, `/stations/*` vs `/processes/*`, per-client cred binding,
      `station`→`process` mapping. Suite 9/9 green.
- [ ] `fob-orc` CLI: yargs tree, `safe()`, `format.js`, `config profiles` → `~/.fob/fob-orc/config.yml`
      (0600). Handlers presentation-only. **← NEXT**
- [ ] Port the orchestrator-plane commands + bridges (see classification). Bridges (`pull`/`push`)
      add local station-file cache I/O in the CLI layer (client stays pure-remote).
- [ ] CLI tests; help tree walks; no-creds → clean exit 1.

### Phase 2: Convert `cli-fob` → `fob-worker` (local plane) ❌
- [ ] Rename repo/binary to `fob-worker`; strip the orchestrator-plane commands (now in `fob-orc`).
- [ ] Rename the pm2 resource `workers` → `procs`.
- [ ] Keep steps / lines / workpieces / procs / local-`stations` / `config show`. Wire `steps run --item`
      to `@fob/orc` (per open question).
- [ ] `.env` worker-context variant retained; update help/completion tree.

### Phase 3: `fob` dispatcher (= parent WIP Phase 4) ❌
- [ ] Turn `fob` into the git-style launcher (no built-ins): resolve `fob-<tool>` on `$PATH`, exec with
      inherited stdio, forward argv untouched, propagate exit code. Bare `fob` lists discovered wrappers.

## Related Files

**Being created:**
- `cli/fob-orc/**` — new orchestrator 2-in-1 (client `@fob/orc` + `fob-orc` CLI)

**Being transformed:**
- `cli/cli-fob/**` → `fob-worker` (local plane; `workers`→`procs`; orchestrator commands removed)
- `cli/cli-fob/src/utils/orchestrator.js` — the client surface lifted into `@fob/orc`

## Related Notes

- [Parent WIP: CLI Standards & the fob-<tool> Wrapper Family](../../../fob-stm/docs/wip/cli-standards-and-wrappers.md)
- [Sibling: fob-stm library/CLI unification](../../../fob-stm/docs/wip/cli-lib-unification.md) — the `fobStm` factory pattern `fobOrc` copies
- [No Ambient Configuration](/Users/alex/ec2code/alex/engineering-standards/principles/no-ambient-configuration.md)
- [WIP Files Pattern](/Users/alex/ec2code/alex/engineering-standards/git-workflow/wip-files.md)
