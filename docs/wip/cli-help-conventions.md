# CLI help conventions — how other CLIs list subcommands

Working notes for the `fob-worker` help-output cleanup. Question being answered:
**should the command prefix be repeated on every row of a command list?**

Short answer: **no.** Every CLI surveyed prints the prefix exactly once, in the
usage line, and lists bare command names underneath.

---

## The problem in `fob-worker` today

```
fob-worker <resource> <action> [options]

Commands:
  fob-worker lines       Inspect assembly lines (config + live state)
  fob-worker stations    Inspect local station run-state (temp/stations/)
  fob-worker steps       Work with step handlers
  fob-worker workpieces  Inspect workpieces on the filesystem (temp/stations/)
  fob-worker procs       Manage local worker processes on this machine (pm2)
  fob-worker config      Show CLI configuration
```

and one level down, the repetition doubles:

```
fob-worker workpieces <action> [options]

Commands:
  fob-worker workpieces list        Snapshot dashboard of workpieces on disk
  fob-worker workpieces show [id]   Deep view of one workpiece (substring matching >1 promotes
                                     to dashboard)
  fob-worker workpieces watch [id]  Live tail: bin transitions and new log events as they happ
                                    en
```

`fob-worker workpieces ` is 22 wasted columns on every row. Those columns are
exactly what the descriptions are short of — note `dash board` and `happ en`
splitting mid-word because the description column has nothing left.

---

## kubectl

Not installed locally, so this is from the kubectl source rather than a captured
terminal session. The renderer that builds each row lives in
[`pkg/util/templates/templater.go`](https://github.com/kubernetes/kubectl/blob/master/pkg/util/templates/templater.go),
in `cmdGroupsString()`:

```go
"  " + rpad(cmd.Name(), cmd.NamePadding()) + "   " + cmd.Short
```

Read that literally — the format is:

- `"  "` — two-space indent
- `rpad(cmd.Name(), ...)` — the **bare** command name (`get`, not `kubectl get`),
  right-padded to a common width
- `"   "` — three spaces
- `cmd.Short` — the one-line description

`cmd.Name()` in Cobra returns only the command's own name, never the parent path.
So kubectl is structurally incapable of the repetition `fob-worker` currently has.

kubectl also groups its ~35 commands into labelled sections
([`cmd.go`](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/cmd.go)):

```
Basic Commands (Beginner):
  create      Create a resource from a file or from stdin
  expose      Take a replication controller, service, deployment or pod and
              expose it as a new Kubernetes service
  run         Run a particular image on the cluster
  set         Set specific features on objects

Basic Commands (Intermediate):
  explain     Get documentation for a resource
  get         Display one or many resources
  edit        Edit a resource on the server
  delete      Delete resources by file names, stdin, resources and names, or by
              resources and label selector

Deploy Commands:
  rollout     Manage the rollout of a resource
  scale       Set a new size for a deployment, replica set, or replication controller
  autoscale   Auto-scale a deployment, replica set, stateful set, or replication controller
```

Full group list: Basic (Beginner), Basic (Intermediate), Deploy, Cluster
Management, Troubleshooting and Debugging, Advanced, Settings.

> Caveat: the group/description text above is assembled from the Kubernetes docs
> and source, not from running `kubectl --help` on this machine. The row *format*
> (bare name + padding + description) is verbatim from `templater.go`; the exact
> column widths in a real terminal may differ.

---

## gh (captured locally, `COLUMNS=92`)

Top level — prefix appears once, in `USAGE`:

```
Work seamlessly with GitHub from the command line.

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:        Authenticate gh and git with GitHub
  browse:      Open the repository in the browser
  codespace:   Connect to and manage codespaces
  gist:        Manage gists
  issue:       Manage issues
  org:         Manage organizations
  pr:          Manage pull requests
  project:     Work with GitHub Projects.
  release:     Manage releases
  repo:        Manage repositories

GITHUB ACTIONS COMMANDS
  cache:       Manage Github Actions caches
  run:         View details about workflow runs
  workflow:    View details about GitHub Actions workflows

ALIAS COMMANDS
  co:          Alias for "pr checkout"

ADDITIONAL COMMANDS
  alias:       Create command shortcuts
  api:         Make an authenticated GitHub API request
```

Nested (`gh pr --help`) — **still bare names**, prefix only in `USAGE`:

```
Work with GitHub pull requests.

USAGE
  gh pr <command> [flags]

GENERAL COMMANDS
  create:      Create a pull request
  list:        List pull requests in a repository
  status:      Show status of relevant pull requests

TARGETED COMMANDS
  checkout:    Check out a pull request in git
  checks:      Show CI status for a single pull request
  close:       Close a pull request
  comment:     Add a comment to a pull request
  diff:        View changes in a pull request
  edit:        Edit a pull request
  lock:        Lock pull request conversation
  merge:       Merge a pull request
  ready:       Mark a pull request as ready for review
  reopen:      Reopen a pull request
  review:      Add a review to a pull request
  unlock:      Unlock pull request conversation
  view:        View a pull request

FLAGS
  -R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

INHERITED FLAGS
  --help   Show help for command
```

Note the trailing-colon style on names, and `FLAGS` / `INHERITED FLAGS` split —
the same distinction `localOptions()` is making with `Options:` /
`Global Options:`.

---

## docker (captured locally, `COLUMNS=92`)

Top level:

```
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images

Management Commands:
  builder     Manage builds
  buildx*     Docker Buildx
  container   Manage containers
  context     Manage contexts
  image       Manage images
  network     Manage networks
```

Nested (`docker image --help`):

```
Usage:  docker image COMMAND

Manage images

Commands:
  build       Build an image from a Dockerfile
  history     Show the history of an image
  import      Import the contents from a tarball to create a filesystem image
  inspect     Display detailed information on one or more images
  load        Load an image from a tar archive or STDIN
  ls          List images
  prune       Remove unused images
  pull        Download an image from a registry
  push        Upload an image to a registry
  rm          Remove one or more images
  save        Save one or more images to a tar archive (streamed to STDOUT by default)
  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE

Run 'docker image COMMAND --help' for more information on a command.
```

Two things worth stealing:

- `Common Commands:` vs `Management Commands:` — the split separates "verbs you
  run" from "nouns you drill into". `fob-worker` is *all* nouns
  (lines/stations/steps/workpieces/procs), so this may not map.
- The trailing hint line. Cheap, and it teaches the next level.

---

## git (captured locally)

```
usage: git [-v | --version] [-h | --help] [-C <path>] ... <command> [<args>]

These are common Git commands used in various situations:

start a working area (see also: git help tutorial)
   clone     Clone a repository into a new directory
   init      Create an empty Git repository or reinitialize an existing one

work on the current change (see also: git help everyday)
   add       Add file contents to the index
   mv        Move or rename a file, a directory, or a symlink
   restore   Restore working tree files
   rm        Remove files from the working tree and from the index

examine the history and state (see also: git help revisions)
   bisect    Use binary search to find the commit that introduced a bug
```

Bare names again, three-space indent, lowercase prose group headings, and each
group carries a "see also" pointer. `git remote --help` opens a man page rather
than a short help listing, so git has no nested-list example to compare.

---

## npm (captured locally) — the outlier

```
npm <command>

Usage:

npm install        install all the dependencies in your project
npm install <foo>  add the <foo> dependency to your project
npm test           run this project's tests
npm run <foo>      run the script named <foo>

All commands:

    access, adduser, audit, bugs, cache, ci, completion,
    config, dedupe, deprecate, diff, dist-tag, docs, doctor,
    ...
```

npm *does* repeat `npm ` — but only in a hand-written **examples** block, which
is a different thing from a command list (it shows real invocations with
arguments). Its actual command list is a bare comma-separated flow. So this is
not a counterexample.

---

## Summary

| CLI | prefix in rows? | grouping | nested level |
|---|---|---|---|
| kubectl | no (`cmd.Name()`) | 7 labelled groups | bare |
| gh | no | labelled groups | bare |
| docker | no | Common / Management | bare |
| git | no | prose groups + see-also | n/a (man page) |
| npm | only in examples block | none | n/a |
| **fob-worker** | **yes, every row** | none | **doubled prefix** |

Conventions worth adopting, in order of payoff:

1. **Bare command names.** Unanimous. Reclaims ~11 columns at the top level and
   ~22 at nested levels — which is also what fixes the mid-word splitting,
   without needing to shorten any description.
2. **Prefix once, in the usage line.** Already done (`$0 <resource> <action>`).
3. **A trailing hint** (`Run 'fob-worker workpieces <action> --help' ...`).
   One line, docker-style.
4. **Grouping.** Only kicks in past ~10 commands. `fob-worker` has 6 resources
   and 2–6 actions each, so defer.

## Implementation note

yargs 17 offers no switch for this. It composes `parentCommand + subcommand` for
nested rows; verified by probe that neither `.scriptName('')` nor a per-command
`.usage()` overrides it:

- `.scriptName('')` on a nested builder strips `fob-worker` but leaves
  `workpieces` → `workpieces list`
- `.scriptName(' ')` just adds indent
- object-form `.command({command, describe, handler})` — no change
- the same commands on a **root-level** instance with `.scriptName('')` render
  correctly bare → so the prefix comes from nesting, not from scriptName

Getting Cobra-style output therefore means rendering the command list manually
(iterate the registered commands, `rpad` the names, emit) rather than
configuring yargs. kubectl's own renderer is ~1 line of format string, so this is
small — and iterating yargs' registered command list keeps it from drifting out
of sync as commands are added.
