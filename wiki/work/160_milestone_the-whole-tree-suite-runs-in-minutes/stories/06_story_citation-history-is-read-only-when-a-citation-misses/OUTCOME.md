
# 160/06 · Citation history is read only when a citation misses — Outcome

## Delivered

### Citation history is a lazy source
`readRenameMap` answers a loader whose first `load()` reads git history once. Doctor's snapshot, its wiki probe, validate's reads check and tune all resolve each citation on disk first, and call `load()` only on a miss.

### A stream whose citations resolve spawns no git for them
`aof work validate 160` makes no git call (4 before). Doctor and validate report byte-identical `--json` findings to the eager build, and one wave case makes 82 git calls instead of 132.

## Assumptions

- **A miss is rare in a live stream** — a stream that cites a moved file still pays the full history read once per command.
