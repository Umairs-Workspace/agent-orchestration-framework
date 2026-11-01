---
type: story
number: 04
slug: the-pilot-runs-and-is-reported
title: "The pilot runs and is reported — the operator's audience and budget, coded observations, and a report that states its limits"
parent: 189
depends: [02, 03]
status: not-started
owner: product-owner
created: 2026-11-01
updated: 2026-11-01
adrs: [ADR-005]
reads:
  - wiki/work/189_milestone_human-understanding-checks/SPEC.md
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-005
  - packages/learning/pilot/PROTOCOL.md
  - packages/learning/pilot/OBSERVATION-SHEET.md
  - packages/learning/pilot/REPORT-TEMPLATE.md
  - wiki/planning/RESEARCH-human-led-learning.md
files:
  - wiki/planning/PILOT-REPORT-human-led-learning.md
schema: 1
aofVersion: 0.1.0
---
# 189/04 · The pilot runs and is reported

## User story

As **the operator deciding whether the guided path is worth more than today's manual guide**,
I want **the pilot run as the protocol says, on the audience and within the budget I set, and a report
that gives the sample size, what was not observed, and what the results do and do not show**,
so that **I decide on evidence of what people could do unaided, not on how many stories went green**.

What lands: the human-reviewed `PILOT-REPORT-human-led-learning.md`, drafted from the coded
observation sheets. No participant answer or transcript is kept.

## Tasks

- [ ] 00 [the pilot runs as the protocol says](tasks/00_the-pilot-runs-as-the-protocol-says.feature)
- [ ] 01 [the report states its limits](tasks/01_the-report-states-its-limits.feature)
- [ ] 02 [the operator accepts the report](tasks/02_the-operator-accepts-the-report.feature)

## Notes

- `@uat` and `@manual` only: the participant is the operator (n = 1, 04 Q1), so the sessions and
  the acceptance are theirs. No `@executable` scenario exists.
- The delayed items fall about a week after each pack's session (04 Q2), so this story spans at
  least a week of calendar time. It is the only story in 189 that does.
