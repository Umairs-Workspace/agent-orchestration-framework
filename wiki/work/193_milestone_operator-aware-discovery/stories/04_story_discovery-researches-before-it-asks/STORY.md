---
type: story
number: 04
slug: discovery-researches-before-it-asks
title: "Discovery researches before it asks — as fragments of the practice, rendered only where a project turned the switch on: refine sorts a fact from a decision, researches the fact at the operator's level, returns what it settled as one batch, and every question it asks explains itself"
parent: 193
depends: [00, 01, 02, 03]
status: done
owner: product-owner
created: 2026-11-12
updated: 2026-11-15
adrs: [ADR-004, ADR-005, ADR-006]
reads:
  - wiki/work/193_milestone_operator-aware-discovery/SPEC.md
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-001
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-002
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-003
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-004
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-005
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-006
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-001
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-004
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-004
  - wiki/work/archive/136_milestone_discovery-questions-in-the-loop/ARCHITECTURE.md#ADR-002
  - packages/specification-by-example/src/map.mjs
  - packages/specification-by-example/src/doctor-lane.mjs
  - packages/specification-by-example/src/operator-lane.mjs
  - packages/contracts/src/operator-profile.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - packages/core/src/practices.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/assets/bundle.json
  - packages/specification-by-example/assets/fragments/discovery/refine.md
  - packages/specification-by-example/assets/fragments/discovery/refine.codex.md
  - packages/specification-by-example/assets/fragments/discovery/aof-product-owner.md
  - packages/specification-by-example/assets/fragments/discovery/aof-product-owner.codex.md
  - packages/specification-by-example/assets/fragments/discovery/aof-architect.md
  - packages/specification-by-example/assets/fragments/discovery/aof-architect.codex.md
  - packages/core/assets/templates/story/EXAMPLES.md
  - packages/core/assets/templates/milestone/RESEARCH.md
  - packages/execution/src/session-driver.mjs
  - test/examples/refine-discovery-beat.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs
  - test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs
  - test/arch/practices/acd-off-renders-no-practice-prose.test.mjs
files:
  - packages/specification-by-example/assets/bundle.json
  - packages/specification-by-example/assets/fragments/operator-aware/refine.md
  - packages/specification-by-example/assets/fragments/operator-aware/refine.codex.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-product-owner.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-product-owner.codex.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-researcher.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-researcher.codex.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-architect.md
  - packages/specification-by-example/assets/fragments/operator-aware/aof-architect.codex.md
  - packages/specification-by-example/assets/templates/operator-aware/EXAMPLES.md
  - packages/specification-by-example/assets/templates/operator-aware/RESEARCH.md
  - packages/specification-by-example/README.md
  - packages/specification-by-example/test/operator-aware-beat.suite.mjs
  - packages/specification-by-example/test/discovery-fragments.suite.mjs
  - packages/specification-by-example/test/index.mjs
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/practice-render-lane.suite.mjs
  - packages/core/assets/commands/refine.md
  - packages/core/assets/agents/aof-researcher.md
  - packages/core/assets/variants/codex/workflow.md
  - packages/core/assets/manifest.json
  - .aof/aof.lock.json
  - .claude/commands/aof/refine.md
  - .opencode/commands/aof/refine.md
  - .agents/skills/aof-refine/SKILL.md
  - .agents/skills/aof-refine/procedure.md
  - .agents/skills/aof-refine/agents/openai.yaml
  - .claude/agents/aof-researcher.md
  - .opencode/agents/aof-researcher.md
  - .codex/agents/aof-researcher.toml
  - .codex/aof/workflows/workflow-contract.md
  - test/arch/examples/acd-examples-off-is-today.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/acceptance-criteria.md
schema: 1
aofVersion: 0.1.0
---
# 193/04 · Discovery researches before it asks

## User story

As **an operator steering a build in a subject I am not a specialist in**,
I want **refine to look a fact up before it asks me, to ask me only what is mine to decide, and to
tell me what it would pick and why whenever it does ask, in the projects where I have asked for
that**,
so that **I am asked as the person steering the build, not as the domain expert, and a project
that does not need any of this carries none of it**.

What lands (ADR-004, ADR-005, ADR-006 §2, §8): a second practice of the package,
`operator-aware`, on only when `work.examples.enabled` and `work.examples.operatorAware` are both
`true`, and its fragments. The beat for refine's discovery slot replaces the beat that ships today:
it labels a question `domain`, `policy` or `technical`, reads the operator's profile and the item's
domains, researches a domain question below `expert` in one researcher pass, and returns what
research settled as one batch. Every question carries `I would pick:`, and `Background:` below
`expert`. Every other discovery fragment that says `business` is replaced the same way (the
formulation, the cascade, the hand-back, the Codex entry rule, the PO and architect briefs), and the
researcher brief gains a fragment of its own, for Claude and for Codex. A variant of the
`EXAMPLES.md` and `RESEARCH.md` templates teaches the new forms. FF-19204 holds that a project with
the switch off renders none of it.

## Tasks

- [x] 00 [the beat tells a fact from a decision](tasks/00_the-beat-tells-a-fact-from-a-decision.feature)
- [x] 01 [a fact is researched before anyone is asked](tasks/01_a-fact-is-researched-before-anyone-is-asked.feature)
- [x] 02 [what research settles comes back as one batch](tasks/02_what-research-settles-comes-back-as-one-batch.feature)
- [x] 03 [every question comes with a recommendation](tasks/03_every-question-comes-with-a-recommendation.feature)
- [x] 04 [on renders it, and off renders none of it](tasks/04_on-renders-it-and-off-renders-none-of-it.feature)

## Notes

- **Settled against milestone 192 as delivered** (re-refined 2026-11-14, ADR-006 §8). 192 kept
  the fragment layout this story had guessed, but a fragment names its practice, never its keys,
  so the two keys live on the `operator-aware` practice entry in the package's `bundle.json`, and
  each fragment that stands in for a discovery one says so with `replaces`.
- The contract is written against the render, not against a source file: every scenario reads
  what a fixture project with the switch on is given.
- The core sources in `files:` are for slots only: `config.roles`, where refine says who plays the
  roles in solo mode, and `ownership.research` in the researcher brief, which has no gated prose
  today. Each goes in the common source and in its Codex text. A slot with nothing on renders
  nothing, so this checkout's own commands do not change.
- Three of 192's suites pin the shipped practice list as exactly `discovery` and `build-brief`
  (core's `bundle-compose` and `practice-render-lane` suites, the package's `discovery-fragments`
  suite). They gain `operator-aware`; that is why they are in `files:`.
- The milestone's live run needs this story: one real refine of a story in a domain declared
  `new`, in a project with the switch on (`STATE.md`, Verification).
