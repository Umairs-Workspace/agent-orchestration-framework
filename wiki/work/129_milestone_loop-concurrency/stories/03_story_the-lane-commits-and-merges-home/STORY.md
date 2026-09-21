---
type: story
number: 03
slug: the-lane-commits-and-merges-home
title: "The lane commits and merges home — commitWorktreeChanges moves to its git home, advanceBranchToBase gains a dirty policy, and dispatch.mjs composes commit, merge-home and base"
parent: 129
depends: []
status: done
owner: product-owner
created: 2026-09-12
updated: 2026-09-22
adrs: [ADR-002, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-002
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/43_milestone_mesh-artifact-authority/ARCHITECTURE.md#ADR-008
  - wiki/work/TECH_DEBT.md
  - src/mesh/worktree.mjs
  - src/mesh/worker-execution.mjs
  - src/work/dispatch.mjs
  - src/commands/dispatch.mjs
  - src/mesh/recovery-push.mjs
  - .gitattributes
  - test/mesh/worker/mesh-worker-commit-diff.test.mjs
  - test/grade/gate-propagation-refusals-leave-branch.test.mjs
  - test/grade/gate-propagation-reuse-door-advance.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/loop/lane-is-local-slot.test.mjs
  - test/support/dispatch-lane-fixture.mjs
  - test/arch/grade/acd-gate-propagation-never-discards.test.mjs
  - test/arch/assignment/acd-worktree-never-linked.test.mjs
  - test/arch/bundle/acd-runs-eol-pinned.test.mjs
  - test/arch/session/acd-session-driver-single-home.test.mjs
files:
  - src/mesh/worktree.mjs
  - src/mesh/worker-execution.mjs
  - src/work/dispatch.mjs
  - .gitattributes
  - test/mesh/worker/mesh-worker-commit-diff.test.mjs
  - test/grade/gate-propagation-refusals-leave-branch.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/arch/session/acd-session-driver-single-home.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The lane commits and merges home

## User story

As **the loop that must land N lane branches on one primary without ever losing a commit**,
I want **the lane's git verbs to live in their existing homes — `commitWorktreeChanges` moved into
`src/mesh/worktree.mjs` and re-exported, `advanceBranchToBase` answering a `dirtyPolicy` of
`"strict"` (today) or `"touched-paths"`, and `src/work/dispatch.mjs` composing `commitDispatchLane`,
`mergeDispatchLaneHome` and `dispatchLaneBase` over them — with STATE.md declared `merge=union`**,
so that **merge-home is the mesh's one merge discipline pointed the other way (ff when possible, a
real merge otherwise, conflict aborted and NAMED, dirt refused by file, never a rebase, force or
reset), a held story is cut from the merged HEAD, and two lanes' feedback appends do not halt the
wave**.

What lands (ADR-002, ADR-008 §4): the move (absent definition in `worker-execution.mjs`, present
re-export; `options.exec ?? options.pushExec`; both worker call sites keep their lines — TECH_DEBT
item 83 seam 3, one verb); `dirtyPolicy` on `advanceBranchToBase` (`"strict"` default, byte-identical
to the mesh; `"touched-paths"` = `git diff --name-only HEAD <tip>` ∩ porcelain paths must be empty,
else a RETURNED refusal naming them); `mergeDispatchLaneHome(primaryRoot, ref, { message, node,
exec })` — on-a-branch precondition, the loop's own writes committed first (`git add -- <milestone
dir>` + `commit --no-verify` under the mesh identity), then the verb from the primary at the lane's
tip, its outcomes `already-current` / `fast-forwarded` / `merged` / `refused` (code
`lane-merge-refused`, files) / `conflict` (aborted, code `lane-merge-conflict`, lane + branch +
base + tip); `commitDispatchLane(lanePath)`; `dispatchLaneBase(lanePath)`; a lane reopened on an
existing branch advanced to HEAD first (`lane-open-failed` on conflict); one `.gitattributes` line.

## Tasks

- [x] `tasks/00_commit-worktree-changes-moves-home.feature` — `commitWorktreeChanges` defined once in `worktree.mjs` (gaining a `paths` scope), `resolveRefInWorktree` defined once in `src/work/dispatch.mjs`, both re-exported from `worker-execution.mjs`, every worker call site unchanged, `exec ?? pushExec` honoured
- [x] `tasks/01_advance-branch-gains-a-dirty-policy.feature` — `strict` is today's door 2 byte-for-byte; `touched-paths` refuses only when a touched path is dirty and names the files; the tree is untouched either way
- [x] `tasks/02_the-lane-merges-home.feature` — `mergeDispatchLaneHome`: own writes committed scoped to the milestone dir; ff / merge / already-current; conflict aborted and named with the lane intact; detached HEAD refused; `commitDispatchLane` and `dispatchLaneBase`; reopen-advances-to-HEAD
- [x] `tasks/03_state-md-merges-by-union.feature` — two lanes appending to one STATE.md merge clean; a TECH_DEBT.md or VERIFICATION.md collision still conflicts; the attribute pins neither `text` nor `eol`

## Notes

- Routed here by 04's feasibility (2026-09-13): `resolveRefInWorktree` lives in the driver-importing
  god-node, and `src/loop/wave.mjs` importing it would drag the PTY driver into the loop family
  (ADR-005 §5). It moves to `src/work/dispatch.mjs` — the lane's home — NOT to `worktree.mjs`,
  whose import closure is inside the driver's mesh-blind reach (71 modules, pinned) and must gain no
  `work.mjs` edge. And ADR-002 §2's path-scoped primary commit needs one home: `commitWorktreeChanges`
  gains an additive `paths` option (`git add -- <paths>` instead of `-A`; absent = today), used by
  `mergeDispatchLaneHome` step 2 and by the loop's REFINE-end commit.

- Feasibility (2026-09-13, measured on a throwaway repo): the touched-paths set is the THREE-DOT diff
  `HEAD...<tip>` (merge-base to tip) — the two-dot form lists paths only the primary changed and
  manufactures refusals git itself would not raise; a rename contributes BOTH its paths; `advanceTo`
  is resolved in the PRIMARY before the verb sees it, and the advance runs whenever `advanceTo` is
  given (a fresh cut answers `already-current`); `defaultGitExec` must forward `env` or the moved
  verb loses `GIT_TERMINAL_PROMPT=0`. `acd-session-driver-single-home`'s `SINK_CEILING` (1957) is
  a no-headroom ratchet on `worker-execution.mjs` — the move lowers it, so the control is in the
  write set.

- No new git verb exists anywhere after this story; FF-12904 (05) extends the never-discards sweep
  over `dispatch.mjs`. The `merge` word appearing in `dispatch.mjs` ARMS that control's `--abort`
  leg — every `merge` there sits beside its abort.
- Shares no subject file with 01 or 02.
