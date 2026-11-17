# 199 · Each person on a shared repository keeps their own settings in an uncommitted local config — Outcome

## Delivered

### Per-person config layer
`.aof/aof.config.local.json` is read by `loadWorkspace` and laid over the project's `.aof/aof.config.json`, which lies over `~/.aof/aof.config.json`; each block keeps its own merge (`work.operator.role` wins whole, `expertise` merges per domain), and a repository with no local file loads exactly as before.

- **A loop lane is a linked git worktree of the starting checkout** — a lane with no local file of its own finds the starting checkout's through git's common directory (read from the `.git` file, no git spawned); a plain checkout, a submodule or a bare common dir reads only the file beside its own config.

### Allow-list of per-person keys
The local file honours only `work.operator`, `work.notify.channels` and `work.agents.session.effort`; any other value is reported as `config-local-key-not-allowed` at the leaf written, naming the local file, and never reaches the loaded config or a rendered command.

### Value provenance
`aof project show` and config inspection report each per-person value's source as `global`, `project` or `local`, with the file's path; an unreadable local file is an error, `config-local-unreadable`, rather than a silent skip.

### The local file stays out of git
`aof work init` and `aof work update` add `aof.config.local.json` to `.aof/.gitignore` exactly once, and `aof work doctor` warns `config-local-tracked`, naming `git rm --cached .aof/aof.config.local.json`, when git tracks one.

### init-config writes the operator profile locally
`aof work init-config` writes operator-profile flags to the local file by default, writes them to the committed file with `--project` and to the global file with `--global`, refuses `--project` with `--global`, and keeps team settings such as `--operator-aware` in the project file.

## Gaps

### init-config inside a linked worktree
- **Status:** open
- **Discharge condition:** `init-config` resolves the local file through git's common directory, as the loader does, or refuses from inside a linked worktree.
Run from inside a linked worktree, `init-config` writes the local file into that worktree's `.aof`, where it shadows the main checkout's file for that lane only.

### A local switch for messaging enable
- **Status:** open
- **Discharge condition:** `aof messaging enable` gains a `--local` switch, or the operator rules it unwanted.
`aof messaging enable` writes channels to the project file, or to the global one with `--global`; per-person channels for one repository are set in the local file by hand.
