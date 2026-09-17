# 01 · The stop request has one home — build plan

## Mechanism

The module is a leaf in the shape of `src/loop-diag.mjs`: it resolves its directory through the
same `globalMeshPaths({ env }).meshRoot` call the recorder makes, owns one file-per-loop under a
sibling directory of `logs/` and `loop-fixes/`, and takes every external thing as an injected
parameter (`process`, `now`, the directory, the poll interval) so the suite drives it against a
fake process (an `EventEmitter`) and an isolated `AOF_GLOBAL_HOME` with no real listener ever
registered on the test runner's process. Writes go through `writeText` (temp + rename) so a reader
never sees a half-written record; reads are absence-tolerant and a corrupt file degrades through
`reportDegrade` to `null`, never a throw into the loop.

`createStopSource` is the seam ADR-001 §5 fixes: a small object whose `level()` is
`max(signalsSeen, request.level)` clamped to 2, whose `signal` is one `AbortController`'s signal
aborted exactly once when the level reaches 2, and whose SIGINT/SIGTERM listeners are the source's
own persistent `process.on` pair — removed by the source itself at level 2 so a third signal falls
through to `loop-diag.mjs`'s last-listener repair (exit `128 + signo`). `producer()` is a value the
shell puts on a halt as data (`"SIGINT"` | `"SIGTERM"` | `"stop-request"`); nothing in this module
prints, narrates or knows about `LoopState`.

## Verification step

Run the loop-diag suite alone through the runner's `--only` selection under an isolated home and,
separately, a hand probe against the isolated home: `requestLoopStop` twice on one id, then
`readStopRequest` — the file exists under `<home>/mesh/loop-stops/<id>.json`, its keys are the
ten in order, `level` is 2 with `escalatedAt` set; a `createStopSource` over the same directory
with a fake process reports `level() === 2` after one `poll()` with `signal.aborted === true`, and
after `stop()` the process has no interval keeping it alive (the probe script exits on its own).

A wrong build shows as any of: a file under the project tree, a request whose level climbs past 2,
a `signal` that aborts at level 1 (a drain that kills), a third signal still swallowed (the probe
process does not exit), or `readStopRequest` throwing on a corrupt file.

## Out of scope

- Consuming the source in `runLoopBody` — story 02's; this story lands the producer only.
- Writing `by`'s node id from a workspace — the caller (the verb, story 02) supplies `by`.
- The presence read of a request (`stop: null | "drain" | "cancel"`) — story 03 maps
  `STOP_LEVELS` from here; this module exports the map and nothing more.
- Any registration in the loop suite index or the budget table — story 05's.

## Known traps

- `process.once` semantics vs the source's persistent listeners: the shell (02) deletes its own
  `once` pair; until then, both exist in a live tree and the level still reads correctly because
  the source counts its own signals only.
- Node's `os.constants.signals` has no `SIGBREAK` outside Windows; the source registers only
  `SIGINT` and `SIGTERM` (ADR-001 §5) — do not widen to the recorder's four.
- A `setInterval` that is not `unref()`'d holds a finished loop open for ever — the recorder's
  `alive` interval is the pattern to copy.
