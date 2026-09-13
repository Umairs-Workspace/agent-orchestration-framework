---
type: story
number: 05
slug: this-tree-holds-what-is-live
title: "This tree holds what is live — the repository sets intake to backlog, archives its done items, and the outsider's check passes on the real stream"
parent: 127
depends: [1, 2, 3, 4]
status: not-started
owner: product-owner
created: 2026-09-11
updated: 2026-09-11
adrs: [ADR-002, ADR-004, ADR-005]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-004
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-005
  - src/commands/archive.mjs
  - src/commands/promote.mjs
  - src/work.mjs
  - src/board-ui.mjs
  - .aof/aof.config.json
  - wiki/work/TECH_DEBT.md
files:
  - .aof/aof.config.json
  - wiki/work/TECH_DEBT.md
  - test/work/stream/work-this-tree-holds-what-is-live.test.mjs
  - test/work/stream/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · This tree holds what is live

## User story

As **the operator of this repository**,
I want **`.aof/aof.config.json` to set `work.intake: "backlog"`, `aof work archive --done` to move
every accepted driver under `wiki/work/archive/`, and the SPEC's outsider check to pass on the
real stream rather than a fixture**,
so that **the root of `wiki/work` is a short list of live items** and the milestone is proven on
the tree it was framed against — 3,102 citations by number still resolve, the 81 done → done prose
links still open, and `next` / `loop` / the default listings never propose an archived item.

What lands:

- `work.intake: "backlog"` in this repository's config (the one config write in the milestone).
- `aof work archive --done` run over the stream: every `done` driver moves, name verbatim; the
  live items stay; `git status` shows renames, not rewrites, apart from the crossing prose links
  ADR-004 names.
- The outsider check, as a behavioural test over the real tree and as recorded evidence: add an
  item and find it under `backlog/` with no number; promote it and find it at the root with the
  next number, with `find`, `validate`, `next` and the board agreeing; `aof work find 52`,
  `read 52`, `memory ingest`, `depends` resolution and `validate` answer for the archived
  milestone while `next`, `loop` and the default listings do not.
- The `TECH_DEBT.md` entries this milestone discharges (the three `ITEM_RE` homes, the seven
  scanners) are deleted from the ledger, not annotated.

## Tasks

- to be authored at the story's own refine (`aof:refine 127/05`)

## Notes

- The folder moves are this story's diff and are large by construction; the reviewer reads them
  as renames. The story writes no `src/` file — `files:` is the config, the ledger and its own
  suite.
- `depends: [1, 2, 3, 4]` — this is the last story, and the only one that touches the live stream.
- Archiving is NOT part of the `aof:verify 127` ceremony; the ceremony accepts, the operator
  archives, and this story is where that order is exercised once for real.
