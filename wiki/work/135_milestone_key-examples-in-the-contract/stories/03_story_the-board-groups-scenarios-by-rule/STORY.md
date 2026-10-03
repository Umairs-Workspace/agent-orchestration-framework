---
type: story
number: 03
slug: the-board-groups-scenarios-by-rule
title: "The board groups scenarios by rule — a task's scenarios show under their rule's heading, and a task with no rule looks as it does today"
parent: 135
depends: [01, 02]
status: done
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
adrs: [ADR-005]
reads:
  - wiki/work/135_milestone_key-examples-in-the-contract/SPEC.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-003
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md#ADR-005
  - wiki/work/135_milestone_key-examples-in-the-contract/DESIGN.md
  - packages/work/src/feature-parse.mjs
  - packages/core/src/application/bindings/commands/tasks.mjs
  - test/arch/work/acd-feature-parse-examples-additive.test.mjs
  - apps/ui/test/support/board-app-harness.mjs
  - apps/ui/test/board-diagrams.suite.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - packages/work/src/commands/tasks.mjs
  - packages/work/test/read.test.mjs
  - apps/ui/src/board/api.ts
  - apps/ui/src/board/DetailPanel.tsx
  - apps/ui/test/index.mjs
  - apps/ui/test/board-rule-groups.suite.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The board groups scenarios by rule

## User story

As **the operator reading a story on the board**,
I want **each task's scenarios shown under the heading of the business rule they illustrate**,
so that **I can see at a glance which rule each headline example belongs to, without opening the
`.feature` file, while a task written without rules looks exactly as it does today**.

What lands (ADR-005, DESIGN.md): `aof work tasks` carries each scenario's `rule` (02's parser key),
`/api/work/tasks` passes it through, and the detail panel's task card groups scenarios under rule
headings in file order. Scenarios outside any rule come first.

## Tasks

- [x] 00 [the tasks projection carries each scenario's rule](tasks/00_the-tasks-projection-carries-each-scenarios-rule.feature)
- [x] 01 [the task card shows scenarios under their rule](tasks/01_the-task-card-shows-scenarios-under-their-rule.feature)

## Notes

- Depends on 01 only for the shared directory-budget file (the new UI suite raises
  `apps/ui/test`'s ceiling by one), and on 02 for the `rule` key.
- `yarn ui:build` when the panel changes. The design-conformance review judges the panel against
  `DESIGN.md`'s binding checklist, or against a committed mock if the operator provides one.

## Accept decision

Accepted 2026-10-03 by aof:verify 135: its scenarios green at accept (milestone VERIFICATION `## Verification evidence`), validate PASS, no blocker finding open.
