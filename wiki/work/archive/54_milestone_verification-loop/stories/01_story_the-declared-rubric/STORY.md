---
type: story
number: 01
slug: the-declared-rubric
title: "The declared rubric — aof runs exactly what the project declared, bounded, and never guesses"
parent: 54
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-23
depends: [54/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · The declared rubric

## User story

As a project whose test suite has hazards only I know about,
I want aof to run **exactly the command I declared**, in the environment and at the scope I declared,
under a bound it enforces,
so that my suite can be graded without aof ever having to infer how my tests are safe to run — and
so a repo that declares nothing keeps looping exactly as it does today.

<!-- The "so that" is the operator's no-regression constraint made concrete. aof does not know that
     this repo's suite must run under AOF_GLOBAL_HOME, that one test cannot bind a port a live
     daemon holds, or that the full suite is unsafe on the control node. It must not guess. The
     hazards are the project's to declare; aof's job is to run precisely what was declared. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-rubric-is-declared.feature` — `work.rubric`'s `command`/`args`/`env`/`report` shape; `command` is an argv array never passed to a shell; an absent `args.ref` runs the suite whole **knowingly**; `work.controls.runners` keeps its meaning and its readers untouched
- [x] `tasks/01_unconfigured-is-an-honest-no-op.feature` — no `work.rubric` yields `indeterminate` with `rubric-unconfigured`, naming the key to set; it is **never** read as `pass`, and the loop proceeds exactly as it does today
- [x] `tasks/02_the-read-face-never-executes.feature` — bare `aof work grade <ref>` reports the plan and the last recorded grade and spawns nothing; `--run` is the only door to execution; the command is a documented `BOARD_DEFERRED` member with no served route
- [x] `tasks/03_the-spawn-is-bounded-and-single.feature` — stdin closed, output captured, the deadline force-kills to `runner-timeout`, and a `--run` that finds the re-entrancy stamp already set refuses rather than recursing

## Notes

- **The only story in the milestone that registers.** `src/command-core.mjs` has **116 dependents**,
  so registration is a hub act held to one story (ADR-003). It carries the five registry-derived
  gates with it — the CLI bijection `argsFor` case, the `BOARD_DEFERRED` membership, and the arch
  suites imported **and spread** (TECH_DEBT item 50: an imported-but-never-spread suite is invisible
  to the registration gate).
- **The read-face rule is not stylistic.** The bijection gate spawns `aof work grade <ref> --json` as
  a **real subprocess from inside the suite**. An executing bare face would make this repo's own test
  suite spawn itself. `work:resume`'s bare-sweep-is-the-read is the shipped precedent.
- **No board route, and no board change.** A `GET /api/work/grade` that executed a suite would let a
  page load spawn a test run, and the route-coverage gate stands the server up and hits every served
  route. The grade still reaches the board — it rides the run record and arrives through
  `work:run-status` unchanged. `src/board-ui.mjs` and `ui/` are not edited.
- **The bound's value is 69's, not this story's.** The deadline resolves through `69/ADR-001`'s single
  home `src/loop-bounds.mjs`. That file **does not exist yet** and all six of 69's stories are
  `not-started` — if 54/01 lands first it creates the leaf at 69's declared path with 69's declared
  key and value, and 69/00 extends it. It opens no rival bound home; `53/ADR-009` §1's rule stands —
  54 enforces a bound and never chooses one.
- **Sequenced behind 54/00**, which supplies the vocabularies this command returns.
