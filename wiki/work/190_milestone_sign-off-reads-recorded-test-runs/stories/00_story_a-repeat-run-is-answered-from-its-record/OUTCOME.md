# 190/00 · A repeat run is answered from its record — Outcome

## Delivered

### Every `aof test` run leaves one record keyed to its content
`aof test` takes a content key before it launches (the tree including uncommitted changes, `wiki/work` included) and files one record under `<git common dir>/aof/test-records/` holding the key, scope, selection, result and what widened. `packages/work/src/testing/record.mjs` is its only writer, and the agent supplies no field of it (FF-19001, FF-19004).

### A repeat on the same content is answered from its record
A run whose key and selection a stored record covers is answered with `answered from the run of <instant> (tree <id>)` and launches nothing. A red record answers only the identical selection, and `--fresh` forces a launch.

### Callers asking together make one run
A caller whose selection an in-flight run covers waits on that run's lock instead of launching its own. The lock and the record are placed by write-then-`link`, so a reader never sees half of one.

### No door decides from a test record
No status, doctor, loop, audit or bundle door imports the record store (FF-19002). The record answers `aof test`, and the regression gate's own row still decides the accept door.

## Assumptions

- **Ignored content is outside the key** — a hand edit inside `node_modules` or another `.gitignore`d path keeps the key, and `--fresh` is the repair.
- **The key is taken before the run** — edits made while a run is in flight are filed under the pre-run key.

## Gaps

### A small asked selection waits on a large in-flight run
- **Status:** open
- **Discharge condition:** ADR-002 §4 waits only on an identical in-flight selection, or bounds the wait by the asked selection's own expected cost.
A lane asking for one 13 s suite waits out a covering whole-tree run (53 min measured), up to `work.test.deadlineMs` (2 h). This was raised at 00's review close for the operator, and has not been ruled on.

### The loop's review baseline is a second producer of the tree id
- **Status:** open
- **Discharge condition:** `readBuildBaseline` (`packages/work-loop/src/commands/loop.mjs`) takes its key from `record.mjs`, and FF-19004's baseline shrinks to the hyperagent extraction alone.
FF-19004 holds with a named, shrink-only baseline of two pre-existing modules.
