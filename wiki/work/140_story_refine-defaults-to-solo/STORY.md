---
type: story
number: 140
slug: refine-defaults-to-solo
title: "Refine runs solo unless told otherwise — continue stays orchestrated by hand and solo under the loop"
status: in-review
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/129_milestone_loop-concurrency/stories/07_story_the-loop-settings-are-self-contained/tasks/02_the-drive-carries-the-phase-mode.feature
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - scripts/generate-bundle-manifest.mjs
files:
  - src/loop-bounds.mjs
  - src/commands/drive.mjs
  - src/bundle/commands/refine.md
  - src/bundle/commands/continue.md
  - src/bundle/commands/autonomous.md
  - .claude/commands/aof/refine.md
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/autonomous.md
  - .codex/skills/aof-refine/SKILL.md
  - .codex/skills/aof-continue/SKILL.md
  - .codex/skills/aof-autonomous/SKILL.md
  - .opencode/commands/aof/refine.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/autonomous.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
  - .aof/aof.config.json
  - schemas/aof.schema.json
  - test/loop/loop-bounds.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/work/acd-phase-door-not-a-driver.test.mjs
  - test/loop/loop-command-reconcile.test.mjs
  - test/loop/loop-only-fail-redrives.test.mjs
  - test/loop/loop-cap-exhaustion-carries-the-record.test.mjs
  - test/loop/warm-start-local-drive.test.mjs
  - test/loop/warm-fix-loop.test.mjs
  - test/loop/unattended-launch-envelope.test.mjs
  - test/loop/loop-command-gate.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-resumed-redrive-declares-its-grade.test.mjs
  - test/loop/loop-record-reaches-the-redrive.test.mjs
  - test/loop/loop-progress-production.test.mjs
  - test/loop/loop-gate-cost-ladder.test.mjs
  - test/loop/loop-command-sequencing.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/work/four-deadlines.test.mjs
---
# 140 · Refine runs solo unless told otherwise

## User story

As **the operator paying for every refine in tokens and wall-clock**,
I want **refine to play its roles inline by default — whether I run `/aof:refine` by hand or the
loop drives it — while a hand-run `/aof:continue` keeps spawning its role agents and a loop-driven
one stays inline, and `--solo` / `--orchestrated` still override either way for one run**,
so that **a story's contract no longer costs a dozen cold-start agents each re-reading the same
story, ADRs and code to write one `.feature` apiece. On 2026-09-27 one story's refine had ~11
`aof-qa` agents in flight at 250–350k tokens each, 22 minutes in and unfinished. Solo writes the
same contract in one context that already holds everything, and keeps sibling tasks consistent
because a single author sees all of them.**

## Tasks

- [x] `tasks/00_each-prompt-states-its-own-default.feature` — an unset `work.agents.mode` plays
  refine solo and continue orchestrated; an orchestrated refine gives each story one `aof-qa`
- [x] `tasks/01_the-loop-drives-both-phases-solo.feature` — an unset `work.loop.agents.<phase>.mode`
  composes `--solo`; the loop never inherits `work.agents.mode`
- [ ] `tasks/02_every-repo-runs-the-new-defaults.feature` — this repo and every repo the operator
  names drop their mode pins and re-render (@manual)

## Decisions taken at refine

| | hand-run (`/aof:<phase>`) | loop-driven (`aof work drive` / `aof work loop`) |
|---|---|---|
| refine | solo | solo |
| continue | orchestrated | solo |

- **Two surfaces, two defaults, no new key.** `work.agents.mode` governs the sessions an operator
  types; when unset, each command applies its own default. `work.loop.agents.<phase>.mode` governs
  driven sessions and defaults to `solo`. The loop no longer inherits `work.agents.mode`. That is
  the only way continue can differ by entry point without adding a per-phase key under
  `work.agents`, and it finishes what 129/07 started: the loop's settings are self-contained under
  `work.loop`.
- **The default lives at the phase level in `src/loop-bounds.mjs`.** The per-key resolvers keep
  answering `null` for unset, so the registry range probe and the tuner (which step from `null`)
  and the single-home control are unchanged. Only that control's message text changes.
- **An orchestrated refine gives each story ONE `aof-qa`.** `refine.md` already named one QA agent
  but never forbade splitting per task, which is what produced the 2026-09-27 fan-out.
- **The other role-spawning commands keep their default** (`assimilate-code`, `migrate`, the
  `autonomous` wrapper): unset still means orchestrated for them.

## What this supersedes, deliberately and in the open

`129/07/tasks/02_the-drive-carries-the-phase-mode.feature` delivers "unset composes no flag" (its
drive rows) and "…falling back to `work.agents.mode`" (its prompt rows). 129/ADR-001 §5 (AMENDED
2026-09-15) says the same. Both are delivered and therefore immutable: not edited, not annotated,
not tagged. The new rule lives in this story's tasks 00 and 01, and the test cases backing the
superseded rows are re-pointed and renamed to 140, as 123 did against 118/00. 129/07's
`--solo`/`--orchestrated` override rows are NOT superseded and keep their tests.

## Boundary

- **The mesh directive is untouched.** `assignmentDirectiveCommand` types `/aof:continue <ref>` with
  no flag on a worker, so a worker's story continue follows the prompt's default (orchestrated). A
  worker's milestone continue dispatches `autonomous`, which runs the loop and so gets `solo`.
- **`aof work continue|refine <ref>`'s local answer is untouched.** It hands the caller a flagless
  command to type in their own session, which is a hand-run.
- **Blast radius, measured at refine:** 34 test files hold a flagless `/aof:refine|continue`
  literal. Only the `test/loop/` drive assertions break. The rest are mesh directives or brief
  inputs, which nothing composes a flag onto.
