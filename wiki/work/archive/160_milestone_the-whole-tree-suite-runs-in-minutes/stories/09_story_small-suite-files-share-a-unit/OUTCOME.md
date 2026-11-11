# 160/09 · Small suite files share a unit — Outcome

## Delivered

### Short suite files share a process
The sharded runner packs whole files estimated under `--pack-seconds` (15) into units of about `--pack-target-seconds` (60), largest first, never splitting a file; this repository's plan is 339 units (68 packed, holding 964 files) where it was 1,235.

### Every account stays per file
The shard entry prints `# file <path> <seconds> <executed>` for each file it runs, import time included, so timings, lost-case detection and a not-finished report still name files; a failed packed unit is retried alone as a unit.

## Assumptions

- **A suite leaves no process state behind** — files that share a unit share a process, as the serial runner always did; a suite that leaks state into the next file now shows it in a sharded run too.
