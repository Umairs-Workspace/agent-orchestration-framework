---
type: story
number: 00
slug: a-fragment-can-be-for-claude-only
title: "A practice's fragment can name the runtimes it is for, and a render for any other runtime holds none of it"
parent: 198
status: not-started
owner: product-owner
created: 2026-11-17
updated: 2026-11-17
adrs: [ADR-001]
reads:
  - wiki/work/198_milestone_design-system/SPEC.md
  - wiki/work/198_milestone_design-system/ARCHITECTURE.md#ADR-001
  - wiki/work/198_milestone_design-system/RESEARCH.md#R5
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-007
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/application/bindings/work/doctor-practices.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/practice-render-lane.suite.mjs
  - test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs
  - test/arch/practices/acd-off-renders-no-practice-prose.test.mjs
  - test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs
  - test/arch/practices/index.mjs
  - wiki/reference/practice-prose.md
files:
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/application/bindings/work/doctor-practices.mjs
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/practice-render-lane.suite.mjs
  - test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs
  - test/arch/practices/acd-runtime-scoped-prose.test.mjs
  - test/arch/practices/index.mjs
  - wiki/reference/practice-prose.md
schema: 1
aofVersion: 0.1.0
---
# 198/00 · A practice's fragment can name the runtimes it is for

## User story

As **someone who maintains a practice whose prose only one runtime can act on** (this milestone's
design-system prose calls a tool only Claude has),
I want **to declare the runtimes a fragment is for, and have every other runtime's render hold none
of it, with no empty body required for runtimes it does not serve**,
so that **Codex and opencode users never read instructions they cannot follow, and the practice
needs no hollow placeholder bodies or hand-kept forks of core's sources to stay off their path**.

## Tasks

To be authored (`aof:refine 198/00`).

## Notes

- 192's own mechanism, extended: ADR-001 here amends 192/ADR-002 §6 for scoped fragments only.
  The composition is per runtime for common texts, and identical to today's when no scoped
  fragment is on. FF-19206's file is amended in place for FF-19801, and FF-19802 is new.
- Proved on a fixture bundle, as 192/00 proved slots: the shipped bundle declares no scoped
  fragment until 198/02, so FF-19802 must not pass vacuously meanwhile. Its fixture leg carries it
  (m193/04 R2).
