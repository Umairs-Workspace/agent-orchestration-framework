# 164 · Every project change reaches the global store — Outcome

## Delivered

### Local files are canonical for a node's own items
A project's own records are the source of truth on reads and on writes: the global store is a projection updated only from files, and it adds only what this disk does not hold — other projects, and work another machine owns (stories 00 and 02; m164/00 and m164/02 outcomes state each half).

### One sync pass, three drivers
Every change to a record file reaches the store through one pass — detect against the observed baseline, mark in the existing effects journal, drain through `publish-projection` — run by every CLI command for its own workspace, by the daemon at start and by every daemon tick over the registered set, whether or not a verb raised an event (m164/00, m164/01).

### No sibling ledger
Sync state lives only in `journal.sqlite` and `projection.sqlite`; no package source opens any other database under the global mesh root (FF-16403), and no module writes a record doc from a stored row (FF-16404).

### An owed sync lands and is visible
An owed publish never gives up and the operator can read its lag in doctor (m164/03); a publish over a partial node roster leaves membership intact and stays owed (m164/01).

## Assumptions

- **Workspace identity is not cwd-derived for the tick** — the daemon addresses projects by registered descriptor; the identity half of TECH_DEBT item 4 remains.
- **Node records are readable** — while any record under `~/.aof/mesh/nodes` is torn, every workspace's publish is refused (loudly) until it is repaired; the store goes stale for those projects, and local reads still answer from disk.

## Gaps

### Cross-workspace `aof work find`
- **Status:** open-by-decision
- **Discharge condition:** a workspace selector on `find`, if the operator asks for one; until then fleet is the cross-project view.
`aof work find` answers only the workspace it runs in.
