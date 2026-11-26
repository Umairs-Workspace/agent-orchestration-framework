---
type: story
number: 02
slug: attributed-test-records
title: "A test record says why it ran, where it ran, and which suite each failure came from"
parent: 210
depends: []
status: not-started
owner: product-owner
created: 2026-11-26
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002, ADR-004]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-002, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-004, packages/work/src/regression-record.mjs, scripts/test-shard.mjs, test/arch/testing/acd-test-record-one-writer.test.mjs]
files: [packages/work/src/testing/record.mjs, packages/work/src/grade.mjs, test/testing/test-run-record.test.mjs, test/grade/grade-report-normalisers.test.mjs]
---
# 02 · A test record says why it ran, where it ran, and which suite each failure came from

## User story

As a reviewer reading a story's test evidence,
I want every recorded run to carry the reason it was asked for, the worktree it ran in and the suite
behind each failure,
so that I can judge whether the right suites were run, a fix round can rerun exactly the failing
suites, and review lanes asking about part of a run are answered from it.

## Tasks

- [ ] [per-suite failures from the light entry](tasks/00_per-suite-failures.feature)
- [ ] [reason, worktree and chain fields](tasks/01_reason-worktree-chain.feature)
- [ ] [a covering red answers a subset](tasks/02_covering-red-answers.feature)

## Notes

The record leaf and the TAP reader only. The command face that passes `reason`, `mode`, `parent`
and `round` in is story 04's and story 05's, and the gate's per-unit attribution is story 03's.
Records written before this story have none of the new fields, and are still read: a missing
`file` reads as `null`, and missing `worktree`, `reason` and `parent` read as unknown.
