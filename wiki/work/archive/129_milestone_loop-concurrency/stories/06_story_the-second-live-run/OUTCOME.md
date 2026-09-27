# 129/06 · The second live run — Outcome

## Delivered

### `refine_first` is switched on in this repository and drives real waves into lanes
`.aof/aof.config.json` carries `work.loop.concurrency: "refine_first"`, `work.loop.agents.refine.mode: "orchestrated"` and `work.loop.agents.continue.mode: "solo"`, with `work.agents.mode` untouched at `orchestrated`; three live `aof work loop` runs (127 on 2026-09-15 and 2026-09-15/16, 130 on 2026-09-21) drove REFINE → BUILD waves → VERIFY on this control node against real Claude sessions, and the readings of each are in `VERIFICATION.md` `129/06` with their run ids, lane paths, base shas and halt details.

### Two lanes run at once, each with its own record, heartbeat and grade
Measured at the source on 2026-09-21 (`loop-diag.130.2026-09-21T16-42-17-910Z.log`, 615 lines, one loop process pid 58920): `Wave 3 — dispatching 130/03, 130/04 (bound 3).` opened `dispatch-130-03` and `dispatch-130-04` at `a49725a` 156 ms apart, both lanes were on disk 19:21:50 → 20:15:04Z and two sessions drove concurrently 19:29:08 → 20:03:36Z; each lane minted its own run records carrying `brief.lane {worktree, branch, baseCommit}` and the wave run's `brief.loop.loopRunId`, each advanced its own `heartbeatAt`, and one baseline measured once in lane 03 at `a49725a` (5 inherited over 1987) served both lanes' grades.

### A lane's grade is the lane's, and the inherited reds are excluded by the baseline
`Gate work:grade 130/04 — pass, 0 of 1987 case(s) failing (5 inherited, excluded by the baseline).` at 20:14:58Z and the same for 130/03 at 21:07:04Z, each after its own fix cycles in its own worktree; no lane's grade carried another lane's reds, which is the whole-checkout grading defect 129 exists to end.

### Lanes merge home serially through the one verb, and the next member is cut from the merged HEAD
04 merged first (own-writes `8fcd0c4`, then `2f728fa` = merge(`8fcd0c4`, `8088cd9`)), then 03 over the moved primary (`c107b6f`, then `d1e6477` = merge(`c107b6f`, `c55b2f1`)), both `--no-ff` through `advanceBranchToBase`, no conflict, write-disjoint by construction; the next member's lane (130/05) opened at `a56d7da`, whose parent is 03's merge. Every finished lane cleaned up (`removed, branch … removed` ×5).

### The wave run is a record per epoch, and the supervisor sees one loop
Wave run `130` `-0003` carried `brief.wave {members: [130/03, 130/04], baseCommit 46cb366, bound 3}` with a heartbeat to 20:11:49Z, settled `done` at 04's close and re-minted at once as `-0004` `{members: [130/03], baseCommit 2f728fa}` — 129/04's epoch ruling as a record rather than a narrated line. One loop process ran the whole 5.5 hours with no supervisor relaunch.

### The lane child owns its console, so a console-scoped kill never reaches the loop
`runBounded` takes `ownConsole`, and on win32 `spawnLaneDrive` spawns the lane child `detached` with its own hidden console; the 2026-09-21 run survived five lane kills whose stderr shows node-pty's console-list agent failing `AttachConsole failed` against the detached child, where the same mechanism had killed the loop unbracketed twice before (deaths #4 and #5).

### The driver honours the stop it requested, and a provider wait is not silence
A stop the driver itself requested settles with the requested outcome even when the liveness probe sees the dead pid first (a death nobody asked for is still `agent_died`), and a `Usage limit reached · continuing automatically at <time>` / `You've hit your session limit · resets <time>` line read off the output suspends the heartbeat deadline until progress resumes, with `startToCloseMs` still bounding the attempt and one `provider-wait` breadcrumb in the diag log.

### The loop-diag log names the tree that ran
`installLoopDiagnostics` reads `aof --version`'s own string through an injected seam and the `start` line carries `build=<string>`, degrading to `unknown` when the reader throws — the payload was re-stamped mid-run on 2026-09-21 and nothing in the log could say which tree the loop had loaded.

## Assumptions

- **The lane overlap is read off the records and the log, not off a live `git worktree list`** — the lanes' open and cleanup lines bound the window at 53 minutes and the two sessions' drive lines at 34, and FF-12903's fixture leg holds the primary's story `runs/` empty until the merge.
- **A two-member wave is the SPEC's headline; a wave-held third is measured separately** — 130 is a `depends:` chain whose ready set never exceeded the wave, so the hold was read at attempt 2 (`Wave 1 — dispatching 127/03 (bound 3); held: 127/04.`) and the two-member wave at attempt 3; no single target since 127 has partitioned both ways at once.
- **The lane-environment reds are excluded correctly by the baseline** — five arch cases are red at every lane base and green in the primary, so a lane grade can never see one of them regress (`m129/F-66`).

## Gaps

### The forced-conflict drill, performed live
- **Status:** open
- **Discharge condition:** one live `aof work loop` over a two-member wave in which the operator hand-edits and commits, in the primary, a file a lane also changed — the loop halting `lane-merge-conflict` naming lane, branch, base and tip, the primary clean with no `MERGE_HEAD`, the lane's worktree and branch intact with its commit, and `--resume` after a hand merge reconciling it as already merged.
Task 00's fifth scenario was never performed live in three attempts. What holds it meanwhile: `test/loop/loop-command-wave.test.mjs` drives the halt over a real git fixture and asserts the stop id, the producer `dispatch:merge-home:conflict`, the four detail keys, the kept lane and the absent `MERGE_HEAD`; FF-12904 holds that the merge-home path never discards, red-probed at 129/05; and attempt 2 read `--resume` reconciling live lanes three times, the drill's recovery half without its trigger. Accepted at this door as a live-measurement gap, not a behavioural unknown.

### A two-member wave and a held third in ONE run
- **Status:** open
- **Discharge condition:** a milestone whose through-review ready set partitions into two write-disjoint members plus a third held by shared `files:`, driven in one live run.
Both halves are measured, in different runs (see the assumption above). No target existed at this door: 127 is done, 130 is a dependency chain, 131 has no stories, and the standing test-bed's wave is one member with five held.

### The three mid-flight live reads
- **Status:** open
- **Discharge condition:** `git worktree list`, `aof mesh status --json --declarations` and the primary's story `runs/` read while two lanes are in flight.
Read after the fact from the records and the log instead; the declaration row was `rows: []` by the time the door read it, and FF-12903's and FF-12907's fixture legs hold the primary-empty and one-declaration claims structurally.

### `F-15`, a cancel inside the child's startup window
- **Status:** open
- **Discharge condition:** a live run in which a cancel arrives before the lane child has armed its stdin channel, and the drop is either observed or shown not to happen.
Routed here from 129/04 and not exercised in any of the three attempts; `src/commands/drive.mjs` owns the arming order and a change there is a future item if it shows.
