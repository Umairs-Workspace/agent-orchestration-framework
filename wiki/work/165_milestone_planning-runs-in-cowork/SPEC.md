---
type: milestone
number: 165
slug: planning-runs-in-cowork
title: "Planning runs in Cowork — `aof planning init --runtime cowork` delivers the planner and the PRD-to-roadmap seam as a Cowork plugin, alongside Claude and Codex"
status: in-progress
owner: product-owner
created: 2026-10-19
updated: 2026-10-20
schema: 1
aofVersion: 0.1.0
tags: [planning, cowork, runtime]
---
# 165 · Planning runs in Cowork

## Objective

An operator can do a project's planning in Claude Cowork: author a PRD with the bought planner
(`pm-skills`), shatter it into framed milestone SPECs and spikes with their `depends` edges, and
read what each item is for — on the same `wiki/work/` tree that Claude Code and Codex then build
from. Cowork is where the knowledge work upstream of the PRD fits best; building, reviewing and
verifying stay with the coding runtimes.

`aof planning init --runtime cowork` is the one door. Cowork has no plugin CLI, so unlike the
claude path there is nothing to spawn: the cowork path renders an installable `.plugin` bundle and
hands the operator an honest manual install step, recording that the install is not yet confirmed
(the ADR-004 posture codex already takes). Adding cowork never disturbs a claude or codex planning
install already recorded in the lock.

An outsider can check it. In a repo already initialised with `aof planning init` (claude), run
`aof planning init --runtime cowork`. The claude provenance in `.aof/aof.lock.json` is unchanged and
a cowork entry sits beside it. Install the emitted plugin in Cowork, connect the repo folder, and
from Cowork write a PRD and shatter it: the milestone SPECs land in the work tree, and
`aof work validate` run from the Windows CLI passes over them.

## Scope

In scope:
- `cowork` is a valid `aof planning init` runtime; its plan spawns nothing and yields a render step
  plus the manual install instructions; `--dry-run` previews both
- the cowork bundle: an `aof` plugin (`.claude-plugin/plugin.json` + `skills/*/SKILL.md`)
  rendered from the existing command sources and zipped to a `.plugin` under `.aof/`, carrying at
  least shatter (PRD discovery included) and, if the break-down warrants, refine and explain
- the bought planner reaching Cowork — either the pinned `pm-skills` marketplace added through
  Cowork's own UI, or the pinned tag's plugins bundled by aof — keeping ADR-002/003 provenance
  (a 40-hex commit recorded, never a floating ref)
- the lock's `planning` section holds one entry per runtime, so a second runtime is added without
  `--force` and without overwriting the first; existing single-runtime locks still read
- `--scope` handled explicitly for cowork (refused or ignored with a note, as for codex)
- skills that run without the `aof` CLI on PATH: Cowork's shell is a Linux VM where the Windows
  `aof.exe` payload does not run, so CLI checks are used only when present
- fitness functions extended to the cowork branch (install-commands, lock-isolation, no-codex-install
  peers)

Out of scope:
- the build / review / verify lifecycle in Cowork (`continue`, `review`, `verify`, the loop) — needs
  worktrees, test runs and native subagent fan-out; stays with Claude Code and Codex
- a `cowork` runtime for `aof work init` / the asset renderer — revisit once planning proves the shape
- an aof MCP server exposing validate/next/scaffold to Cowork — a candidate follow-up if prompt-driven
  writes prove unreliable
- publishing to an org plugin marketplace — the `.plugin` file is the delivery here
- Cowork hooks — rarely used there, and the claude/opencode session hooks do not map

## Stories
- [x] `00_story_planning-lock-records-each-runtime` — the lock keeps one planning entry per runtime; a new runtime is added without `--force`, and `--force` re-pins only the runtime it names (ADR-004).
- [x] `01_story_planning-skills-render-as-a-cowork-plugin` — shatter and explain become `aof` skills, rendered from their command sources through the shared command-to-skill mapping, and packaged as a reproducible `.plugin` (ADR-002, ADR-005).
- [x] `02_story_pinned-planner-is-packaged-for-cowork` — pm-skills' recommended plugins are packaged from a clone checked against the recorded commit (ADR-003).
- [ ] `03_story_planning-init-delivers-cowork` — `aof planning init --runtime cowork` writes the packages, prints the upload steps and records an unconfirmed cowork entry; depends on 00, 01 and 02 (ADR-001).

00, 01 and 02 have no data dependency on each other. 01 and 02 both add a suite and an arch control, and they share the
directory-budget file and the two test indexes, so the wave planner runs them one after the other. 00 runs beside
either one. 03 composes all three.

## Dependencies

- `02_milestone_planning-init` (archived) — the planning vertical, its ADRs 001–010 and the
  `acd-planning-*` fitness functions this extends
- `154_milestone_codex-drives-the-loop-alongside-claude` — precedent for adding a runtime that
  degrades honestly beside claude
- Cowork plugin format (shared with Claude Code plugins) and Cowork's behaviour with a connected
  folder — external; to be confirmed in RESEARCH
