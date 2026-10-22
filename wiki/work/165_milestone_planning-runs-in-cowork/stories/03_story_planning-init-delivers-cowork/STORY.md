---
type: story
number: 03
slug: planning-init-delivers-cowork
title: "Planning init delivers Cowork — aof planning init --runtime cowork writes the uploadable packages, prints the install steps and records an unconfirmed cowork entry beside claude and codex"
parent: 165
status: done
owner: product-owner
created: 2026-10-19
updated: 2026-10-20
schema: 1
aofVersion: 0.1.0
depends: [00, 01, 02]
reads: [wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-001, wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-004, wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-005, wiki/work/165_milestone_planning-runs-in-cowork/ARCHITECTURE.md#adr-006, wiki/work/165_milestone_planning-runs-in-cowork/RESEARCH.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/03_story_planning-init-delivers-cowork/EXAMPLES.md, wiki/work/165_milestone_planning-runs-in-cowork/stories/03_story_planning-init-delivers-cowork/PLAN.md, packages/core/src/planning-init.mjs, packages/core/src/planning/cowork-plugin.mjs, packages/core/src/planning/stored-zip.mjs, packages/core/src/planning/cowork-planner.mjs, packages/core/src/lock.mjs, packages/core/src/workspace.mjs, packages/core/src/paths.mjs, packages/core/src/render-plan.mjs]
files: [packages/core/src/planning-init.mjs, packages/core/src/commands/planning-init.mjs, packages/core/src/cli.mjs, packages/core/src/planning/cowork-plugin.mjs, packages/core/src/planning/cowork-planner.mjs, packages/core/src/work/bundle-runtime.mjs, packages/core/test/planning-init.suite.mjs, test/fixtures/application/command-inventory.json, test/arch/planning/acd-planning-install-commands.test.mjs, test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs, test/arch/planning/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 03 · Planning init delivers Cowork

## User story

As **the operator, who wants to plan in Cowork and build in Claude Code**,
I want **`aof planning init --runtime cowork` to write the aof plugin and the pinned
planner as uploadable packages, tell me exactly how to install them, and record a cowork entry
next to my claude one**,
so that **one command takes me from a repo to PRD → shatter in Cowork, on the same `wiki/work/`
tree Claude Code builds from. aof never claims an install it couldn't see, and never disturbs
the claude install the repo already records.**

## Tasks

- [x] [00 · Planning init writes the Cowork packages and says how to install them](tasks/00_cowork-packages-and-install-steps.feature)
- [x] [01 · Cowork is recorded beside claude and codex, on cowork's own terms](tasks/01_cowork-beside-claude-and-codex.feature)

## Notes

- **Wiring** (ADR-001): `cowork` joins `VALID_RUNTIMES`. Its plan is a `render` item and one
  `package` item per plugin, with no argv. The real run resolves the sha (`resolveSha`), calls
  165/02's `packagePlanner` and 165/01's `renderPlanningPlugin`, and zips everything in memory.
  It writes the files only if every step succeeded, then writes the lock entry through 165/00's
  per-runtime writer.
- **The entry** carries m02's schema plus
  `plugins[].package` and `cowork: { bundle, skills, installConfirmed: false }`.
- **Where the packages go** (ADR-006, amended at verify 2026-10-20, Q4): once, in the aof home,
  as `<aof home>/cowork/aof.plugin` and `<aof home>/cowork/pm-skills/<plugin>.plugin`. The entry
  names them relative to the aof home, and nothing but the lock is written in the project.
- **FF-16505** extends `acd-planning-install-commands`. **FF-16506** is a new arch file, with
  `test/arch/planning` +1.
- **@uat** E5 is the SPEC's outsider check. It needs a live Cowork session, and the operator
  runs it at verify.
