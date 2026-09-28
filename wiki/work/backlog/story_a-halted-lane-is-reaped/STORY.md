---
type: story
number:
slug: a-halted-lane-is-reaped
title: "A halted loop's lane is reaped once its item is finished another way — no dispatch worktree or lane branch outlives the work it was opened for"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
---
# A halted loop's lane is reaped once its item is finished another way

## User story

As **the operator who runs `aof work loop` and sometimes finishes a halted item by hand**,
I want **a lane the loop kept for `--resume` to be noticed and cleaned up once its item is done
without that resume**,
so that **no dispatch worktree or `aof/mesh/*` branch sits in my repository for days. An orphan
lane holds an uncommitted record of a run that went nowhere, and branches that look like live work.
Clearing it by hand means reconstructing from logs what the lane was, and that is how real work
gets deleted along with the stale.**

## Tasks

## Notes

- **Measured instance** (`~/.aof/mesh/logs/loop-diag.130.2026-09-21T16-42-17-910Z.log`):
  - On 2026-09-21 at 21:53, loop 130's wave 5 opened lane 130/06 (`dispatch-130-06`, branch
    `aof/mesh/130-06` at `d90568d`).
  - At 22:14 the loop halted with `session-needs-input at 130/06` ("Resume with:
    `aof work loop 130 --resume`"). It was never resumed.
  - 130/06 was finished outside the loop on 2026-09-23, and 130 reached `main` in the PR #1 squash
    (`28bbce2`).
  - The worktree, with a 265-line uncommitted lane `STATE.md` diff, and the branch, with 63 lane and
    merge commits, stayed until they were removed by hand on 2026-09-27.
- **What is right today and must stay:** a halted lane is KEPT, because `--resume` needs it. The
  gap is only that nothing notices when the item is later `done` (or archived) by another path, or
  when the halt is abandoned.
- **For refine to decide:**
  - Where the reap lives: a doctor finding, the loop reaping on its next start, or
    `aof work archive` reaping the archived item's lanes.
  - What a dirty lane's uncommitted state becomes: refused, preserved, or discarded with a record.
- **Safety:** a reap must never follow a link out of the lane. Each prepared lane carries a
  `node_modules/@aof/ui` junction (see `scripts/prepare-worktree.mjs` on why nothing is linked in);
  unlink it before `git worktree remove`.
- **Lane code:** `src/mesh/worktree.mjs`.
