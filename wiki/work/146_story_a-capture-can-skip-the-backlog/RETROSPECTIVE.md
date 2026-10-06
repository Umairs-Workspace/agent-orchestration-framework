---
type: story
number: 146
slug: a-capture-can-skip-the-backlog
doc: retrospective
created: 2026-10-03
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
---
# 146 · Retrospective

The switch itself held at every check. All three lessons are controls the build and review lanes never
ran, and verify found each one red.

## R1 — A new test file is a budget change, and every budget row is frozen at its count

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** aof:verify 146

146 added `test/work/work-add-in-stream.test.mjs` and declared no rise, so `test/work/` went to 45
against a ceiling of 44. Six FF-11904 and 138/00 cases went red. The lane ran the story's suite and its
two arch-tests, but not `acd-source-directory-budget`, which is the only test that counts siblings.
145, merged the same evening, raised the same row the right way. This is the recurrence the
refine-checks-frozen-dirs practice names.

**Carry:** a story whose `files:` adds a test or source file runs
`test/arch/testing/acd-source-directory-budget.test.mjs` in its lane. Refine declares that row's rise,
with its reason, in the same contract.

## R2 — A PLAN.md verification step that lists its suites breaks the plan restatement ban

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** aof:verify 146

The ban (96/02-00) admits one declared path per `PLAN.md`. Three plans on this branch (146, 136/01,
136/02) wrote their verification step as `node scripts/test.mjs --only <path> <path>…`. The runner's
own path counts too. Only one is reported per run, because the case stops at its first refused file.

**Carry:** a plan's verification step names the contract's sets ("the story's `files:` suites, with
`--only`"), never the paths. Before review closes, run `test/work/story-plan-document.test.mjs`.

## R3 — A `@manual` Then that says "validate is green" right after a capture can never hold

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** qa · **Raised by:** aof:verify 146

Task 01 asserted `aof work validate` green straight after `aof:add-story`. Validate deliberately reds
an untouched `reads: []` + `files: []` scaffold until refine replaces it, so the Then failed with or
without the switch. The contract was amended at verify to name that one expected finding.

**Carry:** when a contract asserts validate over a freshly scaffolded item, first check what validate
says about an untouched template. It is never fully green.
