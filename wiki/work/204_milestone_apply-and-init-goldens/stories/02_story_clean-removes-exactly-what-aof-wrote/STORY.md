---
type: story
number: 02
slug: clean-removes-exactly-what-aof-wrote
title: "Clean removes exactly what aof wrote — every file it wholly owns, every merged file handed back holding only the user's content, a file the user edited kept, and a second clean changing nothing"
parent: 204
depends: [00, 01]
status: not-started
owner: product-owner
created: 2026-11-21
updated: 2026-11-22
adrs: [ADR-001, ADR-004, ADR-006]
reads:
  - wiki/work/204_milestone_apply-and-init-goldens/stories/02_story_clean-removes-exactly-what-aof-wrote/EXAMPLES.md
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-001
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-004
  - wiki/work/204_milestone_apply-and-init-goldens/ARCHITECTURE.md#ADR-006
  - test/golden/assets-apply.lane.mjs
  - test/golden/assets-merge.lane.mjs
  - test/golden/fixtures/fixture-verb.mjs
  - test/support/golden/baseline-store.mjs
  - test/support/golden/normalise.mjs
  - scripts/golden.mjs
  - packages/core/src/lock.mjs
  - packages/core/src/workspace.mjs
  - packages/core/src/claude-settings.mjs
files:
  - test/golden/assets-clean.lane.mjs
  - test/golden/assets-clean.test.mjs
  - test/golden/index.mjs
  - test/support/golden/lanes.mjs
  - test/support/golden/harness.mjs
  - test/golden/golden-harness.test.mjs
  - test/golden/fixtures/user-edit.mjs
  - test/golden/baselines/assets-clean/
  - packages/core/src/clean.mjs
  - packages/core/src/commands/assets/clean.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/src/codex-settings.mjs
  - packages/core/test/clean.suite.mjs
  - test/arch/store/acd-codex-output-ownership.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 204/02 · Clean removes exactly what aof wrote

## User story

As **a user who runs `aof assets clean` to take aof back out of a project that already held my
own guidance, MCP servers and Codex config**,
I want **clean to remove aof's files and aof's entries, and leave every line of mine where it was**,
so that **trying aof, or leaving it, never costs me a file I wrote. Today clean deletes my
`AGENTS.md`, my Codex config and my Codex hooks whole, because it treats a merged file as
aof's.**

What lands (ADR-004): clean retracts what the lock records as aof's ownership, through the one
retraction apply already uses, and deletes a merged file only when nothing of the user's is left.
The `assets-clean` lane's three scenarios and their baselines land with it. So does the harness's
one new capability, a step that runs a fixture script to model a user's edit (ADR-001 §5).

## Tasks

- [ ] `tasks/00_clean-removes-every-file-aof-wholly-owns.feature` (R1): after a plain apply, clean leaves no generated file and no lock entry, a second clean does nothing, and the Claude settings and journal are held as they are.
- [ ] `tasks/01_clean-hands-every-merged-file-back.feature` (R2): over the user's own files, each merged file comes back holding only the user's content, and FF-20402 holds the rule.
- [ ] `tasks/02_a-file-the-user-edited-survives-clean.feature` (R3): an edited aof file is kept and warned about, a user's line beside aof's block is kept, and a step can model that edit.

## Notes

- The retraction exists inline in apply's stale-output path. Lift it so apply and clean call one
  function. Do not write a second one in clean.
- Clean's envelope gains the action `retract`. Its human render already prints any action name
  through the shared formatter.
