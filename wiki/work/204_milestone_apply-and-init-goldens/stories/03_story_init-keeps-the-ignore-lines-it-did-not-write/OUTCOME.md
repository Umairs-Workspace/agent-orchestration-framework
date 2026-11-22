# 03 · Init keeps the ignore lines it did not write — Outcome

## Delivered

### `aof init` adds its ignore line instead of writing the file

`aof init` adds `/work/` to `.aof/.gitignore` through the file's additive owner, `ensureWorkspaceGitignore`, so the user's lines and the entries `aof work init` wrote survive it, and a fresh file is unchanged. Only the additive owner writes `.aof/.gitignore` (ADR-005).

### `aof init` is held to baselines

The `project-init` lane holds init on an empty folder (`empty`, whole), over the user's ignore files (`customised`), after `aof work init` with `work-init/claude` as its base (`after-work-init`, keeping `work init`'s lock section whole), and a second init that refuses and changes nothing (`re-init`).

### The `--global` path writes only into the temp home

The `global` scenario holds `assets add --global` writing into the isolated global home, a global command refused, and the project rendering the global assets it uses.
