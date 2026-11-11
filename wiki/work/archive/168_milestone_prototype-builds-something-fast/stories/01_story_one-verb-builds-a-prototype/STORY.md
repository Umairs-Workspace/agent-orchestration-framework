---
type: story
number: 01
slug: one-verb-builds-a-prototype
title: "One verb builds a prototype — `aof:prototype` starts, continues with a new ask, stops with a hand-off and completes, building inline on the current branch"
parent: 168
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-001, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-003, wiki/work/168_milestone_prototype-builds-something-fast/ARCHITECTURE.md#adr-004, packages/work/src/identity.mjs, packages/work/src/lifecycle.mjs, packages/work/src/records.mjs, packages/work/src/discovery.mjs, packages/work/src/commands/promote.mjs, packages/work/src/promote/promotion.mjs, packages/work/src/insertion/scaffold.mjs, packages/work/src/commands/insert-chore.mjs, packages/core/src/application/bindings/commands/insert-chore.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, packages/core/src/cli.mjs, packages/core/assets/templates/prototype/PROTOTYPE.md, packages/core/assets/templates/prototype/STATE.md, packages/core/assets/commands/add-chore.md, packages/core/assets/commands/explain.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/bundle.json, packages/core/test/bundle-spike-chore-membership.suite.mjs, test/arch/work/acd-one-mint.test.mjs, test/arch/planning/acd-promotion-creates-one-type.test.mjs, test/arch/planning/acd-one-promotion-engine.test.mjs, test/arch/work/acd-prototype-stays-light.test.mjs, test/work/stream/work-insert-top-level-places.test.mjs, test/work/stream/work-promote-mints-the-number.test.mjs, test/work/stream/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [packages/work/src/commands/prototype.mjs, packages/work/src/commands/promote.mjs, packages/work/src/insertion/scaffold.mjs, packages/core/src/application/bindings/commands/prototype.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, packages/core/src/cli.mjs, packages/core/assets/commands/prototype.md, packages/core/assets/commands/explain.md, packages/core/assets/variants/codex/workflow.md, packages/core/assets/bundle.json, packages/core/assets/manifest.json, packages/core/test/bundle-spike-chore-membership.suite.mjs, test/work/stream/work-prototype-four-moves.test.mjs, test/work/stream/index.mjs, test/arch/work/acd-prototype-stays-light.test.mjs, test/arch/planning/acd-promotion-creates-one-type.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/work/src/commands.mjs, packages/work/package.json, packages/core/test/bundle.suite.mjs, test/arch/work/acd-work-command-cli-bijection.test.mjs, test/arch/work/acd-work-command-route-coverage.test.mjs, test/work/stream/work-insert-top-level-places.test.mjs]
---
# 01 · One verb builds a prototype

## User story

As **the operator who says "build me X"**,
I want **one command, `aof:prototype`, that creates the prototype, builds it in my session on
my current branch, takes a new ask whenever I have one, and leaves a hand-off when I stop**,
so that **I get something working without refine, review or an accept door, and the next
session, mine or another, picks up from the hand-off instead of starting over.**

## Tasks

- [x] [00 · Start creates a prototype from the ask, through the one number mint](tasks/00_start-creates-a-prototype.feature)
- [x] [01 · Continue takes a new ask, and stop and complete keep the hand-off on record](tasks/01_continue-stop-and-complete.feature)
- [x] [02 · The `/aof:prototype` command builds in the operator's own session, and ships to every runtime](tasks/02_the-command-builds-inline.feature)

## Notes

- **The CLI half** (ADR-004 §1–5) is `packages/work/src/commands/prototype.mjs`, composed in
  `packages/core/src/application/bindings/commands/prototype.mjs` and registered in
  `command-core.mjs`, like `insert-chore`. It handles the positional grammar, the four moves, the
  `--log` line, the `prototype-handoff-missing` refusal, and `--today`. `--stop`, `--done` and
  `--abandon` copy the hand-off into `## Log` as a quoted block under their dated line, so every
  checkpoint stays on record (ADR-004 §4).
- **Start reaches the one mint.** `runInsertTopLevel` gains the append form (no `--at`), and
  `DOCS_BY_TYPE` gains `prototype`. FF-12703's caller set must not change. FF-7103
  (`acd-promotion-creates-one-type`) source-parses `DOCS_BY_TYPE`, so its admissible set gains
  `prototype` with the reason stated. The type the loop may create is still only `chore`.
- **The prompt half** is `packages/core/assets/commands/prototype.md`, with the codex
  `workflow.md` section and a `bundle.json` member for the runtimes `add-chore` ships to. It has no
  `Agent` tool, no branch, no worktree, no review lane and no commit (FF-16804). `explain.md`
  gains the row `prototype | its ## Intent`.
- **On `main`** (EXAMPLES Q1, answered 2026-10-22): the command reads the branch itself and says
  once that the checkout is on `main`, then builds. The verb stays git-free (FF-16804).
- **Ratified at Contract:** two move flags together are refused as `prototype-one-move`, and a
  continue on an `active` prototype with no addition writes nothing.
- **`test/work/stream`** rises 36 → 37 for `work-prototype-four-moves.test.mjs`: a prototype's
  four moves are a new stream write act (ADR-004), the case the row says earns its own suite.
- **`packages/work/src/commands`** rises 37 → 38 for `prototype.mjs`, and
  **`packages/core/src/application/bindings/commands`** rises 62 → 63 for its binding. Each is
  a new verb's own module.
