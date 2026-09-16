# 103 · Doctor Reports Health Over A Stream It Cannot See — Outcome

## Delivered

### Depth-independent workspace resolution
`findProjectConfig` walks UP from the directory it is handed, so `work.dir` resolves against the
directory `aof.config.json` was found in rather than `process.cwd()` — every reader of a workspace
path answers identically from the repo root, from `src/`, and from a work-item folder.

### Bounded walk
The upward walk stops at aof's own config home (both the configured `AOF_GLOBAL_HOME` and the
conventional `~/.aof`) and at an ancestor `.aof` state dir, so a temp-dir fixture never adopts the
operator's real home and a mesh worktree resolves itself rather than the origin it was materialised
inside.

### An empty scan is a refusal, not a pass
`aof work doctor` over zero items emits an `error: empty-stream` finding naming the directory it
scanned and exits non-zero; an empty result set and a clean result set no longer render identically.

### The cwd-independence regression is pinned
`test/doctor-cwd-independence.test.mjs` drives the real CLI with a real `cwd` across five cases, and
asserts the finding set is non-empty before asserting equality across directories.

## Assumptions

- **`--explain` / `--converge` return before the snapshot is built** — the empty-stream refusal sits
  at the snapshot edge, so the ledger modes are unreached by it and keep their existing exits.

## Gaps

### `work doctor` is red between `init` and the first item
- **Status:** open
- **Discharge condition:** a doctor that distinguishes "scanned the wrong directory" from "an
  initialized project that legitimately holds no items yet", and passes on the latter.
A freshly initialized project with no items answers `error: empty-stream` and exits 1. The finding's
prose names both causes rather than guessing, but the state is reported as an error.
