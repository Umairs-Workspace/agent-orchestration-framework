---
type: story
number: 02
slug: the-record-command
title: "The record command — a read face, one door to disk, and a signature that survives"
parent: 78
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-001, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-002, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-008, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-009, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-010, src/commands/grade.mjs, src/commands/loops-graph.mjs, src/run-store.mjs, src/work-loops.mjs, src/work.mjs, test/arch/acd-loop-registry-not-an-item-type.test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, scripts/test.mjs]
files: [src/commands/loop-record.mjs, src/command-core.mjs, src/cli.mjs, test/loop-record-command.test.mjs, test/arch/acd-loop-record-idempotent.test.mjs, test/arch/acd-loop-record-signature-preserved.test.mjs, test/arch/acd-loop-record-is-a-face.test.mjs, test/arch/acd-loop-record-board-deferred.test.mjs, test/arch/acd-loop-record-write-scope.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/command-core-contract.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The record command — a read face, one door to disk, and a signature that survives

## User story

As an operator,
I want one command that writes the loop execution record into a work item and can be run again at any
time without destroying what I signed,
so that the record is a committed artefact I regenerate as the work moves, rather than a one-shot
document I am afraid to refresh.

## Why

`SPEC.md` binds this record to the milestone-08 spine: derived from a registered command with a stable
`--json` contract, byte-identical on unchanged inputs, never a second source of truth. This story is
that command.

Two obligations meet here and neither can be dropped. **Idempotence**: regenerating on unchanged
inputs produces the same bytes, which is what makes a non-empty diff mean "an input changed" instead
of "somebody ran the command". **Preservation**: a human signature is by construction not derivable
from any input, so a truncate-and-rewrite would destroy the only part of the document that is not
machine-made — and would train operators never to regenerate, which is the same as not having the
command.

ADR-002 resolves them together: the writer is a read-modify-write. It parses the existing document's
sign-off table, carries signed rows forward verbatim, and re-derives everything else.

## Tasks

- [x] `tasks/00_the-read-face.feature` — the bare face reads and emits; `--json` is the stable
      contract; nothing reaches disk without `--write`.
- [x] `tasks/01_the-writer.feature` — `--write` as the only door, byte-identical regeneration, and the
      signature carried forward.
- [x] `tasks/02_registration-and-deferral.feature` — the command core, the frozen `WORK_IDS`, the
      `BOARD_DEFERRED` carve-out, and the write scope.

## Notes

**The name is forced, and for a good reason (ADR-009).** `work:loop-record` in
`src/commands/loop-record.mjs` — NOT `loops-record`. 52/FF-5201 discovers `src/commands/loops-*.mjs`
from disk, asserts the discovered set equals its expected six, and asserts that every discovered
module contains no write call form; its own comment names *"a writer `src/commands/loops-init.mjs`"*
as the case it exists to catch. A writing `loops-record.mjs` would be red twice over. The registry is
framework data and read-only by law; executions are per-item facts. This command is of the second
kind and takes the execution family's name.

**Board-deferred, and the SPEC's scope item is withdrawn (ADR-008).** `SPEC.md` asked for
`work:loops-*` to become board-reachable. Chore 64 is `done` and closed that gap the other way: all
four loop commands are now `BOARD_DEFERRED` members with the reasoning recorded — *"a board face for
this family is not a deferral awaiting a decision — it is a decision already recorded at 53's gate."*
This command joins the same carve-out. `ui/` is untouched, so 52/FF-5202 stays green without being
re-pinned.

**Story 79 has not shipped, and this story does not wait for it (ADR-010).** The three things
`SPEC.md` expected to inherit from 79 — where a generated document lives, idempotence, the drift
check — are decided in this milestone's ADRs. Whichever of 78 and 79 lands second cites them rather
than re-deciding.
