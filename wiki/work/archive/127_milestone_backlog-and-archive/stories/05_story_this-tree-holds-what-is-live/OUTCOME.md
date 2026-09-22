# 127/05 · This tree holds what is live — Outcome

## Delivered

### This repository's intake is the backlog
`.aof/aof.config.json` sets `work.intake: "backlog"`; an `aof:add-*` on this tree lands
un-numbered under `wiki/work/backlog/`, and the add → promote round trip holds on a byte-faithful
shape copy of the real stream (every record doc and feature, no `runs/`).

### The done drivers are archived
`aof work archive --done --yes` moved 125 `done` drivers (67 milestones, 19 stories, 4 spikes, 35
chores) under `wiki/work/archive/`, name verbatim, in one run (`ed9c00c`): 2,289 renames,
1,710 crossing links rewritten in 161 files, no `number:`, `status:` or `updated:` line changed,
the four `wiki/memory.md` links fixed by hand, and the memory index regenerated. The root of
`wiki/work` reads as the live items and the three roots.

### The outsider's check passes on the real stream
`test/work/stream/work-this-tree-holds-what-is-live.test.mjs` runs over THIS tree: every root
folder is live or a sub-root, every `ITEM_RE` entry under `archive/` is a done driver, `find 52` /
`doc 52` / `doctor 52` / `validate` answer for the archived milestone, `next` and the default
listings never propose one, `next 32` is `ready` through its archived dependencies, the board face
excludes the archive by default and includes it on the parameter, no relative link resolves worse
than before the move, and the 27 test files that read a real item folder read it where it lives.

## Assumptions

- **the tree keeps moving** — the suite asserts properties, not the tree of 2026-09-16: later
  archives (42's, the GSD-era record) and later framings (131) are inside its claims
  (127/VERIFICATION `F-15`).
- **`127` archives after its own accept** — the milestone's folder stays at the root through the
  ceremony; `aof work archive 127` is the operator's act (127/ADR-004).
