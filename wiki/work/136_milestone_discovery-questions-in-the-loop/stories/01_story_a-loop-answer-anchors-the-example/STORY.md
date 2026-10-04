---
type: story
number: 01
slug: a-loop-answer-anchors-the-example
title: "A loop answer anchors the example — the answer 131 records on a run is a person's answer to the map token its question opens with"
parent: 136
status: done
owner: product-owner
created: 2026-10-03
updated: 2026-10-04
adrs: [ADR-001]
reads:
  - wiki/work/136_milestone_discovery-questions-in-the-loop/SPEC.md
  - wiki/work/136_milestone_discovery-questions-in-the-loop/ARCHITECTURE.md#ADR-001
  - packages/specification-by-example/src/map.mjs
  - packages/execution/src/runs.mjs
files:
  - packages/specification-by-example/src/answers.mjs
  - test/examples/example-answers.test.mjs
  - test/arch/examples/acd-example-answer-one-reader.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · A loop answer anchors the example

## User story

As **the operator answering a discovery question a loop sent me**,
I want **the answer I gave with `aof work answer` to count as my answer to that example or
question, exactly as an answer typed into an interactive session does**,
so that **the example I settled is `stated` or `confirmed` without anyone asking me again, and the
lane goes on to write the contract instead of stopping at the gate on an answer I already gave**.

What lands (ADR-001): `collectAnswers` reads the `asks` entries of the story's and its parent's
runs, in any state, beside the harness transcript. An entry anchors only an answered question that
opens with exactly one map token, from every channel 131 records (the operator's ruling, Q1 in the
map). Nothing is stamped a second time, and the doctor lane and the build door are unchanged.

## Tasks

- [x] 00 [an answered loop question is a person's answer to its token](tasks/00_an-answered-loop-question-is-a-persons-answer-to-its-token.feature)
- [x] 01 [an ask that cannot name its one token anchors none](tasks/01_an-ask-that-cannot-name-its-one-token-anchors-none.feature)

## Notes

- `runs.mjs` is read for the `asks` entry's shape only (`answerRunAsk`, line 1167). The story
  writes nothing there.
