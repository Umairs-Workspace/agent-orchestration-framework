# 165/00 · Planning lock records each runtime — example map

## R1 · Installing planning for a second runtime keeps the first
- E1 · The lock records claude at `5042ff61…`; I run `aof planning init --runtime codex` with no `--force`: the run succeeds, a codex entry is added, and the claude entry is exactly what it was [proposed]
- E2 · The lock holds a flat `planning` section written before 165 (runtime claude); I run `aof planning init --runtime codex`: the claude entry is carried over exactly as it was, now beside a codex entry [proposed]

## R2 · Re-installing a runtime that is already recorded needs `--force`, and `--force` touches only that runtime
- E3 · claude and codex are both recorded; I run `aof planning init` (claude) with no `--force`: refused, the message names claude and points to `--force`, and the lock file's bytes are unchanged [proposed]
- E4 · claude and codex are both recorded; I run `aof planning init --force`: claude is re-pinned with a new `generatedAt`, and the codex entry is exactly what it was [proposed]
- E5 · The lock holds a flat `planning` section for claude written before 165; I run `aof planning init` with no `--force`: refused, exactly as before 165 [proposed]
- E6 · Only claude is recorded; I run `aof planning init --runtime codex --dry-run`: the preview prints and the lock file's bytes are unchanged [proposed]

## R3 · The rest of the lock is never disturbed
- E7 · The lock carries `files`, `packages` and `work` sections plus a claude entry; I add codex: those three sections are byte-for-byte what they were [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-004 · What shape holds several runtimes? `planning.runtimes.<runtime>`, with one reader that maps a pre-165 flat section to its own runtime.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · Does a lock written by this version get rewritten to the new shape when only the legacy runtime is re-pinned with `--force`? Yes: the writer always writes the new shape.
