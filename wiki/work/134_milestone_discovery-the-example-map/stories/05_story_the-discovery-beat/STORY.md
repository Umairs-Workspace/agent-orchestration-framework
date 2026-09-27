---
type: story
number: 05
slug: the-discovery-beat
title: "The discovery beat — refine maps rules, key examples and questions before any headline Scenario, asks a person the business questions, and --autonomous asks them at its one stop"
parent: 134
depends: [02]
status: in-progress
owner: product-owner
created: 2026-09-23
updated: 2026-09-24
adrs: [ADR-001, ADR-003, ADR-004, ADR-005, ADR-006]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-001
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-003
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-004
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-005
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - wiki/planning/research/RESEARCH-specification-by-example.md
  - wiki/acceptance-criteria.md
  - src/work-examples/map.mjs
  - src/bundle/commands/refine.md
  - src/bundle/agents/aof-product-owner.md
  - src/bundle/agents/aof-architect.md
  - src/bundle/agents/aof-qa.md
  - src/bundle/templates/story/PLAN.md
  - src/bundle/bundle.json
  - test/bundle/bundle-architect-draws.test.mjs
  - test/work/story-plan-document.test.mjs
  - test/examples/index.mjs
  - src/commands/insert-shared.mjs
  - test/support/source-slice.mjs
files:
  - src/bundle/commands/refine.md
  - src/bundle/agents/aof-product-owner.md
  - src/bundle/agents/aof-architect.md
  - src/bundle/templates/story/EXAMPLES.md
  - src/bundle/manifest.json
  - wiki/acceptance-criteria.md
  - .claude/commands/aof/refine.md
  - .claude/agents/aof-product-owner.md
  - .claude/agents/aof-architect.md
  - .codex/skills/aof-refine/SKILL.md
  - .codex/agents/aof-product-owner.md
  - .codex/agents/aof-architect.md
  - .opencode/commands/aof/refine.md
  - .opencode/agents/aof-product-owner.md
  - .opencode/agents/aof-architect.md
  - .aof/templates/work/story/EXAMPLES.md
  - .aof/templates/work/story/PLAN.md
  - .aof/templates/work/story/STORY.md
  - .aof/loops/mesh-assignment-reclaim.md
  - .aof/loops/run-resilience.md
  - .aof/aof.lock.json
  - test/examples/index.mjs
  - test/examples/refine-discovery-beat.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 05 · The discovery beat

## User story

As **the operator who owns the business rules a story implies**,
I want **refine's story Contract stage to open, when `work.examples.enabled` is on, with a
discovery beat. In it the PO drafts `EXAMPLES.md` (rules, two or three key examples per rule with
real values including the awkward edge, and every question it cannot answer from the record),
the architect reviews each `technical` label, business questions come to me through
`AskUserQuestion` with their map token, and the stage stops on doctor's error before any headline
Scenario. I also want `--autonomous` to bring every open business question to its one end review
as a question, never as a default**,
so that **a business rule is decided by the person who owns it, before the contract that encodes
it is written and while changing it costs a sentence rather than an amendment round**.

What lands (ADR-001 template, ADR-003 §2 token, ADR-004, ADR-005 §5, ADR-006 §3-4): the
discovery block at the head of the story Contract in `src/bundle/commands/refine.md`, and the
`--autonomous` rule beside the existing "documented default decisions" sentence. The PO brief
learns the map and the token. The architect brief learns the classification review. The
`EXAMPLES.md` template is added under `templates/story/`, and `wiki/acceptance-criteria.md` gains
the level above the three zoom levels. All rendered copies are refreshed through
`aof work update`, never by hand.

## Tasks

- [ ] 00 [refine opens the story contract with a discovery beat when the gate is on](tasks/00_refine-opens-the-story-contract-with-a-discovery-beat-when-the-gate-is-on.feature)
- [ ] 01 [--autonomous brings every open business question to its one stop as a question](tasks/01_autonomous-brings-every-open-business-question-to-its-one-stop-as-a-question.feature)
- [ ] 02 [the PO brief learns the map and the architect brief learns the classification review](tasks/02_the-po-brief-learns-the-map-and-the-architect-brief-learns-the-classification-review.feature)
- [ ] 03 [the EXAMPLES.md template is a legal map the bundle installs](tasks/03_the-examples-template-is-a-legal-map-the-bundle-installs.feature)
- [ ] 04 [the acceptance-criteria guide names discovery above the three zoom levels](tasks/04_the-acceptance-criteria-guide-names-discovery-above-the-three-zoom-levels.feature)

## Notes

- **With the gate off the beat does not run**, and refine writes exactly what it writes today
  (ADR-006 §3). The block is conditional prose, the same shape as the `PLAN.md` block.
- **Asking happens in the main session in both modes.** A subagent has never called the tool
  (RESEARCH R2). In orchestrated mode the PO agent drafts, and the main session asks.
- The map's grammar and token are 02's. This story teaches them and does not restate the parser's
  rules in a second form.
- QA's Examples tables do not change (SPEC, out of scope).
