---
type: story
number: 02
slug: provenance-at-write-time
title: "Provenance at write time — who produced this claim, under which run, on what commit, and when"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Provenance at write time

## User story

As anyone who has to defend a claim this system recorded — a green grade, an anchor reading, a
verdict that something is stale —
I want the producing node, the run, the commit and the instant stamped **at the moment the claim is
written**,
so that a reading is evidence rather than an assertion, and so that nobody later has to reconstruct
its origin from a transcript and call the reconstruction a fact.

The arc's most claim-shaped artifact shows the gap exactly. The grade record carries `gradedAt` and
**nothing else** (`src/work-grade.mjs:341-348`): it knows *when* it was compiled and not *who*
compiled it, *on what commit*, or *under which run*. Every one of the four values is already
available and cheap — `deriveNodeId` (`src/node-identity.mjs:169`), the run under `runsDir(item)`
(`src/run-store.mjs:233-235`), `headCommit` (`src/mesh-worktree.mjs:345-350`), and an injected
instant. None is stamped.

The rule this story lands is short and has two halves that must arrive together: **stamp at write
time**, and **never back-fill**. A stamp the writer will invent when it is missing is not evidence;
it is decoration that reads like evidence, which is worse than nothing.

## Tasks

- [x] `tasks/00_the-envelope.feature` — the four-key stamp, with the producing node and instant always present and the run and commit nullable in a way that means something
- [x] `tasks/01_the-compiler-is-pure.feature` — the record compiler reads no clock, no filesystem and no git; every value is injected, and the same observation compiles to the same record
- [x] `tasks/02_an-unstamped-claim-is-refused.feature` — a claim record written without a complete stamp is refused with a code, and is never completed by guesswork
- [x] `tasks/03_a-reading-rides-the-run.feature` — an anchor reading is written where the work is committed, and never into the bundle-delivered registry

## Notes

- **`compileGrade` is the shape to copy, and it says so about itself.** *"gradedAt an INJECTED
  timestamp; this module reads no clock"* (`src/work-grade.mjs:391`). The impure edge gathers; the
  compiler is pure. That is why milestone 54's verdict rules are auditable, and it is why this
  story's provenance compiler has zero imports by design; `src/work-grade.mjs` now imports only
  that pure leaf.
- **The null is part of the contract, not a gap in it.** `run` and `commit` are nullable and the null
  is meaningful — a claim produced outside a run, or in a checkout with no git, is a *weaker claim
  and says so*. `node` and `at` are never null, because a claim whose producer or instant is unknown
  is not defensible in any degree. Admitting a null there would recreate exactly the
  declared-gap-equals-filled-field collapse `52/ADR-002` was written to prevent. ADR-003 §1.
- **No back-fill, structurally — because the cheapest wrong implementation is obvious.** Walking
  `~/.claude/projects` to infer the producing session is precisely what the milestone Objective names
  as guesswork, and it is what a later developer will reach for the first time a stamp is missing.
  `FF-5504`'s second leg is what stops it.
- **A reading may not live in `.aof/loops/`.** Milestone 53 made the registry an INSTALLED bundle
  artifact whose single source is `src/bundle/loops/`, with a consumer's edit drift-warned
  (`53/ADR-012`). A per-workspace reading written there is clobbered by the next `aof work update`.
  Run records live under `<item.dir>/runs/` — inside the work item, committed with the work, reviewed
  in the PR. **The registry declares anchors; the run record carries readings.** ADR-003 §5.
- **No new store, no new directory.** `53/ADR-004`'s precedent verbatim. A `.aof/anchors/` sidecar
  would be a second non-item directory in the workspace, against `52/ADR-001 §3`'s explicit ratchet,
  for data that already has a committed home.
- **Parallel-eligible from day one.** The stamper is a new module with no dependents on the day it
  lands; its write sites are reached additively.
- **This is what makes 55/01's `stale` verdict recordable later.** 55/01 reports and does not record,
  because `52/ADR-003` rejected a resolver without provenance as *"an instrument nobody can audit"*.
  This story is the discharge of that condition — say so in the outcome.
