---
type: story
number: 04
slug: the-readiness-gate
title: "The readiness gate — the examples doctor lane, the EXAMPLES.md budget row, and a continue door that refuses a story with an open business question"
parent: 134
depends: [02, 03]
status: in-review
owner: product-owner
created: 2026-09-23
updated: 2026-10-02
adrs: [ADR-001, ADR-005, ADR-006]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-001
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-005
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - packages/work/src/examples/map.mjs
  - packages/work/src/examples/answers.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/doctor/budget.mjs
  - packages/work/src/doctor/diagrams.mjs
  - packages/work/src/doctor/loop-ready.mjs
  - packages/work/src/observe.mjs
  - packages/execution/src/runs.mjs
  - packages/work/src/commands/resolve.mjs
  - packages/work/src/commands/doctor.mjs
  - packages/work/src/commands/continue.mjs
  - packages/contracts/src/error.mjs
  - packages/work/src/lifecycle.mjs
  - test/work/doctor-diagrams-lane.test.mjs
  - test/work/doctor-context-budget.test.mjs
  - test/work/story-plan-document.test.mjs
  - test/arch/planning/acd-context-budget-config-sourced.test.mjs
  - test/arch/work/acd-advisory-lane-never-gates.test.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/work/acd-doctor-engine-determinism.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/examples/index.mjs
  - test/arch/examples/index.mjs
files:
  - packages/work/src/doctor/examples.mjs
  - packages/work/src/doctor/index.mjs
  - packages/work/src/doctor/budget.mjs
  - packages/work/src/commands/doctor.mjs
  - packages/work/src/commands/continue.mjs
  - packages/work/package.json
  - packages/core/src/application/assemble.mjs
  - packages/core/src/application/bindings/work/doctor-examples.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/src/application/bindings/commands/continue.mjs
  - packages/core/src/application/bindings/commands/doctor.mjs
  - packages/work/test/support/doctor-services.mjs
  - test/work/doctor-diagrams-lane.test.mjs
  - test/arch/loop/acd-loop-record-is-a-face.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - scripts/workspace-runtime-audit.json
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - test/examples/index.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/examples/continue-door-examples.test.mjs
  - test/work/doctor-context-budget.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-examples-off-is-today.test.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/134_milestone_discovery-the-example-map/VERIFICATION.md
  - wiki/work/134_milestone_discovery-the-example-map/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 04 · The readiness gate

## User story

As **the operator who must not see a story built on a business rule nobody asked about**,
I want **`aof work doctor` to report a story's open business question and any unanchored `stated`
or `confirmed` claim as an error, warn on a rule with no example and on a map with too many rules,
budget `EXAMPLES.md` like any other document, and `aof work continue <story>` to refuse while an
error stands, all only when `work.examples.enabled` is on**,
so that **the Contract stage and the build door stop on the same code-checked fact, and a project
with the gate off sees exactly what it sees today**.

What lands (ADR-005, ADR-006 §2-3): the tenth doctor lane, `src/work/doctor-examples.mjs`, pure
over the snapshot with the five codes and severities of ADR-005 §1. It is appended to
`CHECK_GROUPS` and named in FF-5905's roster. The snapshot probe sits beside the `PLAN.md` probe:
story-scoped, gate-on and file-present only, and it carries the map text, its line count and
`collectAnswers`. `EXAMPLES.md` joins `BUDGET_KEY` as the `examples` kind, with a default of 50.
The door in `continue.mjs` refuses with `examples-question-open` (409) for a story ref, through the
lane's own pure function. The `src/work` row goes 45 → 46 with its reason. FF-13403 (off is today).

## Tasks

- [x] 00 [the examples lane reports the map a person has not answered](tasks/00_the-examples-lane-reports-the-map-a-person-has-not-answered.feature)
- [x] 01 [the snapshot reads a story map and budgets it only when the gate is on](tasks/01_the-snapshot-reads-a-story-map-and-budgets-it-only-when-the-gate-is-on.feature)
- [x] 02 [continue refuses a story while a business question stands](tasks/02_continue-refuses-a-story-while-a-business-question-stands.feature)
- [x] 03 [off is today](tasks/03_off-is-today.feature)

## Notes

- A milestone `continue` refuses no one (ADR-005 §4). One blocked story must not halt the wave.
- The gate's error codes join `stream-coherent`'s error count in loop-ready, and so the L3 level
  gate's score. They also fail `aof work doctor`'s exit code and `aof:validate`'s health floor. The
  loop's doctor rung admits only the controls' codes, and the accept preflight runs the budget
  group alone, where an over-budget `EXAMPLES.md` binds. A loop-driven refine stopping is 136's.
- `aof work doctor` must be run from the repository root when you verify. It reports "healthy"
  over an empty stream from a subdirectory.
