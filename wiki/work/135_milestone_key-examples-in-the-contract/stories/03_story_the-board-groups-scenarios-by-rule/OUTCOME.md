# 03 · The board groups scenarios by rule — Outcome

## Delivered

### The tasks projection carries each scenario's rule title
`aof work tasks` and `/api/work/tasks` give each scenario the keys `name`, `outline`, `lane` and `rule`, where `rule` is the title of the `Rule:` it sits under or null, on the local and the cached path alike. Only the title crosses the wire.

### The task card groups scenarios under their rule
The board's TASKS tab (`apps/ui/src/board/TasksTab.tsx`) shows a task's scenarios in file order, with the scenarios outside any rule first, as today's list, then a heading over each rule's indented list. A task with no rule, or a payload from an older node without the `rule` key, renders today's markup.

## Gaps

### A rendered design judgement of the task card
- **Status:** open
- **Discharge condition:** DESIGN.md's task-card surface declares a `Route`, and `aof:verify --url` renders it against a live board for the designer to judge.
The card's conformance is asserted structurally against DESIGN.md's binding checklist, and has never been rendered and judged (F-135-03).
