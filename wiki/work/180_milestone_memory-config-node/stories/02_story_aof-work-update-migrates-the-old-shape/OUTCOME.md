# 02 · aof work update rewrites an old-shape memory config to the new node, and aof work init writes only the new shape — Outcome

## Delivered

### The update migrates the old shape
`aof work update` rewrites `memory.sources`, `memory.graphify` and a root `graph` into `memory.corpora`, `memory.backends.graphify` and `memory.graph`, reports one `memory:` line per move, and leaves every other key of the project config unchanged. A setting spelled both ways is left exactly as written, for the operator to choose.

### Init writes only the new shape and selects local
`aof work init-config` writes a memory node in the new shape with `memory.backend: "local"`, and the `/aof:init` command and its renders say that local is the default a new project gets and that it sends nothing to a hosted model.

## Assumptions

- **Only the project config is migrated** — the global `~/.aof/aof.config.json` keeps whatever spelling it has (STATE D5).
- **An existing selection is kept** — a project that already names `graphify` keeps it, because only new projects get `local`.
