# 01 · aof memory is the command and aof work memory its alias — Outcome

## Delivered

### The aof memory route
`aof memory <verb>` is a registered command at route `["memory"]`, answering recall, record-recall, recurrence, ingest, reindex and status through the one core path `runMemoryVerb`.

### The work memory alias
`work:memory` at route `["work", "memory"]` is a second registered door whose input, run, argv, render and json are the canonical command's own function objects, so both spellings print the same bytes for every verb and projection.

### Help and hints spell aof memory
`aof --help` lists `memory` as a family of its own, and the usage text, the stale-store hint, import-milestone's reindex warning and the work-command examples all name `aof memory`.

## Assumptions

- **The alias keeps the id `work:memory`** — the command inventory, the cli-bijection and route-coverage controls, and anything keyed on the id resolve through it.

## Gaps

### Retiring the alias
- **Status:** open-by-decision
- **Discharge condition:** nothing outside this repo spells `aof work memory`, and an item of its own removes the door.
`aof work memory` has no removal date and is still listed under Work in `aof --help`.
