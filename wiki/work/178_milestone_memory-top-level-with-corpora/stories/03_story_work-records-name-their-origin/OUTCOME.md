# 03 · A recalled work record names the planning document its item came from — Outcome

## Delivered

### Records carry a resolved origin
Every `MemoryRecord` carries `origin`, a list of project-root-relative, forward-slashed paths that each name an existing file. It is `[]` when there is none, and a story without its own `origin:` takes its top-level driver's.

### Origin resolution
A declared `origin:` value is tried relative to the project root, then to the record doc's folder, then to that folder as it stood before archiving. A value naming no file is dropped and counted in `aof memory status` as `origin.unresolved` (6 on the live stream).

### Recall shows origin
`--block` appends ` · origin <p1>; <p2>` before the source, the text view adds a `↳ origin` line, and `--json` carries the field. A record with `origin: []` renders byte for byte as before.

### Index version 4
`INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` are 4 in lockstep, and a version-3 store reports stale until `aof memory ingest` rebuilds it.

## Assumptions

- **Origin is never scored** — it is not tokenised, boosted or filtered on, and no `--origin` scope exists.
- **Import-store and auto-memory records carry `origin: []`** — their items are not stream items.

## Gaps

### Six archived SPECs name a moved research file
- **Status:** open-by-decision
- **Discharge condition:** someone repairs the six archived SPECs' `origin:` to `wiki/planning/research/RESEARCH-agent-loop-economics.md`.
Six archived items declare `wiki/planning/RESEARCH-agent-loop-economics.md`, which has moved, so their records carry no origin.
