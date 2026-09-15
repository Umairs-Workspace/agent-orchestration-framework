---
type: milestone
number: 129
slug: loop-concurrency
title: "Loop concurrency — aof work loop drives write-disjoint story waves in worktree lanes"
status: in-progress
owner: product-owner
created: 2026-09-12
updated: 2026-09-14
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 129 · Loop concurrency — `aof work loop` drives write-disjoint story waves in worktree lanes

## Objective

**The loop shell drives ONE act per tick, in ONE checkout, and stories that could run together
run serially.** `aof work loop <NN>` asks `work:next`, takes the head of the answer, spawns one
interactive Claude session in the primary checkout, waits, settles, and asks again. The
concurrency it never reads already exists one layer down: `aof work next <NN> --json` partitions
the ready set by declared `files:` into a write-disjoint `wave` and a `heldSet`
(`src/ready-wave.mjs`); the milestone-level `/aof:continue <NN>` orchestrator fans that wave out
into per-story worktrees through `aof work dispatch` (71/ADR-006, "execution mode is read off the
wave"); and the mesh worker runs every assignment in a dedicated worktree.

Milestone 127 is the live test run of the loop, and its state notes are the measurement. On
2026-09-12 the loop was fixed for four defects in one day — the agent's `run-complete` settling
the shell's run, the settle race, the silent launcher death, and the whole-tree grading deadlock —
and every one of them was a form of the same fact: **the unit of concurrency is a WORKTREE, not a
story.** Two sessions in one checkout trample each other; a story's grade taken over the shared
checkout carries every other lane's reds (127/01 stalled six rounds on seven cases, six of them
not its own); a run's progress sampler charges the whole tree to one run.

Measured on 2026-09-12 at `2321dce8` plus the uncommitted loop fixes:

| fact | value | source |
|---|---|---|
| 127's ready set / wave / held | `readySet: [02, 03, 04]`, `wave: [02, 04]`, `heldSet: [03]` — 03 shares `command-core.mjs`, `cli.mjs`, `test/work/stream/index.mjs` with 02 | `aof work next 127 --json` |
| acts the loop shell drives per tick | 1 — `nextDecision` → `decideLoop` → `drivePhase` → `settleDriven`, in `for (;;)` | `src/commands/loop.mjs:1583-1840` |
| where a driven session runs | the primary checkout — `worktreeCwd: ctx.workspace.projectRoot` | `src/commands/drive.mjs:314` |
| the dispatch bound this repo reports | `bound: 3` (`DEFAULT_DISPATCH_CONCURRENCY`; `work.dispatch.concurrency` unset), `lanes: []` | `aof work dispatch --list --json` |
| the lane's path and branch | `.aof/mesh/dispatch-worktrees/dispatch-<ref>` on `aof/mesh/<ref>`, create-or-continue | `src/mesh/worktree.mjs:229-291` |
| who merges a lane back today | the `/aof:continue` orchestrator, by prose — "when a lane's work is merged back, `aof work dispatch --cleanup`"; no code path merges | `src/bundle/commands/continue.md:166` |
| the mesh's only merge verb | `advanceBranchToBase` — ff-if-possible, real merge otherwise, dirty-tree and conflict are coded refusals, never rebase/force | `src/mesh/worktree.mjs:766-894` |
| the grade's tree | `work:grade --run` spawns the rubric in `ctx.workspace.projectRoot`; the delta baseline (`brief.gradeBaseline`) is per story on that one tree | `src/commands/loop.mjs:1726-1748`, `1955` |
| a graded rubric run here | ~8 min (the fitness tier, 1931 cases) | 127 STATE, 2026-09-12 |
| `LoopState` keys / `brief.loop` keys | ten / nine, both pinned order-included; `driven` rows are the one additive place | `test/arch/loop/acd-loop-probe-contract`, `acd-loop-state-rides-the-run-record` |
| the run id a session runs as | `AOF_RUN_ID` + `AOF_RUN_ITEM_DIR` in the PTY env; `run-start`/`run-complete` yield to it (`resolveDrivenRun`) | `src/agent-session-driver.mjs:862`, `src/commands/resolve.mjs:91-124` |
| the supervisor's unit | one declaration per `brief.loop.scope`, relaunched as `aof work loop <scope> --resume` | `src/work/loop.mjs:1322`, `src/mesh/declarations.mjs` |
| `src/` root / `src/commands/` headroom | 92/92, 67/67 — both at ceiling; the row already asks for a `src/loop/` family | `test/arch/testing/acd-source-directory-budget.test.mjs:102-113` |
| loop deaths on 2026-09-12 | 3, all at the driver's kill of a finished session, in the loop's own process | `src/loop-diag.mjs` header, 127 STATE |

**The outcome an outsider can verify:** with `work.loop.concurrency` set, `aof work loop 127`
drives 02 and 04 at the same time, each in its own worktree lane, each with its own run record,
heartbeat and grade; 03 starts when 02's lane has landed; the loop's account names every lane;
and a lane that cannot be merged home is a named stop, never a half-merged tree.

## Scope

In scope:

- **A concurrency mode on the loop**, `work.loop.concurrency` — `"sequential"` (today, the
  default: byte-identical behaviour when unset) and `"refine_first"` (refine every story in the
  range first, then build the ready waves concurrently). Whether an interleaved-concurrent mode is
  wanted too is a decision the ARCHITECTURE takes and records — 02's build informing 03's refine
  is the argument for interleaving; contract lock-in is the argument for refine-first.
- **Under `refine_first`, execution follows `work.agents.mode`:**
  - `orchestrated` — the loop drives `/aof:continue <NN>` (the milestone) and Claude's orchestrator
    dispatches the wave. The smallest change: one branch in `decideLoopPhase` plus the act's
    ref/phase; the grade/gate ladder then runs per milestone, not per story — and what the
    baseline/delta grade means at that grain is decided, not left.
  - `solo` — the loop itself spawns one driver per wave member (`/aof:continue <NN>/<SS>`), each in
    its own dispatch worktree. This is the real work.
- **The six questions the ARCHITECTURE answers, in this order, each biting harder than the last:**
  1. **Merge-back.** N lanes → N branches: who merges, in what order, what a held story (03) is
     based on once 02 has moved, and a conflict is a halt with a named stop id. Dispatch already
     has the shape on the mesh (`advanceBranchToBase`, `recover-push`) — reuse, never re-derive.
  2. **Grading per lane.** The baseline/delta rule is per story on one tree; per worktree it
     becomes "inherited = red at the lane's base commit". Rubric cost × N lanes.
  3. **Run records, settle and the supervisor per lane.** `AOF_RUN_ID` per session, heartbeat per
     run, `settleDriven` per lane, `LoopState.driven` rows per lane — the ten-key `LoopState` and
     the driven-row shape are pinned; additive only.
  4. **Process model.** N PTY drivers in one loop process, or N child `aof work drive` processes
     — the child isolates the loop from the kill-time death observed three times on 2026-09-12.
     Child processes are the preference; the drive command then takes the lent run id as a
     flag/env rather than `ctx.loopDrive`.
  5. **A bound** on concurrent lanes, honouring the one `aof work dispatch --list --json` already
     reports — never a second number.
  6. **The supervisor** (desktop `reconcile`, `src/mesh/declarations.mjs`) sees one declaration
     per scope — lanes are children of that declaration or their own; decided.
- **The stories are themselves write-disjoint**, so this milestone can be the second live run of
  the thing it builds.

Out of scope:

- **Cross-machine lanes.** A lane is a local worktree on the control node; dispatching a wave
  member to a mesh worker is the mesh's assignment path and is not changed here.
- **Changing the wave partition.** `src/ready-wave.mjs` and `work:next` own the wave; this
  milestone READS it (71/ADR-006's rule) and never recomputes or widens it.
- **The review lanes' own concurrency** — 71/ADR-006 already spawns the review lenses together
  inside one story's session; unchanged.
- **A second dispatch worktree convention.** Lanes live where `aof work dispatch` puts them,
  on the branch it names; no new root, no new branch grammar.
- **Rewriting `.feature` files of any shipped story.** Tests may change; delivered contracts do
  not.
- **The `src/loop/` family move of `loop-argv`, `loop-bounds`, `loop-record`, `loop-progress`.**
  Named by the budget table as its own item; new modules here land in `src/loop/`, and re-pointing
  the four existing leaves is not smuggled in.

## Stories

Six stories; 01/02/03 share no subject file and form the first wave at the dispatch bound of 3;
04 → 05 → 06 are ordered by `depends:`. Partition and coupling in ARCHITECTURE.md § Proposed partition.

- [x] `01_story_the-mode-and-the-engine-decide` — `work.loop.concurrency` resolves once as a mode; the engine routes on status, names the three phases of `refine_first`, decides a wave purely, and carries the three lane stop ids
- [x] `02_story_the-drive-is-a-child` — `aof work drive` takes a lent run and a fix file, stdin is its cancel channel, `runBounded` aborts, and `src/loop/child-drive.mjs` spawns it shell-lessly and reads one document
- [x] `03_story_the-lane-commits-and-merges-home` — `commitWorktreeChanges` moves to its git home, `advanceBranchToBase` gains `dirtyPolicy`, dispatch composes commit / merge-home / base, STATE.md merges by union
- [x] `04_story_the-wave-tick` — the BUILD phase fans the wave into lanes: mint in the lane, child drive, settle, grade and gate in the lane, commit, merge, cleanup; the wave run carries the liveness; resume reconciles; the ladder is a subtraction from the shell
- [x] `05_story_the-account-and-the-register` — the seven controls land under `test/arch/loop/` and go red on contact, the never-discards sweep reaches the lane verbs, the autonomous prompt names the key
- [x] `07_story_the-loop-settings-are-self-contained` — `work.loop.dispatch.concurrency` and `work.loop.agents.<phase>.mode` join the bounds home beside the mode, each falling back to its workspace twin; the lane bound narrows through `work:dispatch`, the phase drive carries `--solo` / `--orchestrated`
- [ ] `06_story_the-second-live-run` — `refine_first` switched on here and one real `aof work loop` driven over a two-member wave with a held third, every SPEC outcome read at the source (`@manual`)

## Dependencies

- **127 (in progress)** — the live test run whose state notes are this milestone's measurement,
  and the range the outcome is verified on. 129 does not depend on 127 closing; it depends on the
  2026-09-12 loop fixes (`resolveDrivenRun`, `settleDriven`'s conflict narration,
  `withLauncherOrigin`, `loop-diag`, the grade baseline) being in the tree, which they are.
- **65 (done)** — `aof work dispatch`: the lane's path, branch, bound, admission lock, sweep and
  cleanup. Reused as-is.
- **71/ADR-006 (done)** — execution mode is read off the wave; `decideExecutionMode` in
  `src/work/loop.mjs`.
- **m43/ADR-008 (done)** — gate-time propagation: `advanceBranchToBase` is the one merge verb and
  its never-discard fitness function `acd-gate-propagation-never-discards`.
- **69 (done)** — the loop bounds' single home and the range probe every new `work.loop.*` key
  must join.
