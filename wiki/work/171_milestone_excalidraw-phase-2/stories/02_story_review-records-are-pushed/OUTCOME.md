# 02 · Review records are pushed — Outcome

## Delivered

### The diagram events stream
`GET /api/diagram/events` is one "look now" stream per open diagram: it says only that the review records or the scene moved, with the stamp that moved, and carries no record; the board face learns what to watch from `diagram:scene --action stamp`, re-stamps on a change, every 30 s as a safety, and every 2 s when no watch starts.

### The editor follows the stream
An answer or a proposal written by the architect appears in the open editor's panel without a reload (~210 ms measured); a draft saved elsewhere is taken in place by a clean canvas and offered as Reload to a dirty one; the editor's own writes never read as changed elsewhere, and the five-second poll runs only while the stream is down.

## Assumptions

- **The board face imports nothing of the diagrams package** — the stream invokes only `diagram:*` command ids (FF-17101), and its directory watcher and degrade reporter arrive from core's binding, so the server transport imports no filesystem of its own.
