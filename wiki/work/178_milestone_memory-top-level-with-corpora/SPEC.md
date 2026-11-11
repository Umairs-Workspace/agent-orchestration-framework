---
type: milestone
number: 178
slug: memory-top-level-with-corpora
title: "Memory is its own command — aof memory replaces aof work memory, and a recalled work record names the planning document its item came from"
status: done
owner: product-owner
created: 2026-10-28
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
origin: wiki/planning/PRD-memory-engine.md
depends: [177]
---
# 178 · Memory is its own command

## Objective

Memory sits under `work` because the work stream was its only corpus in milestone 05. It is its own
concern now: its config is already a top-level `memory` object (05/ADR-002), and every planning and
delivery prompt recalls through it. After this milestone memory is its own face, `aof memory <verb>`,
with `aof work memory` kept as an alias that answers byte for byte the same; every bundle prompt and
skill spells the new command; and a recalled work record names the planning document its item came
from, so an agent that recalls a lesson or an ADR can open the PRD behind it. The work stream is the
corpus recall searches, as today; the planning documents are reached through the `origin:` links the
work stream already carries (34 drivers, 17 of the 19 files under `wiki/planning`), never indexed.

An outsider can verify it by running `aof memory recall "<query>"` and `aof work memory recall
"<query>"` and getting the same bytes, and by seeing a recalled ADR from a shatter-framed milestone
cite its PRD.

## Scope

In scope:

- The `aof memory` face: the existing verbs (recall, record-recall, recurrence, ingest, reindex,
  status) answer under `aof memory`, through the one existing implementation. `aof work memory`
  stays as an alias that prints nothing extra.
- The migration: every bundle prompt, reference, loop and skill that spells `aof work memory`
  spells `aof memory`, including `shatter.md` (which Cowork's planning skill is rendered from, so
  Cowork calls the same command against the same index as Claude Code and Codex) and the wording in
  the Hyperagent planner's skill files. The generated runtime folders are re-rendered from them.
- Work records carry their item's `origin:`: every record indexed from a work item names the
  planning document(s) its item, or its top-level driver, declares, resolved to a project-root path
  that exists. Recall's block, text and JSON projections show it.

Out of scope:

- Indexing `wiki/planning` as a corpus of its own, and a `--corpus` scope. The links reach the
  planning documents a work item names; a document no item links to stays unreached (two today).
- Memory verbs on the MCP server, and any route for the Hyperagent planner to reach aof's memory.
  Hyperagent planning uses Hyperagent's own knowledge indexing; it gets only the wording change.
- Whether `aof` runs inside Cowork's shell. 165 (RESEARCH R5) owns that; this milestone changes
  only the spelling Cowork's skill calls.
- New backends or ranking changes. `origin` is shown, never scored.
- UI.

Recall applied (id `f85f7807-b819-47b6-b974-4df5f4db744e`, owned by `cognee-fit-for-aof`):
13/ADR-003's rule that new knowledge enters by extending the indexer's scan, never by a bespoke
store, is honoured: `origin` is read by the existing scan from the item's own record doc.

## Stories

- [x] `stories/01_story_aof-memory-is-the-command/` — `aof memory` is the command and `aof work memory` its alias
- [x] `stories/02_story_prompts-spell-aof-memory/` — every bundle prompt, skill and doc spells `aof memory` (depends on 01)
- [x] `stories/03_story_work-records-name-their-origin/` — a recalled work record names the planning document its item came from

## Dependencies

- `memory-retrieval-precision` (177, done) — its finding on homes is in: what happened and what is
  true keep their 157/05 homes (177, `## Finding`, Homes). This milestone adds no home; it links the
  work home to the planning documents it already cites.
- `memory-engine-port` (179) and `memory-config-node` (180) — not dependencies. Nothing here adds a
  source or a backend, so neither absorbs anything from this milestone.
- `memory-recall-pick` (backlog) — not a dependency, but it touches the same recall plumbing: the
  recall block's shape and the `refine-po` recall. Whichever is refined second reads the other's
  ADRs, so the `origin` field on a block line (178/ADR-002) and a picked block do not diverge, and
  the prompt migration to `aof memory` (178/ADR-003) does not collide.
