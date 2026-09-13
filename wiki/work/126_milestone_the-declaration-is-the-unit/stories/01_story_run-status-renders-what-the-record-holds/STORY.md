---
type: story
number: 01
slug: run-status-renders-what-the-record-holds
title: "run-status renders what the record holds — the render moves, the document does not, and the pin that froze the file is re-pinned in the open"
parent: 126
depends: [00]
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-09
adrs: [ADR-003]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-001
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-003
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-004
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-014
  - src/work/loop.mjs
  - src/run-store.mjs
  - src/cache-read.mjs
  - src/commands/resolve.mjs
  - src/board-mesh-execution.mjs
  - src/commands/mesh/identity.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
files:
  - src/commands/run-status.mjs
  - src/spine/face.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/run/run-status-render.test.mjs
  - test/run/index.mjs
  - test/arch/run/acd-run-status-renders-the-record.test.mjs
  - test/arch/run/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · run-status renders what the record holds

## User story

As **an operator asking `aof work run-status <ref>` what a loop is doing**,
I want **the render to show me the phase, the cycle against its cap, the level, the attempt, how
long the run has been going, how long since it last beat, which session and node it is on, and why
it failed if it did — every one of which the record already holds**,
so that **the question "is this thing alive?" is answered by the command that exists for it, rather
than by opening a JSON file and reading fifteen keys the renderer threw away**.

No new field is authored. The `--json` document already carries the whole record and does not
change by a key; the defect is a renderer that prints two of sixteen. The elapsed and heartbeat-age
figures are derived from an injected `now` through the same per-attempt arithmetic `126/00`'s clock
defines, so what the operator reads and what the deadline enforces can never disagree.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-render-names-the-record.feature` — each run's phase, cycle/cap, level, attempt,
      session, node, failure reason and provenance are rendered from the record; the empty-history
      line is unchanged
- [x] `tasks/01_elapsed-and-heartbeat-age-come-from-an-injected-now.feature` — no wall clock in the
      module; the derivation is `126/00`'s per-attempt rule, reused; a reclaimed run's elapsed is its
      last heartbeat, not its reclaim stamp
- [x] `tasks/02_the-document-is-unchanged-and-the-pin-moves-with-the-file.feature` — the `--json`
      result is key-for-key what it is today over disk, cache and no-runs fixtures; `53/FF-5307`
      leg 2's sha256 pin is re-pinned with its reason beside it; `src/board-ui.mjs` and `ui/` are
      untouched

## Notes

**`depends: [00]` is for the one-home derivation, not for a file.** `ARCHITECTURE.md#ADR-003` §2
rules that elapsed and heartbeat age are *"the same arithmetic ADR-001 §2 defines, reused rather
than re-derived"*; that arithmetic is a pure export `126/00` lands in `src/work/loop.mjs`, and the
engine imports nothing, so the per-attempt rule cannot live anywhere this story could reach first. A
second copy in the renderer would be exactly the drift the ADR exists to prevent. The write sets are
otherwise disjoint.

**The trap the milestone `SPEC.md` does not name.** `src/commands/run-status.mjs` is byte-pinned by
sha256 in `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` as `53/ADR-004`'s "not
edited" invariant. That control is in this story's `files:` for the re-pin and for nothing else —
leg 1 (the `brief.loop` round-trip) is not touched by this story. `126/02` also edits that control
(the ninth declaration key changes its eight-key assertion); the two stories collide on the file and
the ready-wave partition serialises them — an ordering, not a dependency, and deliberately not drawn
as one.

**The live `now` comes from the face, not the module** (ruled at this contract's beat, recorded as
an amendment to `ARCHITECTURE.md#ADR-003` §2). QA found that `cli.render(result, faceCtx)` carries
no clock, so a render forbidden a wall clock and a document forbidden a new key left the operator's
own path with no instant at all. `src/spine/face.mjs` gains one additive key, `now`, on the
`faceCtx` it already hands every render; this render reads it; tests inject it. The input schema
gains no `now`, and `run()` does not change. That one line is why the face is in `files:`.

**`fromWorker` is a fact the render must carry, not hide.** A cache-answered history is the worker's
mirror of its own disk, and TECH_DEBT item 19 measures a cached run row that read `running` for two
days after the run finished. The render says which source answered.
