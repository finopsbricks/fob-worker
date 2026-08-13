# WIP — CLI help readability

Making `fob-worker`'s help output readable. Two problems, one already fixed.

**Status:** problem 1 fixed and committed (`95c0e40`). Problem 2 designed and
prototyped, not implemented.

Companion doc: [`cli-help-conventions.md`](./cli-help-conventions.md) — survey of
how kubectl / gh / docker / git / npm format their command lists.

---

## Problem 1 — descriptions overflowed to column 0 ✅ fixed

`.wrap(null)` disabled yargs' wrapping entirely, so the *terminal* wrapped long
descriptions with no indent. A continuation line started at column 0 and read as
a separate command entry.

Fixed in `95c0e40` by wrapping to the terminal width, so yargs hang-indents
continuations under the description column:

```js
.wrap(process.stdout.columns || 100)
```

## Problem 2 — the command prefix is repeated on every row ⬜ open

Every row of every command list restates the full command path. At the top level
that's `fob-worker ` (11 cols); one level down it's `fob-worker workpieces `
(22 cols). Those are exactly the columns the descriptions are short of — which is
why descriptions still break **mid-word** even after problem 1 was fixed
(`definitio|nal`, `promot|es`, `read|s`).

Convention check (full detail in `cli-help-conventions.md`): kubectl, gh, docker
and git all print the prefix **once**, in the usage line, and list bare names
underneath. kubectl's renderer is literally
`"  " + rpad(cmd.Name(), cmd.NamePadding()) + "   " + cmd.Short`, where
`cmd.Name()` is the bare name. `fob-worker` is the outlier.

---

# Before → After

All captures at **92 columns**. "Before" is real output from the current code
(post-`95c0e40`). "After" is real output from the prototype renderer at
`scratchpad/render-proto.mjs`, not a hand-drawn mockup.

## Top level — `fob-worker --help`

**Before**

```
fob-worker <resource> <action> [options]

Commands:
  fob-worker lines       Inspect assembly lines (config + live state)
  fob-worker stations    Inspect local station run-state (temp/stations/)
  fob-worker steps       Work with step handlers
  fob-worker workpieces  Inspect workpieces on the filesystem (temp/stations/)
  fob-worker procs       Manage local worker processes on this machine (pm2)
  fob-worker config      Show CLI configuration
  fob-worker completion  Generate shell completion script

Global Options:
  -h, --help     Show help                                                         [boolean]
  -v, --version  Show version number                                               [boolean]
```

**After**

```
fob-worker <resource> <action> [options]

Commands:
  lines        Inspect assembly lines (config + live state)
  stations     Inspect local station run-state (temp/stations/)
  steps        Work with step handlers
  workpieces   Inspect workpieces on the filesystem (temp/stations/)
  procs        Manage local worker processes on this machine (pm2)
  config       Show CLI configuration
  completion   Generate shell completion script

Run 'fob-worker <resource> --help' for more information on a resource.

Global Options:
  -h, --help     Show help                                                         [boolean]
  -v, --version  Show version number                                               [boolean]
```

## `fob-worker lines --help`

**Before** — every description wraps; `definitio|nal` splits mid-word

```
fob-worker lines <action> [options]

Commands:
  fob-worker lines list               List lines grouped from local station files (definitio
                                      nal)
  fob-worker lines show [line]        Show line config: stations in dependency order + conve
                                      yor topology (definitional)
  fob-worker lines status [line]      Snapshot of live bin state (reads temp/stations/). No
                                      arg = per-line summary.
  fob-worker lines empty-bins [line]  Wipe selected bin directories across every station in
                                      a line (destructive)
```

**After** — one row wraps instead of four, and on a word boundary

```
fob-worker lines <action> [options]

Commands:
  list                List lines grouped from local station files (definitional)
  show [line]         Show line config: stations in dependency order + conveyor topology
                      (definitional)
  status [line]       Snapshot of live bin state (reads temp/stations/). No arg = per-line
                      summary.
  empty-bins [line]   Wipe selected bin directories across every station in a line
                      (destructive)

Run 'fob-worker lines <action> --help' for more information on an action.
```

## `fob-worker stations --help`

**Before** — the original report; `read|s`, `station|s`, `fi|les` all split

```
fob-worker stations <action> [options]

Commands:
  fob-worker stations status [id]           Snapshot of live bin state for one station (read
                                            s temp/stations/)
  fob-worker stations empty-bins [id]       Wipe selected bin directories under temp/station
                                            s/<STATION>/ (destructive)
  fob-worker stations update-step-metadata  Update step name/description in local station fi
                                            les from code
```

**After**

```
fob-worker stations <action> [options]

Commands:
  status [id]            Snapshot of live bin state for one station (reads temp/stations/)
  empty-bins [id]        Wipe selected bin directories under temp/stations/<STATION>/
                         (destructive)
  update-step-metadata   Update step name/description in local station files from code

Run 'fob-worker stations <action> --help' for more information on an action.
```

## `fob-worker workpieces --help`

**Before**

```
fob-worker workpieces <action> [options]

Commands:
  fob-worker workpieces list        Snapshot dashboard of workpieces on disk
  fob-worker workpieces show [id]   Deep view of one workpiece (substring matching >1 promot
                                    es to dashboard)
  fob-worker workpieces watch [id]  Live tail: bin transitions and new log events as they ha
                                    ppen
```

**After** — nothing wraps at all

```
fob-worker workpieces <action> [options]

Commands:
  list         Snapshot dashboard of workpieces on disk
  show [id]    Deep view of one workpiece (substring matching >1 promotes to dashboard)
  watch [id]   Live tail: bin transitions and new log events as they happen

Run 'fob-worker workpieces <action> --help' for more information on an action.
```

## `fob-worker procs --help`

**Before**

```
fob-worker procs <action>

Commands:
  fob-worker procs list              List locally running fob workers
  fob-worker procs start [target]    Start a worker under pm2
  fob-worker procs stop [target]     Stop a pm2-managed worker
  fob-worker procs restart [target]  Restart a pm2-managed worker
  fob-worker procs logs [target]     Tail logs for a pm2-managed worker
  fob-worker procs monit             Interactive pm2 process monitor (CPU/RAM)
```

**After**

```
fob-worker procs <action>

Commands:
  list               List locally running fob workers
  start [target]     Start a worker under pm2
  stop [target]      Stop a pm2-managed worker
  restart [target]   Restart a pm2-managed worker
  logs [target]      Tail logs for a pm2-managed worker
  monit              Interactive pm2 process monitor (CPU/RAM)

Run 'fob-worker procs <action> --help' for more information on an action.
```

## `fob-worker steps` / `fob-worker config`

Short lists — the prefix removal is pure gain, nothing wrapped before or after.

```
fob-worker steps <action> [options]          fob-worker config <action>

Commands:                                    Commands:
  list         List available steps            show   Show resolved paths and environment
  run [slug]   Run a step locally                     variables
```

(`config` has a single action, so it gets no trailing hint line.)

---

## Result

- **Mid-word splitting disappears entirely** at 92 cols — not by shortening a
  single description, purely from the reclaimed columns.
- `lines` goes from 4 wrapped rows to 1; `stations` from 3 to 1; `workpieces`
  from 2 to 0.
- Descriptions stay as-is. Shortening them is still available as a later,
  independent improvement.

---

## Implementation

yargs 17 has **no configuration switch for this** — it composes
`parentCommand + subcommand` for nested rows. Probed and ruled out:

| attempt | result |
|---|---|
| `.scriptName('')` on the nested builder | strips `fob-worker`, leaves `workpieces list` |
| `.scriptName(' ')` | adds indent, prefix stays |
| object-form `.command({command, describe, handler})` | no change |
| same commands on a **root-level** instance + `.scriptName('')` | renders bare ✅ |

That last row is the tell: the prefix comes from *nesting*, not from scriptName.

So this needs a manual renderer. Shape (prototype:
`scratchpad/render-proto.mjs`, ~25 lines):

1. A `renderCommandList({ usage, commands, hint, width })` helper in
   `src/cli/_helpers.js`, next to `localOptions()`.
2. Pad names to the longest; `"  " + name.padEnd(pad) + "   " + desc`, kubectl's
   format exactly.
3. Word-wrap descriptions, hang-indented to the description column — fixes the
   mid-word splitting properly, at any width, rather than relying on there
   happening to be enough room.
4. Wire in per level via yargs' `.showHelp(fn)` / a custom `.fail()` path,
   **iterating yargs' own registered command list** so new commands can't drift
   out of sync with the help text.
5. Keep `Global Options:` rendering as-is — that part already matches convention
   (`gh` makes the same `FLAGS` / `INHERITED FLAGS` split).

### Open questions

- **Where to hook.** `.showHelp(fn)` vs `.help(false)` + own handler. Needs a
  probe; affects whether `--help` and the bare-invocation `demandCommand` path
  share one code path.
- **`demandCommand` message.** Currently `Specify an action: list, show, watch`
  prints *above* the help. With a trailing hint line there are now two "what do I
  type next" cues — probably drop one.
- **Positional args in names.** Kept (`show [id]`, `start [target]`) since they
  carry real information. docker/kubectl omit them at list level and show them in
  the per-command usage; worth deciding deliberately.
- **Tests.** `tests/cli/` has 22 suites. Note **36 tests across 9 suites already
  fail on a clean tree** (verified by stashing) — pre-existing and unrelated, but
  it means "tests pass" isn't currently a usable signal here. Worth fixing or at
  least triaging before leaning on the suite to validate this change.

### Not doing yet

**Grouping** (kubectl's `Basic Commands (Beginner):`, docker's
`Common Commands:` / `Management Commands:`). Earns its keep past ~10 commands;
`fob-worker` has 7 resources and 1–6 actions each. Revisit if the tree grows.
