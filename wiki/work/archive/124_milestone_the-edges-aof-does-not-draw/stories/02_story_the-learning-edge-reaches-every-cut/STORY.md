---
type: story
number: 02
slug: the-learning-edge-reaches-every-cut
title: "The learning edge reaches every cut — shatter gains a one-per-PRD recall keyed to the seam, in the form the CLI actually has"
parent: 124
depends: []
status: done
owner: product-owner
created: 2026-09-07
updated: 2026-09-08
adrs: [ADR-007]
reads:
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-007
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/RESEARCH.md
  - src/bundle/commands/refine.md
  - src/work/memory.mjs
  - src/cli.mjs
  - src/command-core.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs
files:
  - src/bundle/commands/shatter.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
  - .claude/commands/aof/shatter.md
  - .codex/skills/aof-shatter/SKILL.md
  - .opencode/commands/aof/shatter.md
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/arch/memory/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The learning edge reaches every cut

## User story

As **the product owner shattering a planning PRD into a roadmap**,
I want **the accumulated lessons this project has recorded to be recalled before the drivers are
identified**,
so that **the coarsest cut in the system — the one that decides what a milestone even is — is informed
by the same memory that already informs the finest one**.

`refine.md` recalls before it draws story boundaries. `shatter.md` has **no memory hook at all**
(measured: zero matches for `memory` or `recall` across its 110 lines), so the outermost splitter cuts
milestones blind. A lesson that reaches the story-splitter and not the milestone-splitter improves how
work is cut only at the grain where a bad cut is cheapest to fix.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_shatter-recalls-before-it-cuts.feature` — a one-per-PRD, PO-only recall keyed to the
      seam, placed before the driver-identification step, carrying no `--item` and no `--area`
- [x] `tasks/01_the-recall-form-exists-in-the-cli.feature` — every verb and flag the block spells is
      asserted against the memory module's own parse surface, never from prose and never from the
      command registry (`aof work memory` is a deliberately-unrouted door, so a registry-sourced
      check would pass vacuously over an empty surface)
- [x] `tasks/02_every-cut-making-command-carries-a-recall.feature` — the named roster asserted in both
      directions, so a third cut-making command cannot arrive without one
- [x] `tasks/03_the-bundle-mirrors-stay-in-parity.feature` — the three generated mirrors and the
      manifest hashes re-render from the edited source

## Notes

**A straight port of `refine.md`'s block is structurally wrong, and the contract says so (ADR-007).**
Two reasons, both readable in `shatter.md` itself: there is **no `--item <ref>`** to pass, because
shatter *mints* drivers from a PRD and no ref exists until step 3; and `refine.md`'s block is
**two-role** (architect and PO) while `shatter.md` spawns only `aof-product-owner`, so half the ported
block would attach to a role its own `<process>` never declares.

**Once per PRD, at the seam — not once per driver.** A per-driver recall runs *after* the cut has been
made and therefore cannot change it, which is the whole point of the edge.

**`refine.md` is read, never written.** Its block is asserted unchanged; this story adds the second
carrier, it does not refactor the first.

**Smallest of the three, and the only one touching the bundle.** The generated mirrors are in `files:`
because `acd-declared-writes-include-generated-siblings` requires a story editing a bundle source to
declare them.
