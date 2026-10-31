---
type: story
number: 183
slug: global-issue-log
title: "Log, list and remove issues from the global AOF home"
status: done
owner: product-owner
created: 2026-10-31
updated: 2026-10-31
schema: 1
aofVersion: 0.1.0
reads:
  - packages/core/src/paths.mjs
  - packages/core/src/application/bindings/spine/face.mjs
files:
  - packages/core/src/issues.mjs
  - packages/core/src/commands/issues.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - test/store/issues.test.mjs
  - test/store/index.mjs
  - test/command/command-core-contract.test.mjs
  - test/command/application-assembly.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/integration/features/command-spine.feature
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - README.md
---
# 183 · Global issue log

## User story
As an AOF operator, I want to log, list and remove issues from any directory, so that problems encountered across projects are captured in one local place for later work.

## Tasks
- [x] [00 · Log and list globally](tasks/00_log-list.feature)
- [x] [01 · Remove exactly one issue safely](tasks/01_remove.feature)

## Scope
Three CLI verbs: aof issues log <summary> [--details <text>], aof issues list, aof issues remove <id>. All support --json and need no initialized workspace. Issues live under the global AOF home and respect AOF_GLOBAL_HOME. Logging records origin directory and UTC creation time. No remote issue tracker, work-stream promotion, status workflow or UI is included.

## Accept decision
Accepted 2026-10-31 after inline review, six issue regressions, command-spine BDD and registry/structural checks, and final validate/doctor gates. Broader impacted testing was stopped after widening to the full repository; the native aggregate timed out twice. Neither is claimed as passing (see VERIFICATION.md).
