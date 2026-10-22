# 07 · An idle tick walks nothing — Outcome

## Delivered

### The serving daemon watches each work tree it syncs
`mesh serve` holds one recursive watch per work dir that its sync pass covers, a backed-off one included. A lane or a checkout off the mesh is not watched. A registration that leaves the tick set loses its watch on that tick, a tick whose registry read failed changes no watch, and the daemon's stop closes them all. Nothing else in aof arms a watch (FF-16706).

### An unchanged watched tree costs no stat walk
`statWorkTree` (`packages/work/src/discovery.mjs`) answers a watched tree from its last complete walk until a watch event dirties it or that walk is 5 minutes old. So the stat gate, the backoff check and the presence read walk nothing on an idle tick. An event naming a record doc, a folder or nothing dirties the tree. One naming any other extension (a run record, a log) does not. An event during a walk makes the next ask walk again, and asks during a walk share it.

### A tree that cannot be watched is walked as before, said once
A watch that cannot start, or errors later, is closed. Its tree is walked on every ask, and one `work-tree-watch-unavailable` degrade names the dir. It is not armed again in that process.

### Every walk is a counted cause
`stat-walk` is in the cost meter's closed cause set. In a process holding watches, every real walk is counted under it, labelled `unwatched`, `first`, `changed` or `safety`.

## Assumptions

- **An unwatched process walks as ADR-003 says** — the CLI, `mesh ui` and the tests arm no watch, so their reads walk on every ask, uncounted.
- **The OS delivers watch events** — on Linux each watched folder costs an inotify watch, and a change made from Windows to a `/mnt/c` tree raises no event there; such a tree is at most 5 minutes stale.
