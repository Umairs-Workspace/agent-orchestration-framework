---
type: story
number: 06
slug: the-second-live-run
title: "The second live run — refine_first switched on in this repo and aof work loop driven over a real two-member wave with a held third, read at the source"
parent: 129
depends: [5]
status: not-started
owner: product-owner
created: 2026-09-12
updated: 2026-09-12
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-007, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-002
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-007
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/129_milestone_loop-concurrency/STATE.md
  - wiki/work/127_milestone_backlog-and-archive/STATE.md
  - .aof/aof.config.json
  - .claude/rules/build-deploy-restart.md
  - src/loop-diag.mjs
  - src/commands/loop.mjs
  - src/loop/wave.mjs
  - src/bundle/commands/autonomous.md
  - test/arch/loop/acd-lane-records-and-the-declaration.test.mjs
files:
  - .aof/aof.config.json
  - wiki/work/129_milestone_loop-concurrency/STATE.md
  - wiki/work/127_milestone_backlog-and-archive/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 06 · The second live run

## User story

As **the operator who framed this milestone from a live run that deadlocked**,
I want **`work.loop.concurrency: "refine_first"` set in this repository's own config and one real
`aof work loop <NN>` driven over a milestone whose ready set partitions into a two-member wave and
a held third — 127's `02`/`04` with `03` held if it is still live, otherwise the standing test-bed
— and every claim of the SPEC's verifiable outcome read at the source, not in the account alone**,
so that **the milestone is accepted on the thing it was built for: two lanes at once, two records,
two grades, the held story cut from the merged work, every lane named in the account, and a forced
conflict halting `lane-merge-conflict` with the lane and branch intact**.

What is done (ADR-008 §7's preconditions first): the primary on a branch with HEAD containing every
sibling's work a lane must build on (the loop fixes and 127/01 committed), the loop's own
`wiki/work/<milestone>/` writes accepted as commits under the mesh identity, every other dirty file
left alone; the key set; `aof work loop <NN>` run in the foreground with `loop-diag` on; then, read
at the source — `git worktree list` (two lanes), each lane's `runs/` (a `running` record carrying
`brief.lane` and the loop's `loopRunId`), `aof mesh status --json --declarations` (one row), each
lane's grade on its own record after its drive, the held member's lane base equal to the merged
HEAD, the primary's story `runs/` empty until the merge and holding the same `runId` after it; a
conflict forced by hand-editing a lane-touched file in the primary, the halt named and the lane
intact, then `--resume` after the hand merge; `aof work dispatch --list` clean at the end.

## Tasks

- [ ] `tasks/00_the-live-run-read-at-the-source.feature` — `@manual`: the preconditions met, the key set, the loop driven over a real wave, each SPEC outcome claim read at the source and recorded in this milestone's STATE.md with the observed values; the conflict drill; the loop-diag log's exit line

## Notes

- Runs LAST, after the register is green: a live run over an unproven control is measurement, not
  evidence. The procedure and its readings are the evidence; the STATE.md entry cites run ids, lane
  paths, base shas and the halt's detail, never restates the scenario.
- Deploy per `.claude/rules/build-deploy-restart.md` (`node scripts/install-local.mjs --skip-ui`)
  before the run, and `aof --version` read for the payload build id — the loop that runs must be
  the tree that was built.
