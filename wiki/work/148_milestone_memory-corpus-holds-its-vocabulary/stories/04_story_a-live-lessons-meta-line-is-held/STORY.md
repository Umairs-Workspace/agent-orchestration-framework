---
type: story
number: 04
slug: a-live-lessons-meta-line-is-held
title: "A live lesson's meta line is held — validate errors on a non-enum value in a live item, doctor warns on an archived one"
parent: 148
status: done
owner: product-owner
created: 2026-10-04
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [02]
adrs: [ADR-007, ADR-002, ADR-001]
reads:
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-007
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-002
  - packages/work/src/memory-vocabulary.mjs
  - packages/work/src/discovery.mjs
  - packages/work/src/doctor/coherence.mjs
  - packages/work/src/doctor/depends.mjs
  - packages/core/src/application/bindings/commands/validate.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/work/test/doctor.test.mjs
  - packages/work/test/support/doctor-services.mjs
  - test/arch/work/acd-advisory-lane-never-gates.test.mjs
files:
  - packages/work/src/memory-vocabulary.mjs
  - packages/work/test/memory-vocabulary.suite.mjs
  - packages/work/src/commands/validate.mjs
  - packages/work/src/doctor/lesson-meta.mjs
  - packages/work/src/doctor/index.mjs
  - packages/core/src/application/bindings/work/doctor.mjs
  - packages/core/assets/commands/retrospective.md
  - packages/core/assets/manifest.json
  - .claude/commands/aof/retrospective.md
  - .opencode/commands/aof/retrospective.md
  - .codex/skills/aof-retrospective/SKILL.md
  - packages/work/test/lesson-meta-hold.suite.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/examples/doctor-examples-lane.test.mjs
  - test/bundle/yarn-installation.test.mjs
  - packages/work/test/index.mjs
  - wiki/work/134_milestone_discovery-the-example-map/RETROSPECTIVE.md
  - wiki/work/134_milestone_discovery-the-example-map/stories/01_story_the-baseline-is-counted/RETROSPECTIVE.md
  - wiki/work/134_milestone_discovery-the-example-map/stories/02_story_the-map-is-a-document/RETROSPECTIVE.md
  - wiki/work/134_milestone_discovery-the-example-map/stories/03_story_the-answer-is-read-from-the-harness/RETROSPECTIVE.md
  - wiki/work/134_milestone_discovery-the-example-map/stories/04_story_the-readiness-gate/RETROSPECTIVE.md
  - wiki/work/134_milestone_discovery-the-example-map/stories/05_story_the-discovery-beat/RETROSPECTIVE.md
  - wiki/work/135_milestone_key-examples-in-the-contract/stories/03_story_the-board-groups-scenarios-by-rule/RETROSPECTIVE.md
  - wiki/work/135_milestone_key-examples-in-the-contract/stories/04_story_an-agreed-example-cannot-fall-out/RETROSPECTIVE.md
  - wiki/work/135_milestone_key-examples-in-the-contract/stories/05_story_the-contract-is-formulated-from-the-map/RETROSPECTIVE.md
  - wiki/work/136_milestone_discovery-questions-in-the-loop/RETROSPECTIVE.md
  - wiki/work/144_story_the-whole-tree-run-signs-off-in-minutes/RETROSPECTIVE.md
  - wiki/work/145_story_loop-diagram/RETROSPECTIVE.md
  - wiki/work/146_story_a-capture-can-skip-the-backlog/RETROSPECTIVE.md
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/RETROSPECTIVE.md
---
# 04 · A live lesson's meta line is held

## User story

As **whoever recalls lessons later** (an agent filtering by kind, the operator reading `status`),
I want **a retrospective in a live item to fail validate when a lesson's Kind, Area or Stage is
outside the vocabulary or its Owner is missing, and an archived one to be flagged without being
failed or rewritten**,
so that **every new lesson reaches the filters it belongs to, and the old ones are visible as
debt instead of silently unreachable**.

What lands (ADR-007): the hold, composed in `commands/validate.mjs` for live rows, with a finding
naming the file, the `R<n>`, the field, the value and the legal values. A qualifier is legal. A doctor
lane gives one `lesson-meta-archived` warning per archived retrospective that holds a
non-conforming lesson. Its codes are its own frozen array, so 124/FF-12402 keeps it from gating.
The live non-conformers are re-classified here so the stream is green when the rule lands, and the
retrospective prompt states the rule.

## Tasks

- [x] 00 [a live lesson's meta line is held by validate](tasks/00_a-live-lessons-meta-line-is-held-by-validate.feature)
- [x] 01 [an archived lesson's meta line is flagged, never failed](tasks/01_an-archived-lessons-meta-line-is-flagged-never-failed.feature)
- [x] 02 [the live stream is green when the hold lands](tasks/02_the-live-stream-is-green-when-the-hold-lands.feature)

## Notes

- **Re-measure the live set at build** (134/01/R2): measured 2026-10-04, 26 lessons in the 14
  retrospectives under `files:`. An item archived before this story builds has left the live set,
  and its retrospective is never back-filled, so it is not edited. Each re-classification keeps the
  written word as the qualifier (`**Kind:** near-miss (risk)`), and a lesson with no meta line gains
  one authored from its own text. The review checks each choice against the lesson it classifies.
- The rendered prompt copies are refreshed from the asset with `aof work update`, never edited by
  hand.
