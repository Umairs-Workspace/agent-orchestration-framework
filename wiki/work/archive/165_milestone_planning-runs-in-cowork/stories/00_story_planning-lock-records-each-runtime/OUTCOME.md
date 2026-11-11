# 165/00 · The planning lock records each runtime — Outcome

## Delivered

### One planning entry per runtime
`.aof/aof.lock.json` holds `planning: { runtimes: { <runtime>: <entry> } }`, and a planning init for one runtime leaves every other runtime's entry deep-equal and every non-`planning` section intact (FF-16501).

### A second runtime needs no --force
A planning init for a runtime with no entry is added beside the existing ones, while a re-install of a recorded runtime is refused without `--force`, and `--force` re-pins only the runtime it names.

### Legacy flat sections still read
A pre-165 flat `planning` section reads as its one runtime's entry, and the next write converts it to the per-runtime shape.

## Assumptions

- **The flat section names its runtime** — the legacy read maps `{ [section.runtime]: section }`, so a flat section with no `runtime` field has no entry to read as.
