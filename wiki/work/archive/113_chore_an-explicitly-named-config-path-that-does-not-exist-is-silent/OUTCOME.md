# 113 · An Explicitly Named Config Path That Does Not Exist Is Silent — Outcome

## Delivered

### A config the operator NAMED and that is not there is a fault; one merely not DISCOVERED is not
`configFaultFrom` (`src/work.mjs:216`) takes the `explicit` discriminator `loadWorkspace` already
holds and returns a `missing-config` fault for an absent config that arrived through `--config`,
`null` for one it failed to discover by walking up from the cwd, so an unconfigured project stays a
legitimate silent state while a mistyped path does not.

### `ENOTDIR` is absence, not unreadability
A named path whose parent is a file reaches the same `missing-config` fault as one whose parent is
empty, so the operator is told the file is not there rather than that it could not be read.

### `aof work doctor` carries a third code through the finding chore 94 added
`config-missing` (`src/commands/doctor.mjs:228`) is an `error` finding appended at the workspace-level
edge, so no `scope` filters it away, and its message differs from the two present-but-unusable codes
in the one way it must: with no file to fix and no parse position to report, it names the path that
was passed and offers dropping the flag to let the config be discovered.

### The load door still degrades
`loadWorkspace` returns `{}` for a named-but-missing config and never throws, so every daemon and face
that loads through it still resolves its defaults; the fault is reported alongside the load, never in
place of it.

### The two halves of the discrimination cannot drift apart
`test/config-fault-visible.test.mjs` pins that a falsy `--config` reads as DISCOVERY to the fault
predicate and the path-resolution predicate alike — 14 lanes green (6 from chore 94, 8 added here) —
so a discovered path can never be reported as a named one that is missing.

## Assumptions

- **`--config` is the only way a config is NAMED** — `loadWorkspace(cwd, explicitConfig)` is the sole
  caller of `configFaultFrom`, and `Boolean(explicitConfig)` at that one call site is the whole of the
  discriminator; a future second path to a caller-supplied config path would have to pass `explicit`
  itself or fall silently onto the discovered side.
