---
type: story
number: 181
slug: unattended-loops-survive-declines
title: "Unattended loops survive acceptance declines and reject unusable rubrics early"
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/181_story_unattended-loops-survive-declines/ARCHITECTURE.md
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
files:
  - README.md
  - packages/core/assets/commands/verify.md
  - packages/core/assets/manifest.json
  - packages/core/assets/variants/codex/workflow.md
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/execution/src/codex-app-server.mjs
  - packages/execution/src/runtime-session.mjs
  - packages/execution/src/session-driver.mjs
  - packages/execution/test/codex-app-server.suite.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/work/src/commands/grade.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/grade.mjs
  - test/arch/grade/acd-grade-bounded-single-spawn.test.mjs
  - test/grade/grade-waits-without-blocking.test.mjs
  - test/loop/loop-command-gate.test.mjs
  - test/loop/loop-command-refusals.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/work-loop-phase-map.test.mjs
  - test/support/grade-fixture.mjs
---
# 181 · Unattended loops survive declines

## User story

As an operator running an unattended loop, I want completed procedures to settle independently of their verdict, declined work to return to the developer, and unusable rubric commands to be caught before sessions start, so that the loop makes progress without manual recovery or wasted sessions.

## Tasks

- [x] [00 · Procedure completion is independent of acceptance](tasks/00_procedure-completion.feature)
- [x] [01 · Declined stories return to continue](tasks/01_decline-handback.feature)
- [x] [02 · Unusable rubric commands fail preflight](tasks/02_rubric-preflight.feature)

## Origin

Project-sijil loop 07 on 2026-10-30: Codex verify 07/00 recorded a blocker decline (commit 48f93cf) but returned phase_failed; the story remained in-review; a report-only rubric reached grade after about 90 minutes of sessions. Source evidence paths and rollout notes are recorded in VERIFICATION.md.

Implementation and acceptance verification are complete. See VERIFICATION.md for executed checks, findings and rollout notes.

## Accept decision

Accepted on 2026-10-30: all three task contracts are satisfied; all four defect regressions and the selected acceptance suites passed (370 cases, zero failures). Story validation is clean, doctor has zero errors and no unresolved controls, and no blocker finding remains open. OUTCOME.md and RETROSPECTIVE.md are authored. Acceptance is story-scoped; no whole-tree gate or native-model replay is claimed.

## Identity history

Renumbered from 175 to 181 on 2026-10-30 through the registered renumber verb; acceptance and status are preserved. Story 182 records the command implementation and migration evidence.
