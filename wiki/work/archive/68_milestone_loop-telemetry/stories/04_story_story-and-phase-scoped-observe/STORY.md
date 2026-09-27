---
type: story
number: 04
slug: story-and-phase-scoped-observe
title: "Observe answers for a story and a phase — the resolver that reads one level deep"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-21
depends: [68/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · Observe answers for a story and a phase — the resolver that reads one level deep

## User story

As someone asking why one story took as long as it did,
I want `aof work observe` to answer for a story ref and to report per phase,
so that the diagnosis lands on the unit of work that was actually slow, instead of returning an
error or a milestone-wide average that hides it.

## Why

**Today the question cannot be asked.** `resolveMilestoneFolder` (`src/work-observe.mjs:988-1006`)
reads only the **top level** of `wiki/work`. Executed: `"52"` resolves to a folder; `"52/00"`
resolves to `null` and throws `milestone-not-found` (`:1020-1024`). Stories live one level down, in
`<milestone>/stories/`, and the resolver never descends. A framework whose unit of parallel work is
the story cannot report on a story.

The same resolver has a second, quieter defect: its substring branch (`:1003`) makes a bare `"00"`
resolve to *milestone* 00 — so the ref that looks most like a story ref silently answers about
something else.

**Per-phase is the other half of the same question.** A milestone-wide total says a milestone was
expensive; it does not say whether the expense was refine, continue or verify. The evidence says
the answer is rarely the one assumed: governance output beat build output in four of six
instrumented milestones, and in one, build was **7%** of active time against 38% for re-applying
contract deltas.

**Phase is read, never minted.** Milestone 53 is `done` and its loop declaration already carries
`phase` on `brief.loop` — so this story groups by a key that already has a producer and an owner
(ADR-002). A run not minted by the loop shell has no phase and reports as `null` rather than being
guessed into one, which is the same posture ADR-006 takes on unattributed runs.

**And it lands through the registered door.** The milestone-08 spine holds: the answer is a
registered command with a stable `--json` contract (`src/commands/observe.mjs`), not a new surface.

## Tasks

- [x] `tasks/00_story-scoped-ref.feature` — a story ref resolves to the story's own folder, a bare milestone ref keeps working, and an ambiguous ref is refused rather than silently resolved to the wrong item
- [x] `tasks/01_per-phase-rollup.feature` — the rollup groups by the phase the loop declared, and runs with no declared phase are reported as such rather than folded into one
- [x] `tasks/02_json-contract.feature` — the registered command's `--json` document carries the scoped, per-phase answer under a stable key set

## Notes

- **This story declares no fitness function of its own.** Its content is observable behaviour over
  the real seam — which ref resolves to which folder, which rows group under which phase — and that
  is task `.feature` material by the register's own rule, not a structural invariant.
- **The `--if-enabled` self-gate stays as delivered** (`src/commands/observe.mjs:41-47`): a skipped
  `--json` run emits one `{ skipped: true }` document. Nothing here changes the gate or the
  one-document discipline.
- **Disjoint from 68/03 and 68/05 by region** — this story owns the resolver and the rollup/report
  path; 03 owns the attribution core and the classifier; 05 owns the write block. The module
  imports nothing (`graph impact` → 0), which is what makes the region cut safe
  (`ARCHITECTURE.md` § Story partition).
- **Parallel-eligible with 68/01, 68/02 and 68/05** once 68/00 lands.
