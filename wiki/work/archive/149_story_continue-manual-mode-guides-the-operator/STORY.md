---
type: story
number: 149
slug: continue-manual-mode-guides-the-operator
title: "Manual mode: continue guides the operator who builds the work themselves"
status: done
owner: product-owner
created: 2026-10-04
updated: 2026-10-05
schema: 1
aofVersion: 0.1.0
reads:
  - packages/core/assets/commands/verify.md
  - packages/core/src/application/bindings/commands/continue.mjs
  - packages/specification-by-example/src/build-door.mjs
  - packages/contracts/src/loop-bounds.mjs
  - packages/work-loop/src/commands/drive.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/work/bundle.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/command/application-assembly.test.mjs
  - test/bundle/core-workspace.test.mjs
  - test/examples/continue-door-examples.test.mjs
files:
  - packages/core/assets/commands/continue.md
  - packages/core/assets/commands/review.md
  - packages/core/assets/commands/code-review.md
  - packages/core/assets/commands/autonomous.md
  - packages/core/assets/commands/assimilate-code.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/work/src/commands/continue.mjs
  - packages/knowledge/src/memory/graphify-backend.mjs
  - .aof/aof.lock.json
  - .aof/aof.config.json
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/review.md
  - .claude/commands/aof/code-review.md
  - .claude/commands/aof/autonomous.md
  - .claude/commands/aof/assimilate-code.md
  - .codex/skills/aof-continue/SKILL.md
  - .codex/skills/aof-review/SKILL.md
  - .codex/skills/aof-code-review/SKILL.md
  - .codex/skills/aof-autonomous/SKILL.md
  - .codex/skills/aof-assimilate-code/SKILL.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/review.md
  - .opencode/commands/aof/code-review.md
  - .opencode/commands/aof/autonomous.md
  - .opencode/commands/aof/assimilate-code.md
  - README.md
  - docs/acd.md
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/surfaces/board-mesh-execution.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/work/story-context-contract.test.mjs
  - test/arch/command/acd-prompt-gate-ladder-parity.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/graph/acd-codebase-graph-derived.test.mjs
  - test/arch/graph/acd-codebase-grounding-advisory.test.mjs
  - test/arch/graph/acd-codebase-grounding-no-parse.test.mjs
  - test/arch/graph/acd-codebase-grounding-via-commands.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/arch/work/acd-work-insert-command-bundle-parity.test.mjs
  - test/arch/loop/acd-loop-cap-single-home.test.mjs
  - packages/core/test/bundle.suite.mjs
---
# 149 · Manual mode: continue guides the operator who builds the work themselves

## User story

As **an operator who wants to write the code for a story myself**,
I want **`aof:continue <ref> --manual` to assume I am the implementer, and to hand me a guide
instead of a build: the key areas of the codebase the story touches, what each task's scenarios
require, where the tests live and what has to go green, and the order it would take them in**,
so that **I keep the item governed (contract, status, review) without handing the keyboard to an
agent, and I learn the parts of the system the story touches instead of reading a diff after
the fact**.

## Tasks

- [x] `tasks/00_a-manual-continue-hands-the-operator-a-guide.feature` — continue's `<manual_mode>`
  region: the run, the test run, the guide's parts, terminal only, the hand-back to `aof:review`
- [x] `tasks/01_manual-is-one-story-here-at-every-door.feature` — the contradiction stop, the
  milestone refusal, the CLI door's `--manual` and its two refusals, and the loop never composing it
- [x] `tasks/02_aof-review-reviews-the-operators-build.feature` — the `/aof:review` command over
  continue's one gate ladder and review lanes, findings to the operator, the blast-radius ranking
- [x] `tasks/03_aof-code-review-is-removed.feature` — the command, its renders, `--ship` and
  `work.codeReview.autoComplete` removed, and the controls pinned on them retired
- [x] `tasks/04_a-real-manual-story-walks-guide-review-verify.feature` — `@manual`, a real guide
  and review in the test-bed

## Notes

- **The operator's words (2026-10-04):** "If I do `continue <> --manual` then the assumption is
  that the user wants to implement the work. AOF's job is then to highlight key areas and guide
  the user with an output."
- **Shape of the output, to be settled at refine.** A guide the operator reads before touching
  code: the story's contract (user story, each `.feature` and its scenarios), the `reads:` and
  `files:` sets with a line on why each matters, the test files that gate the item and the
  `scripts/test.mjs --only` set that runs them, the ADRs the story inherits, and a suggested
  sequence of tasks. No code is written and no agent builds.
- **Relationship to the existing modes.** `--solo` and `--orchestrated` decide WHO among the
  agents does the work. `--manual` is a third answer: the operator does. It is contradictory
  with the other two and the loop never composes it.
- **Settled at refine (2026-10-04, EXAMPLES.md Q1–Q5, Q9, Q10):** a manual continue starts the
  story; the guide is terminal only; stories and tasks only; the CLI door takes `--manual`. Review is
  a new `aof:review` command, which the operator asked for in place of "re-run `--manual`".
  Mid-refine the operator also ruled that `aof:code-review` is removed, never used, with
  `aof:autonomous --ship` and `work.codeReview.autoComplete`. Q6–Q8 and Q11–Q13 take the defaults in
  PLAN.md.
- **Boundary drawn from the source.** `aof graph build .` timed out (`graphify-timeout`, 120 s), so no
  graph informed `reads:`/`files:`; they come from the door, the two prompts and a census of every
  file naming `code-review` or `codeReview`. `files:` overlaps 147 on the manifest, the lock and
  `docs/acd.md`, so the two build one after the other.
