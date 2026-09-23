---
type: story
number: 01
slug: the-baseline-is-counted
title: "The baseline is counted — misunderstood-requirement findings and amendment rounds per story, on four delivered milestones, before the gate ships"
parent: 134
depends: []
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-007]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-007
  - wiki/planning/research/RESEARCH-specification-by-example.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/VERIFICATION.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/STATE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/VERIFICATION.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/STATE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/VERIFICATION.md
  - wiki/work/archive/127_milestone_backlog-and-archive/STATE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/RETROSPECTIVE.md
  - wiki/work/133_milestone_architecture-diagrams/VERIFICATION.md
  - wiki/work/133_milestone_architecture-diagrams/STATE.md
  - wiki/work/133_milestone_architecture-diagrams/RETROSPECTIVE.md
files:
  - wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md
schema: 1
aofVersion: 0.1.0
---
# 01 · The baseline is counted

## User story

As **the operator deciding whether discovery earns its place in every refine**,
I want **the misunderstood-requirement review findings and the amendment rounds per story counted
on four recently delivered milestones (124, 126, 127, 133), by a stated method, before the
readiness gate ships**,
so that **the live run and any later measurement have a before-number to compare against, and
the milestone's value is measured rather than asserted**.

What lands: a `## R7 · Baseline` section in this milestone's `RESEARCH.md`. It gives, per
milestone and per story: the review findings whose cause was a requirement understood differently
from what was meant (the finding's own text says so, or its fix changed an acceptance criterion
rather than code), and the number of rounds in which a contract was amended after authoring. It
lists the commands and the classification rule, so another reader can repeat the count.

## Tasks

To be authored at story refine.

## Notes

- A documentation story. It writes no project source, so `files:` holds only the research
  document.
- The classification is a judgement. Write down the rule and the borderline cases, and count
  floors, as the origin research's §8 does.
