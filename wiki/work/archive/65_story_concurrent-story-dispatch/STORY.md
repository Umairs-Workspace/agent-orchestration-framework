---
type: story
number: 65
slug: concurrent-story-dispatch
title: "Concurrent Story Dispatch"
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 65 · Concurrent Story Dispatch

## User story

As an operator running a milestone unattended,
I want the loop to build independent stories at the same time,
so that a milestone finishes in the time of its longest story rather than the sum of all of them.

## Tasks

- [x] `tasks/00_story-depends-becomes-data.feature` — a story's `depends` names a sibling: it
      resolves, self-refs and cycles are rejected at validate, and it gates `aof work next`
- [x] `tasks/01_next-answers-with-the-ready-set.feature` — `aof work next` answers with every
      currently-ready item, not just the first
- [x] `tasks/02_concurrent-dispatch-into-worktrees.feature` — the ready set is dispatched
      concurrently, each session in its own worktree

## Accept decision

**ACCEPTED 2026-08-15** at `aof:verify 65` — see [VERIFICATION.md](VERIFICATION.md). Every runnable
lane is green (49/49 `@executable`, 3/3 fitness, `aof work validate` PASS scoped and whole-stream, no
new reds in the 996-case fitness lane) and no blocker finding is open. One declared, dischargeable
gap: **F-65-A** — task 02's `@manual` scenario measures the *effect of shipping* this story
(parallelism above 1.00× on real story builds) and so cannot run before it ships. Discharge it by
building milestone 53 with the new prompt and recording `aof work observe 53` in VERIFICATION.md.

## Notes

**The measurement, and where to re-run it.**
`vista-app-web/wiki/work/352_milestone_multi-provider-agent-templates/observability/report.md`
(`aof work observe 352`, generated 2026-08-15 12:17Z) — a **different repo**, running the shipped
bundle. A nine-story milestone (`01`–`09`) whose six `aof-developer` story builds ran at **1.00×
concurrency**: `352/01` 2h11m → `352/02` 2h12m → `352/03` 1h47m → `352/04` 2h48m → `352/05` 1h44m
→ `352/06` 2h15m. A **12h59m** chain whose longest link was **2h48m** — so **10h11m** of a
**25h12m** calendar span was serialisation alone, and a parallel run would have returned it.

**Why it is not a scheduling bug.** `depends` edges are built and validated only
`if (isDriver(item))` — `isDriver` is milestone/uat/spike/chore (`src/work.mjs:339`), and it guards
both the graph build (`:751`) and the resolve check (`:811`). A story's `depends` therefore parses
and is silently ignored. `aof work next` returns on the first not-done story (`src/work.mjs:999`),
so it answers with exactly one item. Nothing in the stream records which stories may safely run at
once, so one-at-a-time is the only *safe* order available. Story independence is authored as
**italic prose** in a milestone `SPEC.md` (`*(depends 00, 01)*`) and in `ARCHITECTURE.md` partition
sections — never as data any command can read.

**What dispatches today.** No code does. The builds in that measurement were spawned by a session
executing `src/bundle/commands/continue.md:59` ("spawn `aof-developer`"), serially. The prompt
names "the parallelism across independent stories" as a reason to prefer orchestrated mode
(`:30`) but is never told what may run at once — because nothing can tell it.

**Isolation is a precondition, not a nicety.** In that same measurement,
`src/sandbox/provisionSandboxAgent.ts` was edited **×9** during the `352/02` build and **×8**
during the `352/05` build (report §Why slow, hot files). Two stories the architect had partitioned
as *independent* both hammered one file. That is the load-bearing fact: a partition's independence
claim is not reliable, so worktree isolation cannot be optional — dispatching those two into one
tree concurrently would have corrupted both. `src/mesh-worktree.mjs` already does worktree-per-item,
branch-per-item, cleanup-on-done and stranded-worktree recovery. It is reachable from exactly two
places, and neither is the local build loop: assignment dispatch
(`src/mesh-worker-execution.mjs:2444`) and the session lane
(`src/mesh-session-spawn-handler.mjs:136-151`, which already resolves a per-item worktree under
`.aof/mesh/session-worktrees/` and already handles the concurrent-`add` race). Wiring, not new
machinery.

**Task 00 is UNBUILT** — the tree is clean at HEAD, there is no stash, and every `depends` in
`test/work-next.test.mjs` (600 lines) is driver-level. It also has a contract to supersede, not
merely a red to turn green: the scenario "a story-level depends edge is not part of the graph"
(`wiki/work/00_milestone_work-cli/stories/01_story_validate-stream/tasks/02_depends-graph.feature:47-51`)
and its executable test (`test/work-validate.test.mjs:796-824`) **pin** story `depends` as
ungraphed. Amending both is part of the task, not a surprise found mid-build. The scenario's real
intent is preserved by splitting the two readers: `next` **ignores** a dep resolving to no sibling
(a typo must never strand a milestone) while `validate` **reports** it.

**Task 01's blast radius is measured, because `next`'s shape is consumed.** Code readers:
`src/commands/next.mjs`, `src/board-ui.mjs:157`, and `src/work-read.mjs:325` — whose
`nextWorkCacheFirst` stamps cache attribution only `if (typeof result?.ref === "string")`
(`:330`), so a set-shaped answer would silently lose `answeredFrom`/`reportedBy`. Frozen contract
tests: `test/command-core-contract.test.mjs:606` and `test/board-face-contract.test.mjs:335,390`.
Plus eleven `src/bundle/commands/*.md` prompts naming `aof work next`. The ready set must be
**additive** — the existing single-item keys stay exactly where they are.

**This depends on nothing.** The concurrency belongs in *what the CLI answers*, not in *who asks* —
so any dispatcher reads the same ready set: the prompt loop that exists today, and any code-owned
loop that may exist later. The problem is measured in a repo running the shipped bundle, and is
paid on every milestone until this lands.

**Out of scope.**
- **The mesh item-lock grain.** `executionScopeRef` collapses a story to its milestone
  (`src/assignment-record.mjs:216`), so two stories of one milestone share a lock scope. Verified
  not to bite a local run: `readHeldScopes` returns empty with no active assignment, so
  `inspectItemLock` finds no holder and the mint door is open. It becomes real only when the
  concurrent stories are cross-node assignments.
- **The stall/close-out watchdog.** The same measurement records **6h06m** of dead air (24% of the
  span) with agents idle after reporting. A separate concern, deliberately not folded in.
