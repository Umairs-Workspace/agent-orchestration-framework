---
type: story
number: 01
slug: the-baseline-is-counted
title: "The baseline is counted — misunderstood-requirement findings and amendment rounds per story, on four delivered milestones, before the gate ships"
parent: 134
depends: []
status: in-review
owner: product-owner
created: 2026-09-23
updated: 2026-09-24
adrs: [ADR-007]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-007
  - wiki/planning/research/RESEARCH-specification-by-example.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/VERIFICATION.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/STATE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/RETROSPECTIVE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/OUTCOME.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/FEEDBACK.ndjson
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/00_story_the-census-reports-its-denominator/STORY.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/00_story_the-census-reports-its-denominator/RETROSPECTIVE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/00_story_the-census-reports-its-denominator/OUTCOME.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/01_story_cap-exhaustion-returns-to-the-plan/STORY.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/01_story_cap-exhaustion-returns-to-the-plan/RETROSPECTIVE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/01_story_cap-exhaustion-returns-to-the-plan/OUTCOME.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/02_story_the-learning-edge-reaches-every-cut/STORY.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/02_story_the-learning-edge-reaches-every-cut/RETROSPECTIVE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/02_story_the-learning-edge-reaches-every-cut/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/VERIFICATION.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/STATE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/00_story_the-loop-says-what-it-is-doing-and-counts-what-it-did/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/00_story_the-loop-says-what-it-is-doing-and-counts-what-it-did/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/00_story_the-loop-says-what-it-is-doing-and-counts-what-it-did/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/01_story_run-status-renders-what-the-record-holds/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/01_story_run-status-renders-what-the-record-holds/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/01_story_run-status-renders-what-the-record-holds/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/02_story_the-declaration-predicate-and-its-door/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/02_story_the-declaration-predicate-and-its-door/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/02_story_the-declaration-predicate-and-its-door/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/03_story_the-supervisor-reconciles-a-supplied-set/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/03_story_the-supervisor-reconciles-a-supplied-set/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/03_story_the-supervisor-reconciles-a-supplied-set/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/04_story_the-installer-fixes-the-daemon-environment/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/04_story_the-installer-fixes-the-daemon-environment/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/04_story_the-installer-fixes-the-daemon-environment/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/05_story_the-warning-has-one-home/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/05_story_the-warning-has-one-home/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/05_story_the-warning-has-one-home/OUTCOME.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/06_story_the-preflight-names-the-missing-heartbeat-hook/STORY.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/06_story_the-preflight-names-the-missing-heartbeat-hook/RETROSPECTIVE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories/06_story_the-preflight-names-the-missing-heartbeat-hook/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/VERIFICATION.md
  - wiki/work/archive/127_milestone_backlog-and-archive/STATE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/DESIGN.md
  - wiki/work/archive/127_milestone_backlog-and-archive/FEEDBACK.ndjson
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/01_story_one-enumerator-three-roots/STORY.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/01_story_one-enumerator-three-roots/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/01_story_one-enumerator-three-roots/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/STORY.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/02_story_promote-mints-the-number/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/03_story_archive-is-a-move/STORY.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/03_story_archive-is-a-move/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/03_story_archive-is-a-move/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/04_story_the-fleet-and-the-board-see-the-shapes/STORY.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/04_story_the-fleet-and-the-board-see-the-shapes/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/04_story_the-fleet-and-the-board-see-the-shapes/OUTCOME.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/05_story_this-tree-holds-what-is-live/STORY.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/05_story_this-tree-holds-what-is-live/RETROSPECTIVE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/stories/05_story_this-tree-holds-what-is-live/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/VERIFICATION.md
  - wiki/work/133_milestone_architecture-diagrams/STATE.md
  - wiki/work/133_milestone_architecture-diagrams/RETROSPECTIVE.md
  - wiki/work/133_milestone_architecture-diagrams/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/DESIGN.md
  - wiki/work/133_milestone_architecture-diagrams/stories/01_story_the-seam-is-named-in-config/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/01_story_the-seam-is-named-in-config/RETROSPECTIVE.md
  - wiki/work/133_milestone_architecture-diagrams/stories/01_story_the-seam-is-named-in-config/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/stories/02_story_export-writes-the-svg-and-the-png/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/02_story_export-writes-the-svg-and-the-png/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/stories/03_story_the-gates-know-about-diagrams/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/03_story_the-gates-know-about-diagrams/RETROSPECTIVE.md
  - wiki/work/133_milestone_architecture-diagrams/stories/03_story_the-gates-know-about-diagrams/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/stories/04_story_the-console-shows-it/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/04_story_the-console-shows-it/tasks/03_the-figure-expands-and-the-block-links-open.feature
  - wiki/work/133_milestone_architecture-diagrams/stories/04_story_the-console-shows-it/RETROSPECTIVE.md
  - wiki/work/133_milestone_architecture-diagrams/stories/04_story_the-console-shows-it/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/stories/05_story_the-architect-draws/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/05_story_the-architect-draws/OUTCOME.md
  - wiki/work/133_milestone_architecture-diagrams/stories/06_story_the-live-draw/STORY.md
  - wiki/work/133_milestone_architecture-diagrams/stories/06_story_the-live-draw/OUTCOME.md
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

- [x] 00 [the baseline is counted by a stated method](tasks/00_the-baseline-is-counted-by-a-stated-method.feature)

## Notes

- A documentation story. It writes no project source, so `files:` holds only the research
  document.
- The classification is a judgement. Write down the rule and the borderline cases, and count
  floors, as the origin research's §8 does.
