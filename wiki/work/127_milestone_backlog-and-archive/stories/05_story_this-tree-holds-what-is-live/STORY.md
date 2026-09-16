---
type: story
number: 05
slug: this-tree-holds-what-is-live
title: "This tree holds what is live — the repository sets intake to backlog, archives its done items, and the outsider's check passes on the real stream"
parent: 127
depends: [1, 2, 3, 4]
status: in-review
owner: product-owner
created: 2026-09-11
updated: 2026-09-16
adrs: [ADR-002, ADR-004, ADR-005]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-003
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-004
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-005
  - wiki/work/127_milestone_backlog-and-archive/stories/03_story_archive-is-a-move/tasks/01_only-the-links-that-cross-the-line-are-rewritten.feature
  - src/commands/archive.mjs
  - src/work/archive.mjs
  - src/commands/promote.mjs
  - src/work.mjs
  - src/board-ui.mjs
  - src/work/init.mjs
  - ui/src/board/model.ts
  - test/support/cli-spawn.mjs
  - test/support/board-face-fixture.mjs
  - test/store/cache-authority-own-disk-read.test.mjs
  - test/work/stream/work-archive-is-a-move.test.mjs
  - test/arch/planning/acd-tune-carries-no-second-rule.test.mjs
  - test/arch/command/acd-declared-program-single-speller.test.mjs
  - wiki/planning/PRD-command-spine-effects-ledger.md
files:
  - .aof/aof.config.json
  - wiki/memory.md
  - wiki/work/TECH_DEBT.md
  - test/work/stream/work-this-tree-holds-what-is-live.test.mjs
  - test/work/stream/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/work/stream/work-archive-is-a-move.test.mjs
  - test/loop/work-loops-checks.test.mjs
  - test/loop/work-loops-commands.test.mjs
  - test/loop/work-loops-coverage-ledger.test.mjs
  - test/loop/work-loops-record.test.mjs
  - test/loop/work-loops-registry-census.test.mjs
  - test/loop/work-loops-value.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/watcher-independence-gate.test.mjs
  - test/memory/anchor-taxonomy.test.mjs
  - test/memory/memory-indexing.test.mjs
  - test/work/record/work-story-depends.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/work/feature-parse-strict.test.mjs
  - test/work/gate/work-validate-contract-parses.test.mjs
  - test/arch/audit/acd-no-staged-control.test.mjs
  - test/arch/grade/acd-register-declaration-form.test.mjs
  - test/arch/work/acd-milestone-66-controls-resolve.test.mjs
  - test/arch/memory/acd-memory-derived-index.test.mjs
  - test/arch/graph/acd-graphify-records-from-parsers.test.mjs
  - test/arch/mesh/acd-presence-aggregates-node-workspaces.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/ui/acd-render-lane-is-gated.test.mjs
  - test/graph/graphify-reranking.test.mjs
  - test/testing/repo-test-isolation-guard.test.mjs
  - test/command/declared-id.test.mjs
  - test/planning/planning-prd.test.mjs
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
the tree it was framed against — 3,102 citations by number still resolve, the prose links that
cross the line still open, and `next` / `loop` / the default listings never propose an archived
item.

What lands:

- `work.intake: "backlog"` in this repository's config — one added line — and the add → promote
  half of the outsider check proved on a byte-faithful SHAPE COPY of the real stream (every
  record doc and feature, no `runs/`), never by writing the real tree (task 00).
- `aof work archive --done` run over the stream for real, once: every `done` driver moves, name
  verbatim; the live items stay; the staged diff is renames plus the crossing prose links; the
  four links outside `wiki/work` are fixed by hand; `memory ingest` regenerates the index (task
  01, `@manual`, recorded as evidence).
- The outsider check as a suite over the REAL tree: the root holds only live items, `find 52` /
  `doc 52` / `doctor 52` / `validate` answer for the archived milestone, `next` and the default
  listings never propose one, `next 32` is still `ready` through eleven archived dependencies, the
  board face agrees, no relative link resolves worse than before, the two path-readers stay
  green (task 02).

## Tasks

- [x] 00 `the-repository-sets-intake-to-backlog` — the one config line; add → promote on the shape copy; find, validate, next and the board agree
- [x] 01 `every-done-driver-moves-under-archive` — `@manual`: the confirm gate, the move, the staged renames, `wiki/memory.md`, `memory ingest`, the ledger
- [x] 02 `the-outsider-check-passes-on-the-real-stream` — `@executable` over the real tree: readers answer, walkers exclude, the link ratchet, the path-readers

## Notes

- The folder moves are this story's diff and are large by construction; the reviewer reads them
  as renames. The story writes no `src/` file — `files:` is the config, two docs and its own
  suite plus the budget row it raises (`test/work/stream` 34 → 35), and (repaired at the build,
  2026-09-16) the 27 test files that read a real item folder at run time: the ten 127/03's census
  named, seventeen more the census's regex could not see (`path.join(…, "wiki", "work", "NN_…")`
  and two helpers deriving the item from a path's leading segment), each pointed at
  `wiki/work/archive/<name>` — a folder that never moves again — or, for live 129, at `findWork`.
- `depends: [1, 2, 3, 4]` — this is the last story, and the only one that touches the live stream.
  Do it LAST, on a clean checkout, on the milestone branch, never `git add -A`.
- Archiving is NOT part of the `aof:verify 127` ceremony; the ceremony accepts, the operator
  archives, and this story is where that order is exercised once for real. `127` itself stays at
  the root until the operator archives it after its own accept.
- Ratified at refine (2026-09-15), in the contracts: the stream holds 125 `done` drivers, not the
  SPEC's 123 (two accepts since framing) — the contract names refs, never counts, except the link
  ratchet (task 02); `TECH_DEBT.md` records NO entry for the three `ITEM_RE` homes or the seven
  scanners, so there is nothing to delete — the SPEC described a debt the code carried, not one
  the ledger held (task 01); 03/01's "nothing outside `wiki/work` links into an item folder" is
  off by four — `wiki/memory.md` links into `05_milestone_work-memory`, fixed by hand here, so
  `wiki/memory.md` joins `files:` (task 01); there is no `aof work read` or `aof work recent` verb —
  the SPEC's "read 52" is `doc 52 SPEC`, and `recent` is a prompt over `work:list` (task 02);
  `42_structural-overhaul` is not an item and stays at the root (tasks 00–02).
