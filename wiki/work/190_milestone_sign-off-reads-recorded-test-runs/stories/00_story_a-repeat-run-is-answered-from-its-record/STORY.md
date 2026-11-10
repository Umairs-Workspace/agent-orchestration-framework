---
type: story
number: 00
slug: a-repeat-run-is-answered-from-its-record
title: "A repeat `aof test` on unchanged content is answered from the record of the run that already happened"
parent: 190
depends: []
status: done
owner: product-owner
created: 2026-11-09
updated: 2026-11-10
adrs: [ADR-001, ADR-002, ADR-006]
reads:
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/SPEC.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-001
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-002
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/archive/72_milestone_inner-loop/ARCHITECTURE.md#ADR-003
  - packages/work/src/testing/toolchain.mjs
  - packages/work/src/testing/select.mjs
  - packages/work/src/grade.mjs
  - packages/core/src/application/bindings/work/toolchain.mjs
  - packages/core/src/application/assemble.mjs
  - test/arch/testing/acd-git-fake-parity.test.mjs
  - test/arch/testing/acd-one-selector-one-changed-set.test.mjs
files:
  - packages/work/src/testing/record.mjs
  - packages/work/src/commands/test.mjs
  - packages/work/package.json
  - packages/core/src/application/bindings/commands/test.mjs
  - packages/work/test/testing.test.mjs
  - test/testing/test-command-contract.test.mjs
  - test/testing/test-run-record.test.mjs
  - test/testing/index.mjs
  - test/arch/testing/acd-test-record-one-writer.test.mjs
  - test/arch/testing/acd-test-command-reports-not-decides.test.mjs
  - test/arch/testing/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 190/00 · A repeat `aof test` on unchanged content is answered from the record of the run that already happened

## User story

As **an operator whose story is tested at the build terminator, again by three review lanes, and
again at verify**,
I want **`aof test` to record every run against the exact content it ran on, and to answer a repeat
on that content from the record instead of running the suite again**,
so that **a story's sign-off costs one run per change of code, not one per party who asks, while the
evidence is still written by the command and never by the agent being checked**.

What lands (ADR-001, ADR-002, ADR-006 §3):
- the record leaf, `packages/work/src/testing/record.mjs`: the content key, the store under the git
  common dir, the match rule and the single-flight lock;
- `aof test` consulting it before launching and writing to it after;
- `--fresh`;
- FF-19001, FF-19002 and FF-19004.

## Tasks

- [x] 00 [every run leaves one record keyed to its content](tasks/00_every-run-leaves-one-record-keyed-to-its-content.feature)
- [x] 01 [a repeat on the same content is answered from its record](tasks/01_a-repeat-on-the-same-content-is-answered-from-its-record.feature)
- [x] 02 [callers asking together make one run](tasks/02_callers-asking-together-make-one-run.feature)

## Notes

- `packages/work/src/testing` moves 4 → 5 and `test/arch/testing` 11 → 12, and `test/testing`
  8 → 9. Each budget row restates its reason in `acd-source-directory-budget.test.mjs`.
- 01 also writes `test.mjs`, to pass the new predicate to the selector. The wave planner serialises
  the two stories on that path. Neither needs the other's behaviour.
- The test command's binding gains the record services. `assemble.mjs` is read, not written: the
  binding composes the leaf itself, as `commands/test.mjs` already composes its five services.
