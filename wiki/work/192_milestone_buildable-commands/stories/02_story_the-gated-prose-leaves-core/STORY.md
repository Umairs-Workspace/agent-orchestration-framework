---
type: story
number: 02
slug: the-gated-prose-leaves-core
title: "The gated prose leaves core — discovery's beat and the build brief become fragments, so a project with a practice off holds none of its prose and a project with it on reads what it reads today"
parent: 192
depends: [00]
status: done
owner: product-owner
created: 2026-11-13
updated: 2026-11-13
adrs: [ADR-001, ADR-002, ADR-005]
reads:
  - wiki/work/192_milestone_buildable-commands/SPEC.md
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-001
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-005
  - wiki/reference/practice-prose.md
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/bundle-manifest.mjs
  - packages/core/src/integrations.mjs
  - packages/learning/src/contribution.mjs
  - packages/learning/package.json
  - packages/learning/assets/bundle.json
  - scripts/sea-asset-manifest.mjs
  - scripts/generate-bundle-manifest.mjs
  - scripts/install-local.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
  - test/arch/command/acd-learning-package-one-way.test.mjs
  - test/arch/bundle/acd-bundle-manifest-hashes.test.mjs
  - test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs
  - test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs
  - wiki/work/193_milestone_operator-aware-discovery/stories/04_story_discovery-researches-before-it-asks/STORY.md
files:
  - packages/core/assets/commands/refine.md
  - packages/core/assets/agents/aof-product-owner.md
  - packages/core/assets/agents/aof-architect.md
  - packages/core/assets/agents/aof-qa.md
  - packages/core/assets/variants/codex/workflow.md
  - packages/core/assets/bundle.json
  - packages/core/assets/fragments/build-brief/refine.md
  - packages/core/assets/fragments/build-brief/refine.codex.md
  - packages/core/assets/manifest.json
  - packages/core/src/practices.mjs
  - packages/specification-by-example/src/contribution.mjs
  - packages/specification-by-example/package.json
  - packages/specification-by-example/README.md
  - packages/specification-by-example/assets/bundle.json
  - packages/specification-by-example/assets/fragments/discovery/refine.md
  - packages/specification-by-example/assets/fragments/discovery/refine.codex.md
  - packages/specification-by-example/assets/fragments/discovery/aof-product-owner.md
  - packages/specification-by-example/assets/fragments/discovery/aof-product-owner.codex.md
  - packages/specification-by-example/assets/fragments/discovery/aof-architect.md
  - packages/specification-by-example/assets/fragments/discovery/aof-architect.codex.md
  - packages/specification-by-example/assets/fragments/discovery/aof-qa.md
  - packages/specification-by-example/assets/fragments/discovery/aof-qa.codex.md
  - packages/specification-by-example/test/discovery-fragments.suite.mjs
  - packages/specification-by-example/test/index.mjs
  - .claude/commands/aof/refine.md
  - .claude/agents/aof-product-owner.md
  - .claude/agents/aof-architect.md
  - .claude/agents/aof-qa.md
  - .agents/skills/aof-refine/SKILL.md
  - .agents/skills/aof-refine/procedure.md
  - .agents/skills/aof-refine/agents/openai.yaml
  - .codex/aof/workflows/workflow-contract.md
  - .codex/agents/aof-product-owner.toml
  - .codex/agents/aof-architect.toml
  - .codex/agents/aof-qa.toml
  - .opencode/commands/aof/refine.md
  - .opencode/agents/aof-product-owner.md
  - .opencode/agents/aof-architect.md
  - .opencode/agents/aof-qa.md
  - .aof/aof.lock.json
  - test/examples/refine-discovery-beat.test.mjs
  - test/support/cli-spawn.mjs
  - test/arch/practices/acd-off-renders-no-practice-prose.test.mjs
  - test/arch/practices/index.mjs
  - test/arch/examples/acd-sbe-package-one-way.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/planning/acd-plan-restates-no-declared-path.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/support/plan-restatement-ban.mjs
  - test/work/story-plan-document.test.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - packages/core/test/bundle.suite.mjs
schema: 1
aofVersion: 0.1.0
---
# 192/02 · The gated prose leaves core

## User story

As **an operator of a project that has not turned discovery or the build brief on**,
I want **my refine command and role briefs to hold none of their prose**,
so that **every refine in my project stops loading a fifth of a command only to be told to skip
it, while a project that has them on reads exactly what it reads today**.

What lands (ADR-005): two declared practices, `discovery` in the specification-by-example package
and `build-brief` in core's own bundle; nine slots across the refine command and the PO,
architect and QA briefs, in the Claude sources and their Codex texts; and the prose that stood at
those places, moved into fragment files with no change in what it says. The package becomes a
registered practice. This checkout has both keys on, so its own committed commands change only
at the two seams ADR-005 §4 names.

## Tasks

- [x] 00 [with a practice off the commands hold none of its prose](tasks/00_with-a-practice-off-the-commands-hold-none-of-its-prose.feature)
- [x] 01 [with a practice on the command says what it says today](tasks/01_with-a-practice-on-the-command-says-what-it-says-today.feature)
- [x] 02 [a practice's prose lives with the practice](tasks/02_a-practices-prose-lives-with-the-practice.feature)
- [x] 03 [a check that read the moved prose still reads it](tasks/03_a-check-that-read-the-moved-prose-still-reads-it.feature)

## Notes

- **The suites in `files:` are the ones found pinning the moved prose** by a search of the test
  tree for the moved phrases beside a bundle source path (2026-11-13). The search is not a proof.
  A suite that turns red for the same reason and is not listed is a contract gap to report, not
  a file to edit quietly.
- **193/04 waits on this layout.** Its `files:` guessed
  `assets/fragments/operator-aware/<target>.md` and `.codex.md`; ADR-005 §3 keeps that shape.
- The developer brief's `PLAN.md` paragraph, `manual.md`, `continue.md`, `verify.md`, the
  templates and the Codex execution contract's one sentence about a map token stay where they
  are (ADR-005 §6).
- FF-19208 lands here and loses its `pending` marker in the milestone's register when it does.
- One `@manual` check, developer-run: the comparison with the commit before this story. Its
  evidence is recorded in the milestone's `VERIFICATION.md`.
