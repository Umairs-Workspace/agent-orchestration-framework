---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 129 · Loop concurrency — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. -->

- [x] `01_story_the-mode-and-the-engine-decide` — done (built + reviewed 2026-09-13; accepted 2026-09-13 by `aof:verify 129/01` — `VERIFICATION.md` `129/01`, `F-01`–`F-12`; `F-07`/`F-08` routed to 04, `F-09` waits on the milestone door)
- [x] `02_story_the-drive-is-a-child` — done (built + reviewed 2026-09-13 under the cascade; accepted 2026-09-13 by `aof:verify 129/02` — `VERIFICATION.md` `129/02`, `F-13`–`F-27`; `F-15`/`F-16` routed to 04, `F-17`/`F-23` to 05, `F-24`/`F-25` face + runner items)
- [x] `03_story_the-lane-commits-and-merges-home` — done (built + reviewed 2026-09-13 under the cascade; three lenses + one delta round, 1 Blocker → 0; accepted 2026-09-13 by `aof:verify 129/03` — `VERIFICATION.md` `129/03`, `F-28`–`F-47`; `F-39`/`F-44` routed to 04, `F-47` an `aof test` item, `F-09` corrected)
- [x] `04_story_the-wave-tick` — done (built + reviewed 2026-09-14, solo, resumed run `20260914T123830334Z-0001`; three lenses, one round, 0 Blockers; accepted 2026-09-14 by `aof:verify 129/04` — `VERIFICATION.md` `129/04`, `F-48`–`F-50`; `F-07`/`F-08`/`F-16`/`F-18`/`F-44` closed, `F-15` re-routed to 06, `F-39` to 05, `F-08`'s operational rule LIFTED, 03's composed-verbs gap discharged)
- [x] `05_story_the-account-and-the-register` — done (built + reviewed 2026-09-14, solo, run `20260914T183538595Z-0000`; three lenses inline, 0 Blockers; accepted 2026-09-14 by `aof:verify 129/05` — `VERIFICATION.md` `129/05`, `F-51`–`F-54`; the seven register rows green with every probe re-observed; `F-17`/`F-23`/`F-39` closed, `F-51` fixed, `F-53` an operator item)
- [x] `07_story_the-loop-settings-are-self-contained` — done (scoped 2026-09-15 from the operator's sign-off finding `F-55`; built + reviewed solo, three lenses inline, 0 Blockers; accepted 2026-09-15 by `aof:verify` — `VERIFICATION.md` `129/07`, `F-55`–`F-57`; four standing controls re-pointed and red-probed)
- [ ] `06_story_the-second-live-run` — in-review (built 2026-09-14; attempts 1–2 on 127 (2026-09-15/16) drove one-member waves, read at the 2026-09-17 door — `VERIFICATION.md` `129/06`, `F-58`–`F-64`; attempt 3 on 130 (2026-09-21) measured the two-lane wave and its serial merges, read at the 2026-09-22 door — `F-65`–`F-68`; HELD pending the operator's ruling on the unperformed conflict drill — `VERIFICATION.md` `## Accept decision`)

## Notes & decisions in flight

- **06's accept is the operator's ruling (door, 2026-09-22).** Three live runs measured the SPEC's
  headline; the forced-conflict drill's live half never ran (fixture-held, FF-12904, its `--resume`
  half read at attempt 2). Accept on the readings with the drill an open `OUTCOME.md` gap, or hold
  for a fourth run — `VERIFICATION.md` `## Accept decision` states both; the milestone door waits.
  The regression gate ran five times at this door on a detached worktree (`REGRESSION.md`): 130/02's
  two whole-tree reds repaired at the owner (`F-69`); the launcher's `GIT_ASKPASS=""` (`F-71`) and the
  :4182 binder that had killed every run before its integration and cargo lanes (`F-72`, re-homed at
  `1f5317c`); then 127/05's tree-shape suite over the tree 127's accept left — link ratchet and backlog
  stub repaired at their owners (`F-73`, `F-74`), and 127 itself `done` at the root (`F-75`), which only
  `aof work archive 127` clears. `done` is refused by `regression-gate-red` until a sixth row is green.

- **The configuration surface, decided with the operator (2026-09-15).** At the 05 accept the
  operator held the milestone door: "don't sign off this milestone until I sign off the
  configuration surface (how to configure concurrency, defaults, etc)", and then named the shape —
  the loop's settings SELF-CONTAINED under `work.loop`: `dispatch: {}` mirroring `work.dispatch`,
  `agents: { refine: { mode }, continue: { mode } }` with refine and continue INDEPENDENT, and
  each falling back to the workspace's `work.dispatch` / `work.agents` when undefined. The plan
  (three keys in the bounds home answering `null` when unset; a lane bound that can only NARROW
  the pool's through `work:dispatch { bound }`; the phase drive composing `--solo` /
  `--orchestrated`, the latter joining `refine.md` / `continue.md` as `--solo`'s twin; a new
  story `129/07` with 06 re-pointed to depend on it) was approved by the operator ("Looks good")
  and is the ADR-001 §5 / ADR-006 amendments. Two things were flagged and left as separate
  decisions, not taken: a warning on a mis-spelled value (the silent fallback is ADR-001 §1's
  design) and operator-facing documentation of `work.loop.*` / `work.dispatch.*` (README, `docs/`
  and the schema have none; the agent-facing prose in `autonomous.md` and the ADRs is all there is).
- **PO ratification of ADR-001 §5 (refine, 2026-09-12).** The SPEC proposed that under
  `refine_first` execution follows `work.agents.mode` — `orchestrated` driving the milestone-level
  `/aof:continue <NN>` and `solo` driving a lane per member. The architect departed: the loop ALWAYS
  fans the wave into lanes, and `work.agents.mode` governs only what a lane's story session spawns.
  RATIFIED, on the three measured reasons the ADR records: the orchestrated path would be a second,
  prose-only home for fan-out and merge-back (the SPEC's own table says it merges by prose); a
  primary-tree grade leaks the operator's concurrent edits at any grain (130 dirty files today, six
  of seven reds foreign in 127/01); and this repo IS `orchestrated`, so the SPEC's verifiable
  outcome — 02 and 04 in lanes with their own grades — would have been unreachable here without
  flipping every story session to solo. Reversible: an orchestrated-milestone drive can be added
  later as an additive mode value; nothing shipped forbids it. The SPEC's scope sentence stands as
  the proposal it was; ADR-001 §5 is the decision.
- **Default decisions taken at refine (autonomous):** interleaved concurrency deferred (ADR-001 §6);
  `src/loop/` born as an exemption, not a budget row (ADR-008 §2); merge precondition is
  touched-paths for the loop and strict for the mesh (ADR-002 §1); STATE.md alone is `merge=union`
  (ADR-002 §5); no new failure reason — a child that dies is `runtime_offline` (ADR-004 §4);
  `test/loop/` is at its ceiling (72/72) so 01 extends existing suites and 04 raises the row for
  its two; `test/support/` is at its ceiling so 04's fixture is born in `test/support/loop/`.
- **Cross-milestone write collisions the wave cannot see:** 127/02 and 127/03 (in flight in this
  tree) declare `src/bundle/manifest.json`, which 129/05 also regenerates; the wave partition is
  per milestone, so this is sequenced by hand — 129/05 runs after 127 lands. `aof work debt` is
  broken in this tree by 127/02's in-flight `insert-shared.mjs` change (recorded in
  ARCHITECTURE.md § Codebase health; 127's to close).
- **Contract beat rulings (Three Amigos, 2026-09-13) — amendments ratified where they were raised,
  in each story's `.feature` prose under a RULINGS paragraph; no ADR was edited.** Where an ADR
  sentence is imprecise the contract wins and the sentence is named here: ADR-001 §1 "reads
  `unknown`" → a declared bound with `bound: null`; ADR-002 §1's two-dot diff → three-dot
  `HEAD...<tip>`, renames contribute both paths, and EVERY staged index entry refuses under
  `touched-paths` (a real merge refuses any staged entry; measured); ADR-002 §7 → the reopen advance
  runs whenever `advanceTo` (a sha resolved in the primary) is given; ADR-004 §1's
  `resolveRefInWorktree` moves to `src/work/dispatch.mjs` (03), never `worktree.mjs`, so the loop
  family never imports the driver-carrying god-node; ADR-005 §3's "`.logs` sibling" → the fix file is
  `<meshRoot>/loop-fixes/<runId>.json`; ADR-005's `onPtyLive` → the driver gains an additive
  `signal` option (02 owns `src/agent-session-driver.mjs`); ADR-007 §2's one wave run per wave → one
  per EPOCH, re-minted after every merge so the supervisor's latest-run read never hides a live loop;
  ADR-003 §4's "recorded grade" → a merged lane's clean delta is recorded as the last progress
  sample on its continue run (no post-mint store write exists; `run-store.mjs` is byte-pinned);
  ADR-008's "54 → 58" → "+4 from HEAD's value when 05 lands"; FF-6903's "no periodic self-ping" →
  the wave interval is a ratified departure, the control's scan extended to admit it by name. Write
  sets grew by the standing controls each story reds (six `LOOP_STOPS` literal pins for 01; the
  `SPAWN_OUTCOMES` pin and the driver for 02; the `SINK_CEILING` ratchet for 03; four shell-text
  pins for 04; the shell-out prompt's key set for 05) — the first wave is still 01/02/03, verified
  through `aof work next 129 --through-review`.
- **Open for the build, not for refine:** 04's family net is +750–900 lines while the shell loses
  300–900 — the review reads the shell (ADR-008 §3) and the family, both; 127/01's private copy of the
  enclosing-function rule (`acd-number-null-safe`, untracked in this tree) folds onto
  `source-slice.mjs`'s generic once 127 lands.
- **Framed 2026-09-12** from the 127 live run's measurement: four loop fixes in one day, all
  forms of "the unit of concurrency is a worktree, not a story". The SPEC carries the measured
  table and the six ordered questions the ARCHITECTURE must answer; nothing is decided here.

## Feedback (for retro)

<!-- Raw, attributed entries; triaged into VERIFICATION.md / RETROSPECTIVE.md at aof:verify. -->

- **129/06 live run, attempt 3 (operator, 2026-09-21 16:42Z → 22:14Z, `aof work loop 130`, ONE
  loop process pid 58920, `supervised: false`; `loop-diag.130.2026-09-21T16-42-17-910Z.log`, 615
  lines — a `--resume` probe at 16:39Z answered "Nothing to resume" and exited 0).** READ AT THE
  SOURCE 2026-09-21 22:50–23:10Z by `aof:continue 129/06 --solo` (run
  `20260921T224926900Z-0001`): the log, the lane and wave records now in the primary, the commit
  graph, `dispatch --list`, `mesh status --declarations`, `BUILD_ID.json`. **The SPEC's headline,
  measured:** `Wave 3 — dispatching 130/03, 130/04 (bound 3).` at 19:21:49Z — two lanes cut at
  `a49725a` (`dispatch-130-03` on `aof/mesh/130-03`, `dispatch-130-04` on `aof/mesh/130-04`, both
  `created`), open together 19:21:50 → 20:15:04Z (04's cleanup), two sessions driving at once
  19:29:08 → 20:03:36Z (`d0e62f96…` in 04, `70c0a51f…` in 03). Wave run `130` `-0003`
  `brief.wave {members: [130/03, 130/04], baseCommit 46cb366, bound 3}`, heartbeat to 20:11:49Z,
  settled `done` at 04's close and RE-MINTED at once as `-0004` `{members: [130/03], baseCommit
  2f728fa}` (129/04's epoch ruling — a record, never a narrated line), heartbeat to 21:06:49Z.
  Lane records: 04 `20260921T192150185Z-0000` + `-0001`; 03 `…192908505Z-0000` / `-0001` /
  `-0002` — every one carrying `brief.lane {worktree, branch, baseCommit a49725a}` and
  `brief.loop.loopRunId 7661348f-073d-4884-8544-a63efb9e53ac` = the wave run's; `heartbeatAt`
  advanced through each drive (04 → 19:56:39Z, 03 → 20:30:14Z; the `.heartbeats.ndjson` queues
  consumed, none on disk). Baseline measured ONCE at `a49725a` in lane 03 (19:21:50 → 19:29:08Z,
  5 inherited over 1987) while 04's session already drove; both grades cite it — 04 `fail 1`
  (item-24, its own) → `pass, 0 of 1987 (5 inherited, excluded)`; 03 `fail 2` (FF-11902, FF-5810)
  → `fail 2` (ADR-002 manifest hash, FF-12405) → `pass, 0 of 1987` after the operator committed
  `02f9d7c` INSIDE lane 03 (21:01Z: the re-rendered loop record + lock). Merges serial, in
  completion order, through the one verb: 04 first — own-writes commit `8fcd0c4`, then `2f728fa` =
  merge(`8fcd0c4`, `8088cd9`), a real `--no-ff`; then 03 over the MOVED primary — `c107b6f`, then
  `d1e6477` = merge(`c107b6f`, `c55b2f1`), no conflict, write-disjoint by construction. Every
  lane cleaned up (`removed, branch … removed` ×5 — F-62 did not recur). The next member cut from
  the merged HEAD: 05's lane at `a56d7da`, parent `d1e6477` = 03's merge (dependency-held,
  `depends: [2, 3, 4]`). `readRuns` on the primary's 130/03 and 130/04 answers the lanes' ids.
  The loop survived FIVE lane kills — each lane's stderr shows node-pty's console-list agent
  failing `AttachConsole failed` against the detached child (task 02's `ownConsole`, measured
  live) — and ended in a NAMED exit: `halted on session-needs-input at 130/06 … drained=[01, 02,
  04, 03, 05 merged]`, `beforeExit code=0`, `exit code=0`. One loop process the whole run, no
  supervisor relaunch (F-61 did not recur; declarations `rows: []` now). **Still not measured:**
  `held: <C>` — 130 is a `depends:` chain, the ready set never exceeded the wave (127's attempt 2
  measured the hold, one-member); `git worktree list` / `mesh status` / the primary's empty
  `runs/` MID-flight — not read live (FF-12903's fixture leg holds it; the records above prove
  the overlap); the forced-conflict drill — not performed (the operator's `02f9d7c` went INTO the
  lane, not the primary); `dispatch --list` clean at the end — the halt is at a lane, so 130/06's
  lane is live BY DESIGN for `--resume`, not the verify-gate case the clause names. **Gaps
  found:** loop-diag's `start` line carries no build stamp, so which tree ran (`~/.aof/bin/aof.exe`
  payload vs the npm-linked worktree at `/c/Program Files/nodejs/aof`) is unreadable after the
  fact — and the payload was re-stamped `d90568d+dirty.20260921T230514` at 22:05Z, MID-RUN,
  during 130/06's lane; five arch cases (FF-5405 ×2, FF-5409, FF-12903, FF-12907) are red at
  EVERY lane base and green in the primary — lane-environment reds the baseline excludes
  correctly, and a lane grade can therefore never see them regress; the own-writes commit before
  a merge carries the merge's message (`8fcd0c4` "merge 130/04 home" has one parent).
  **Routed at 06's review close (2026-09-21, three lenses inline, one round, 0 Blockers):** the
  build-stamp gap → `fixed` (`src/loop-diag.mjs` start line gains `build=<aof --version string>`,
  degrading to `unknown`; `test/loop/loop-diag.test.mjs`; payload `d90568d+dirty.20260922T000441`);
  the five lane-environment reds → `story (operator)`: diagnose why they are red in every lane and
  green in the primary, then either run them green in a lane or have the baseline NAME an
  environment-red apart from an inherited-red; the own-writes commit message → `recorded`.
- **129/06 live run, attempt 2 (operator, 2026-09-15 15:59Z → 2026-09-16 13:52Z, `aof work loop
  127 --resume`, five loop processes; payload `7827f9d+dirty.20260915T110622` then
  `f55fa71+dirty.20260916T144743` for the last).** READ AT THE SOURCE at the `aof:verify 129`
  door (2026-09-17): the five `loop-diag.127.*` logs, the lane and wave run records now in the
  primary, the commit graph. **What ran:** three lanes, one per wave, serially — `Wave 1 —
  dispatching 127/03 (bound 3); held: 127/04.` (03's refine gave it 04's files), then `Wave 2 —
  dispatching 127/04`, then `Wave 1 — dispatching 127/05` the next morning. Each lane: open at
  the wave commit (03 `4c2864d`, 04 `d7806cb`, 05 `ba25547`), baseline grade measured IN THE LANE
  at its base (19 / 20 / 21 inherited over 1981–1987 cases), mint (`20260915T160802480Z-0005`,
  `20260915T173627684Z-0001`, `20260916T083526809Z-0001`, every record carrying `brief.lane`
  {worktree, branch, baseCommit} and `brief.loop.loopRunId = 5c554454-2f26-4613-9c89-c21c957bca90`,
  `heartbeatAt` advancing through the drive), a child drive answering one document, `settle: done`,
  the gate ladder in the lane (`Gate work:grade 127/03 — pass, 0 of 1987 (19 inherited, excluded
  by the baseline)`; 05 the same at 21), lane commit (`98fbd97`, `5fc318c`), merge home
  (`a79b464`, `5929b13`; 04 reconciled `9c272d0` → `b8cd0a1`), cleanup. One wave run per epoch
  (`127` runs `-0004` [03] base `1736b81`, `-0005` [04] base `a79b464`, `-0006` [05] base
  `b8cd0a1`), each heartbeating while its lane ran. **The held member was cut from the merged
  work:** 04's lane base `d7806cb` is the wave commit whose parent is `a79b464`, 03's merge;
  `readRuns` on the primary's 127/03 answers the lane's `-0005`. `--resume` reconciled live lanes
  three times (dirty → committed → merged → cleanup, or "already an ancestor"). `Build phase
  complete — every story in review.` reached; the sequential ladder then re-drove 127/02 in the
  primary. **What went wrong, four things:** `F-61` upgraded — the supervisor's relaunch (pid
  68264, `--level L2`) reconciled the operator's freshly opened lane out from under the
  foreground loop (pid 79488), which halted `lane-open-failed … lane-ref-unresolved`; the
  supervisor's loop carried the wave. `F-62` — lane 127/03's cleanup refused at every close and
  reconcile (`.aof/aof.lock.json` re-stamped), committed "dirty" three times, on disk until a
  sweep. `F-63` — loop death #5 at 19:35:29Z, 0.5 s after 04's `settle: done`, unbracketed;
  named (node-pty's console-list kill agent) and fixed at task 02 (`ownConsole`, `f55fa71`).
  **New, `F-64`** — the LAST loop (pid 99076, on the fixed payload) stopped silently at
  2026-09-16 13:52:43Z, 30 ms after the SEQUENTIAL rung's in-process driver settled 127/02
  `done` (`exit-confirmed` 13:52:43.454, the record `done` at .484, no `Driven` line, no exit
  breadcrumb): the death-#4 juncture, which the lane-child fix does not reach; no relaunch
  followed. **Not measured, and the SPEC's headline:** two lanes in flight AT ONCE — every
  wave here had one member (127's through-review set was `[03, 04]` sharing files, then `[05]`
  alone); the forced-conflict drill (`lane-merge-conflict`, the hand merge, `--resume` reading
  it as merged); the primary's story `runs/` read as empty mid-flight; `dispatch --list` clean at
  the run's own end (03's residue). `F-15` (a startup-window cancel) not exercised. 06 stays
  `in-review`; the two unmeasured scenarios need a target whose wave has two write-disjoint
  members — none exists today (130 is a chain; 131 unrefined; the test-bed holds five).
- **129/06 live run, attempt 1 (operator, 2026-09-15 10:47–12:43Z, `aof work loop 127 --resume`
  on the deployed payload `7827f9d+dirty.20260915T110622`; config committed `b5f6cd5`:
  `refine_first`, refine `orchestrated`, continue `solo`).** READ AT THE SOURCE. The loop:
  `loop-diag.127.2026-09-15T10-47-32-544Z.log` — gate on 127/01 clean, `Reconciling 0 live
  lane(s)`, `Driving 127/03 — refine, cycle 1 of 6, L2`; one declaration row (`aof mesh status
  --declarations`: `loop 127`, cap 6). **The phase mode reached the session:** run
  `20260915T104735767Z-0000`, `brief.loop.phase: refine`, transcript `7fe3b9fa` directive
  `/aof:refine 127/03 --orchestrated` — 07's composition, live. **What went wrong, two layers:**
  (1) the account's usage limit — attempt 1's QA and developer agents died on a 429 ("resets 13:40
  London"), the session played the roles inline and authored the WHOLE contract (`PLAN.md`,
  `STORY.md`, six `.feature`s on disk), then hit the limit itself at 11:12:40 and sat; the
  heartbeat killed it at 11:27:40 (`timeout`); attempts 2–4 hit the limit in 5 s each and were
  killed after 20 min (grace + heartbeat) — 60 min blind (`F-58`); (2) attempt 5 waited out the
  reset, verified the contract at the source, ran `run-complete done`, and the driver logged
  `stop-requested done` → `tree-terminated` → `exit-confirmed failed` 55 ms later: the liveness
  probe saw the killed pid before `onExit` and settled `agent_died` over the requested `done`
  (`F-59`); `agent_died` is not retried → `127 — halted on run-not-retryable at 127/03` at attempt
  5 of 6, `beforeExit code=0` — a named exit line, and the loop survived its own kill five times
  (the 2026-09-12 hardening held). Also: the `--json` probe answers the sequential act (`F-60`).
  **Fixed in item at this build (task 01, `@bug @finding-F-58 @finding-F-59`, both red-probed):**
  the probe settles `requestedStopOutcome ?? agent_died`; a provider-wait line (both spellings,
  escapes stripped) suspends the heartbeat rule until the next heartbeat, `startToCloseMs` still
  bounding, reported once as `provider-wait`. Driver lane 207 / 0 (14 suites). 127/03's five
  `failed` records stand as the run's evidence; `work:next` reads no run record, so 03 is ready
  for the BUILD wave. Redeployed; the operator resumes. Not yet measured: the wave, the lanes'
  records/grades, the held member, the conflict drill, `--resume` over a live lane, `F-15`.
- **129/07 scoped, built, reviewed and accepted (product-owner + developer + three lenses inline,
  solo, 2026-09-15).** Scoped from `F-55` after the operator named the shape (§ Notes). Built in
  one pass: `src/loop-bounds.mjs` +66 (three keys, resolvers, `loopAgentModeFromConfig`),
  `narrowDispatchBound` in `src/work/dispatch.mjs` + the `bound` input on `work:dispatch`, the shell's
  `laneBound` → the wave's `laneBoundAsk` on both asks, `phaseCommand(phase, ref, mode)` in the
  drive, `--orchestrated` in the two prompts, the autonomous paragraph, nine renders + manifest +
  lock, ADR-001 §5 / ADR-006 amended. Lane **675 / 1** under an isolated home (the red is FF-5307's
  `ui/` digest, inherited); **73 story-named cases**, nine of them also read off a real `aof work
  drive … --dry-run --json` child. Four standing controls re-pointed with a self-check each and
  **every one red-probed at the accept** (FF-12901 both legs, FF-6901, 65's
  `acd-dispatch-bound-single-home`, FF-7101 — bytes restored). Read at the source: twelve keys;
  `aof work update --dry-run` 0 / 150; `aof work drive continue 129/06 --dry-run` on this repo →
  `/aof:continue 129/06` (unset is byte-identical). REVIEW (inline): 0 Blockers; *recorded* (Important)
  — the contract named three scanning controls and the lane found a fourth (`F-56`, fixed, the file
  joined `files:`, ratified as the build delta); *fixed* (QA) — the first concurrency leg measured
  the fixture's prelude latency, not the product (`F-57`, the held-first-child pattern); *nit* —
  `wave.mjs` re-validates `bounds.laneBound` at the seam (a guard on an injected bag, kept). The
  operator's two open decisions (a warning on a mis-spelled value; operator-facing docs) are in
  § Notes and `m129/07/OUTCOME.md` `## Gaps`. Story `RETROSPECTIVE.md` (R1: grep `test/arch/**` for
  the shorter name before adding a key that contains it; R2: hold the first party until the second
  starts) and `OUTCOME.md` written. 06 stays `in-review` with `depends: [7]`; the deployed payload is
  still `2321dce8+dirty.20260912` — deploy after this commit, then the operator's live run.
- **129/05 accepted (product-owner, 2026-09-14, `aof:verify 129/05` run directly).** Story lane
  92 / 0 under an isolated home (332 / 0 on the combined run after the accept's edits, every
  registered case reported); story-attributable 21 / 0. **Every register probe re-performed by
  this session** against the shipped bytes (nine probes over `wave.mjs`, `child-drive.mjs`,
  `loop-bounds.mjs`, `dispatch.mjs`; nine reds on the named leg; every subject restored
  byte-identical) — the build's table agreed on every leg and message, and the register in
  VERIFICATION.md now carries the seven rows green; the six `*(pending — 129/05)*` markers dropped
  from ARCHITECTURE.md's register; `aof work doctor 129` reports no `control-unresolved` at any
  severity for the first time in this milestone. Read at the source: `test/arch/loop` 58 + index =
  59 at ceiling 59; `aof work update --dry-run` 0 / 150; the manifest regen a no-op against the
  lock's 19:00 stamp. **Two folds taken here** rather than routed a third time (`F-39`: the three
  lane suites' helpers onto `dispatch-lane-fixture.mjs`, +42/−70, 211 / 0; `F-51`: `classifyNumberSites`
  onto `classifySites`, +5/−42 — the "untracked" premise had lapsed at the public-repo move).
  `F-17` closed at the source, `F-23` by ruling, `F-52` by ruling, `F-54` (the two blind legs) to
  the retro, `F-53` (a `scripts/red-probe.mjs`) to the operator. Story `RETROSPECTIVE.md` (R1–R3: a
  guard and a rule share a subject; a twice-routed fold is taken by the accept that meets it; a
  procedure performed twice from a scratchpad is a script) and `OUTCOME.md` (re-shaped: the probe
  table is the register's, the first-contact history is the retro's, Gaps carry Status/Discharge).
  **06's preconditions measured at this accept, NOT met:** 05's work is uncommitted on `127-129`
  (the accept's edits included); the deployed payload must be re-read after the commit + deploy;
  127's through-review wave is `[03, 04]` with nothing held, so the target is the standing test-bed
  or a milestone the operator names. **The operator has asked that the milestone NOT be signed
  off until they sign off the configuration surface** (how concurrency is configured, its defaults)
  — held as a `@uat`-shaped stop at the milestone door.
- **129/04 accepted (product-owner, 2026-09-14, `aof:verify 129/04` run directly — the story's
  second attempt was solo, so no cascade verify phase carried it).** Story lane 187 / 1 under an
  isolated home (188 registered = 188 reported; 194 / 1 and 195 = 195 after the accept's edits), the
  one red `FF-5307`'s `ui/` digest with `ui/` untouched on this checkout; story-attributable 51 / 0
  — one named case per scenario and Examples row of all 81, every one over the real-repo lane
  fixture, the nine folded headlines read in the assertions. NO recorded grade on the run (solo build
  — `F-50`): the tier (`scripts/test-rubric.mjs`) run by hand, 1943 / 14 over 1957, eight beyond
  the stale 2026-09-13 baseline and every one attributed AT THE SOURCE — six to HEAD (7 commits, 0
  rename records since the public-repo move → `FF-11903` ×2 + `FF-6607b` ×3; 130's committed
  `PLAN.md` → `FF-9603`), two to this story: **`69/FF-6907` / `FF-6911` red whole-tree on
  `wave.mjs`'s `resolveDispatchLane(` (`F-48`)** — the invariant holds by construction (the opener
  runs inside `work:dispatch`'s admission lock and pool through the `ctx.runDispatchLane` seam), the
  control's textual leg re-pointed with a declared-supplier table, a self-check row per leg and a
  real-bytes probe; the control added to `files:`. **`F-49`:** `mergeDispatchLaneHome`'s THROWN
  codes (03's `F-44` note) escaped `mergeLane` as a loop death — `mergeHome` now reads them as the
  refusal, one row + red probe. 1946 / 12 after; the twelve are the inherited set exactly.
  `FF-11903`'s ceiling measures 148 vs 47 (the rename-map loss; `wave.mjs` / `cycle.mjs` cleared,
  `lanes.mjs` remains — `F-09` addendum). Read at the source: shell 2,311 → 1,686; `cycle.mjs` 963,
  `wave.mjs` 910; the child deadline `startToCloseMs + startupGraceMs` (`F-16`); `offerFrom` /
  `unrefinedStories` (`F-07`, `F-08` — the "no loop over an `in-review` story" rule is LIFTED);
  `test/loop` 72 → 74 + the `test/support/loop` row (`F-18`). `validate` PASS, `loops validate`
  0 error, `doctor` no `control-unresolved` at story scope. `F-15` re-routed to 06 (the child's
  arming order is `drive.mjs`'s); `F-39` to 05 (04's fixture was born under `test/support/loop/`).
  `m129/03`'s "caller of the three composed verbs" gap discharged. Story `RETROSPECTIVE.md` (R1–R3:
  the tier beside the lane, a routed note is a row, a bound seam is a door) and `OUTCOME.md` written.
  The five contract deltas of the build entry stand ratified at the review close, no `.feature` edited.
- **129/04 review close (2026-09-14, solo — architect / QA / craft lenses played inline, one round,
  0 Blockers).** Gate ladder clean before and after the fix round (`validate` `[]`, `doctor` 0
  errors); story-scoped run — the whole `test/loop` index plus every suite importing the changed
  modules, as `--only` under an isolated home (the story's `files:` widen `--scope impacted` to
  `all`, which binds `:4182` here) — 1671 pass; every red inherited at HEAD: `loops-ledger/05 leg 9`
  (the public root's 7-commit history holds 0 renames), FF-5307's `ui/` digest (the fleet lane's
  re-pin), and `81/01 the record itself is unchanged` (`stubRubric` answers its BASELINE first since
  2026-09-12, so a direct `work:grade` invoke reads 0 failures — the fixture change, committed as-is).
  **Fixed at the close (architect, Important):** `wave.mjs` re-spelled `transitionOptionsFor`
  (now `cycle.mjs`'s export with `lockWorkspace`), and spelled the merge-halt shape and the
  cleanup act twice (lane close vs reconcile) — one `mergeHalt` / `cleanupLane` each. **Fixed
  (craft):** unused imports, stale doc comments. **Recorded (Important):** the family net is +1243
  against ADR-008 §3's +750–900 — the wave carries reconcile, signals, the interval and an epoch
  per admission; the estimate, not the code, was short. **Recorded (Nits):** the shell's
  `freshGate` re-spells a slice of the ladder's routing (decideReviewGate → pendingFixes) — the
  ruling keeps the gate ladder in the shell, so it stays; `mergeDispatchLaneHome` (03's) labels
  the own-writes commit with the merge's message; `NO_PRINT` is spelled in three modules; task
  02's COMMIT row ("clean tree → already-current") is driven as the child-committed shape (a
  lane that produced nothing is re-dispatched until the cycle cap, bounded — worth a 06 scenario).
  **Amendments for the PO (the five contract deltas in the build entry):** ratified at this beat,
  no `.feature` edited. Nothing routed to a story.
- **129/04 build (developer, solo, 2026-09-14; resumed run `20260914T123830334Z-0001`, attempt 2
  after the 2026-09-13 run died before writing anything).** Shell measured **2311 → 1686 lines**
  (`src/commands/loop.mjs`, −625); the family gained `cycle.mjs` (963) and `wave.mjs` (905) — a net
  of +1243 against ADR-008 §3's estimate of +750–900, for the review to weigh (the wave carries the
  reconcile, the signals and the interval; both modules carry their reasoning as prose). Five contract problems met, each built
  to the shipped semantics and the scenario line left for the PO (no `.feature` edited):
  (1) task 02 "the first lane merged has `merge.outcome` `fast-forwarded`" and task 04
  "`brief.wave.baseCommit` equals … each lane's `brief.lane.baseCommit`" cannot both hold: the wave
  run's record is a primary-tree write, so the lanes are cut AFTER the own-writes commit that carries
  it (ADR-002 §2), which makes the first merge a fast-forward and the lanes' base one commit later
  than the HEAD the brief names. Built: mint → commit own writes → cut; the test pins the
  parent/child relation. (2) task 02 "two run records, `brief.loop.cycle` 1 and 2": a first failing
  grade re-drives from the PROGRESS rung as a continuation at the SAME cycle (the shipped ladder,
  127 STATE's "a progress-continuation re-drive does not advance the cycle"); the records read 1
  and 1 and the second carries the first's grade. (3) task 03 "the narration says `Gate work:grade
  07/01 — fail (case-failed) … (2 inherited …)`": a progress-rung re-drive never reaches the gate
  rung's line — the shipped shell's shape; the inherited count is narrated on the grade that reaches
  the gate. (4) task 01's RULING "brief.grade on the story's latest run when a successor carries one"
  was read literally: a grade on the latest continue run ITSELF is the one that caused it, so the
  fresh gate counts a recorded grade only on a SUCCESSOR run and otherwise reads the ATTEMPT run's
  ledger (`brief.progress.attemptRunId` — a continuation samples into its lineage's first run, so
  the latest continue's own ledger is empty). (5) task 04 "brief.wave.members ["07/03","07/05"]"
  after a member is admitted mid-epoch: an epoch is settled and a new one minted at every admission
  as well as after every merge, so every epoch's brief names exactly the lanes it carried.
  **Declared write set incomplete:** `src/loop-bounds.mjs` (the `REFINE_FIRST_CONCURRENCY` binding
  the shell compares against — one spelling, in the home) and
  `test/loop/loop-fix-transport-shape.test.mjs` (a fifth shell-text control, scanning the four
  `pendingFixes.set` sites, now split shell/ladder) and `test/loop/work-loop-production-review-bound.test.mjs`
  (a sixth: it pinned the shell's `loop-bounds` import as a six-name literal; re-pointed to
  membership) — all three added to `files:`. **Seams added, both
  ctx-level:** `ctx.invokeRegistered` (the family's one injectable invoke seam — honoured by the
  shell too, so the gate ladder is scriptable per lane) and `ctx.waveTimers` / `ctx.signalSource` /
  `ctx.now` (the interval, the signals, the clock). **Design choices to review:** a child that
  answers `aborted` under no signal halts `operator-interrupt` / `driver:aborted` rather than being
  re-dispatched; a wave whose members are all live in a lane another process still heartbeats
  halts `lane-open-failed` / `run-store:duplicate-run` naming them (the open's own refusal, never a
  poll); the fresh gate's fix names the latest continue run as `buildRun` — or the gate itself
  when a story reached `in-review` with no run — because the driver applies a fix only under a
  named build. **Inherited red:** FF-5307's `ui/` digest (the fleet lane's re-pin), untouched here.

- **129/01 accepted (product-owner, 2026-09-13, `aof:verify 129/01` under the cascade's verify
  phase).** The story's lane is 385 pass / 0 fail under an isolated home (397 / 0 on the re-run after
  two polish edits), all 33 scenarios and every Examples row have a named passing case, the mode's
  single home and the engine's zero-import leaf were read at the source; `validate` `[]`, `loops
  validate` 0 error, `doctor` no `control-unresolved` at story scope. `aof work status 129/01 done`
  accepted first time (STORY.md 95 lines). Findings `F-01`–`F-12` allocated in `VERIFICATION.md`: the
  review-close nits (a)(b)(c)(e) closed by edit here (`F-04`, `F-05`), (d) closed by ruling (`F-06`),
  (f) routed to 04 (`F-07`); the fresh-`gate` interim is `F-08` with the OPERATIONAL RULE: **no
  `aof work loop` over a stream holding an `in-review` story on this tree until 04 lands.** Story
  `RETROSPECTIVE.md` (R1–R6) and `OUTCOME.md` authored; `memory ingest` re-indexed 2,358 records.
  **Left for the milestone door:** FF-11903 is red whole-tree at 58 vs a ceiling of 47 (`F-09`) —
  129's family modules clear when 02/04 land, a `lanes.mjs` under `src/loop/` (ADR-008's REJECTED alternative)
  can never clear by landing and needs the architect to respell it, and 129/03's features carry six
  fixture paths under `src/` that its build must spell elsewhere; `src/work/loop.mjs` at 1,578 lines
  (`F-10`, story-sized) sits here for the operator to place; the supervisor `ceilingMs` hunk in the
  same file is another lane's and the commit batch must carve it (`F-12`).

- **129/01 review close (2026-09-13, orchestrator; three lenses, one round, 0 Blockers).** Fixed at
  the close: `decideWave` read a `Set`-typed `live`/`setAside` as empty (the shell's set-aside IS a
  `Set`) → it now reads arrays and `Set`s and answers `null` for any other present shape (craft pass,
  Important); the loader-admission scenario had a second hand-rolled registry writer in
  `loop-record-projection.test.mjs` → moved to `work-loops-resolved-ceilings.test.mjs`'s `grammarRows`
  (the loader's home), which gained an R8 parse guard on every row; `files:` extended by that suite
  (architect, Important). Amendment: ADR-001 §1 said a mode ceiling "reads `unknown`"; the feature
  and the code say `bounded`/`bound: null` — ADR amended, feature untouched (all three lenses).
- **Recorded (Nits, 129/01):** (a) `work-loop-phase-map.test.mjs` "only task count and uat counts
  affect task-derived dispatch" now names a claim the engine no longer satisfies in general — its
  rows dodge the `in-review` branch (architect; R5/m45 shape); (b) `loop-record.mjs:~137` still
  inlines the predicate `positiveIntegerOrNull` names, and the `configBound` narrative comment now
  sits above the helper rather than the function (architect + craft); (c) `loop-bounds.mjs` header
  still says "deadlines and loop caps" — it holds a mode now (architect); (d) `decideWave` passes
  duplicates through and a ref in both `wave` and `heldSet` lands in both answers — `work:next` never
  emits either shape (craft + QA); (e) the "engine imports nothing" case's regex admits a dynamic
  `import()` — the strong home is `work-loop-determinism`'s copied-alone leg (craft); (f) an
  empty/padded string member of `unrefined` is accepted as a ref — the shell (04) produces the refs (QA).
- **Owed to 04, not 01 (all three lenses):** the shell halts `unmapped-item-type` /
  `unexpected-engine-act` on a fresh `gate` act, so from this diff on ANY loop — `sequential` included
  — whose head is an `in-review` story with tasks halts there instead of re-driving `continue` (the
  STORY Notes' interim; fail-loud; the 127 soak must not run between 01 and 04); `nextDecision`
  passes neither `concurrency` nor `unrefined`; `refineFirstDecision` does not subtract `setAside`
  from `unrefined`, so the shell must (or a set-aside story costs `cap` refine sessions before it
  halts); no lane-stop narration in the halt `details` / `renderLoopState` yet. The engine's
  `lastPhase === "verify"` tail is now unreachable for a story that is actually `in-review` (test-only).
- **Retro-worthy (architect):** `src/work/loop.mjs` crossed 1,500 lines (51 inbound edges, no budget
  row or ledger entry); 04/05 push it further — a size ratchet or a split of the review/finding-routing
  block (`:170-380`, nothing to do with the phase map) is story-sized, not this item's. And task 01
  carried a structural invariant ("the engine imports nothing") that already lived in the register.

- **129/02 accepted (product-owner, 2026-09-13, `aof:verify 129/02` under the cascade's verify
  phase).** Story lane 136 / 9 under an isolated home, story-attributable 40 / 0 — one named case per
  scenario and Examples row of all 39; the 9 reds named and inherited (FF-11904 ×5 with no `src/loop`
  mention, FF-11902 ×3 on two UNTRACKED files of other lanes, `53/00 task01` on `source-slice.mjs` red
  at HEAD). `src/loop`'s import set and the exemption read at the source; the face driven as a real
  child (`--dry-run` → one document; unreadable `--fix` → one refusal before any mint). Grade `pass`
  1,956 / 0 beyond baseline; `validate` `[]`; `loops validate` 0 error; `doctor` no
  `control-unresolved` at story scope. Findings `F-13`–`F-27` allocated: the Blocker (`F-13`) closed
  in item; `F-14`/`F-19`/`F-26` closed at the build/close; nits (a) and (c) closed by edit here
  (`F-20` — the kill message names the bound that sent it; `F-15`'s comment states the yield's limit),
  (d)(e)(f)(h)(i) closed by ruling (`F-21`), (g) to TECH_DEBT 85 (`F-22`), (j) to 05 (`F-23`); the
  arming-order amendment and the 60 s deadline routed to 04 (`F-15`, `F-16`); FF-12902's legs to 05
  (`F-17`); the `test/loop` parking to the 04/05 row raise (`F-18`). **Two items outside the
  milestone:** the face binds `--run --json` as a value and the accept's probe of it STARTED A REAL
  SESSION for ~2 min (killed; read-only; ten bogus heartbeat rows removed by hand) — `F-24`, a face
  item plus the rule "probe a drive with `--dry-run` or not at all"; the runner's silent exit 0 on a
  drained event loop — `F-25`, a runner item. Story `RETROSPECTIVE.md` (R1–R8) and `OUTCOME.md`
  authored; observability snapshot written (1h13m active, one grind, the flagged "stall" is the review
  hand-off). `F-09`'s `child-drive.mjs` citations now resolve; `wave.mjs`/`cycle.mjs` wait on 04.

- **129/02 review close (2026-09-13, orchestrator under the cascade's continue phase; three lenses,
  two rounds, 1 Blocker → 0).** Build: 39/39 scenarios and every Examples row green in
  `drive-command-phase-drivers` (tasks 00/01/03, +27 cases) and `audit-spawn-bounded` (task 02,
  +12); focused set 524 ok / 8 not ok, all 8 inherited from other lanes' uncommitted work in this
  shared checkout (FF-11904 ×5 naming `src/commands` 68/67, `test/arch/work` 48/46, `test/work`
  58/57, `test/work/stream` 33/32 — zero mention of `src/loop`; FF-5307 `ui/` changed; arch/15
  `promote`; 53/00 `test/support/source-slice.mjs` at HEAD `9b64eb32`). Ladder `validate` `[]`,
  `doctor` healthy 0 errors, walked before every review and again after the fix round.
  **Blocker (all three lenses; reproduced at the source by the orchestrator, craft and architect):**
  `src/loop/child-drive.mjs` discriminated the argv on `cli.mjs` existing, not on what
  `process.execPath` IS — under the payload-first `aof.exe` both are true, and
  `aof.exe <exeDir>/src/cli.mjs work drive …` answers `Unknown command "…cli.mjs"` with zero stdout
  bytes, so every lane drive from the installed binary would have `died` at t=0. Fixed in item:
  `isPackaged()` (`src/asset-base.mjs`, the one SEA-detection home) picks the vector, the entry is
  resolved lazily on the Node branch only (the embedded CJS bundle rewrites `import.meta` to `{}`, so
  the eager `new URL` would have thrown at load), a four-row SEA-sentinel case asserts the verb-only
  vector; ADR-005 §1 AMENDED by the architect. Round 2 (architect delta): PASS.
  **Fixed at the close (Important, cheaper than a driver):** `drive.mjs` arms stdin inside the same
  `try…finally` as the driver call (a throw between resume and pause would have left the child
  hanging until the parent's deadline kill — craft); `DEFAULT_GRACE_MS` 10 s → 20 s, the comment
  carrying QA's measurement (real stdin-end → exit stop path 7.08–7.15 s: the driver's bracket plus
  node-pty's own 5 s console-list fallback after `taskkill /T` emptied the tree).
  **Amendment routed to 04's contract (question 1 — a locked RULING; craft #3 = QA F1 = architect's
  contract question, one finding):** task 01's ARMING ORDER ignores an `end` seen before `onPtyLive`,
  so a parent cancel landing in the child's startup window (fix read → brief compile → trust write →
  ConPTY spawn, 150 ms–1.2 s measured, longer under the load 129 creates) is dropped; the session
  spawns anyway and the parent's grace SIGKILLs the drive child without the driver's bracket. QA F2
  adds that the `setImmediate` yield after `resume()` is a latency guarantee, not a structural one
  (a NUL / `stdio: "ignore"` stdin plus an instant fake PTY reads as a cancel 8/8; production's
  hundreds-of-ms PTY spawn masks it). Changing the gate here would red task 01's delivered row
  "was ended before the command started → done", so the rule lands in 04's contract or a superseding
  ADR note: PROPOSED — arm only when stdin is a PIPE (the one channel the loop uses); on a pipe any
  `end` is the cancel (pre-live → the driver's own pre-spawn `signal.aborted` refusal,
  `processStarted: false`; live → the bracket); a TTY/file/NUL stdin is never armed; the yield goes.
  04 owns the parent side and 06's live run measures it.
  **Owed to 04/05 (recorded):** a lane drive with no `deadlineMs` inherits `DEFAULT_DEADLINE_MS`
  60 s — 04 derives it from `startToCloseMs + startupGraceMs` (ADR-005 §4) or every lane is `timeout`
  (craft); FF-12902's `node:child_process` leg must scope to `src/loop/**` (`commands/loop.mjs`
  imports `execFile` for git, pre-existing) and its argv leg must take the packaged branch through
  `setSeaSentinelForTest` (architect); `test/loop` is at ceiling 72/72 and now parks three subjects
  in `drive-command-phase-drivers.test.mjs` (506 → ~1,500 lines) — 04/05's wave/cycle suites need a
  stated row raise, not more parking (architect).
- **Recorded (Nits, 129/02):** (a) `spawn.mjs` — a deadline expiring inside an abort's grace kills,
  but the message says "did not exit within its Nms grace, so it was killed" (three lenses, one
  finding); (b) the pre-liveness `end` is "recorded and ignored" per the ruling and records nothing —
  a `reportDegrade` would give the death bracket something to read (QA + architect); (c) `drive.mjs`'s
  comment claims one `setImmediate` covers "a real pipe or NUL handle" — measured true for NUL,
  false for a parent-ended pipe (architect); (d) the `end` listener is never removed — row 2 pins
  count 1, harmless for a one-shot process (craft); (e) under `--run` a caller-supplied
  `agentSessionDriverOptions.signal` is replaced — unreachable from the CLI (craft); (f)
  `{ ...process.env, ...env }` loses a caller key differing only in case on Windows; `AOF_GLOBAL_HOME`
  unaffected (craft); (g) a `kill()` fault other than ESRCH/EINVAL emits `error` and settles
  `not-started` for a child that ran — pre-existing, the abort adds a second kill site (craft);
  (h) the already-aborted-at-entry case asserts `sessionId: null` where task 01's literal omits it —
  the driver's sibling pre-spawn refusals carry it, the feature literal is out of step (QA);
  (i) "touches no run record" reaches `aborted` via the pre-aborted path, never a live abort (QA);
  (j) "src/loop is a declared exemption" is a structural claim the unit suite re-asserts by importing
  the arch control — the scenario asks for it; drop when 05 lands FF-12902 (architect);
  (k) `--run --json` binds `--json` as the flag's value (face-general, pre-existing; `spawnLaneDrive`
  always supplies a value) (QA).
- **129/02 grade fix (2026-09-13, the cascade's warm fix on the build session; 1 finding → 0).** `work:grade`
  flagged ONE case beyond the run's baseline: FF-11902 "a floor is a floor" — the driver-door census
  gained its 49th suite (`drive-command-phase-drivers.test.mjs` imports `driveInteractiveClaudeSession`
  through the sink for task 01's driver-level `signal` rows) and the no-headroom probe pins the shipped
  floors to the live count. Ratcheted in step: `acd-control-derives-its-census` floors `suites` 48 → 49,
  `preExisting` 54 → 55 (and its retyped `SUITE_FLOOR`/`CENSUS_FLOOR`/`suites.length >= N` literals);
  `agent-session-driver-door` `SUITE_FLOOR` 49, `CENSUS_FLOOR` 55, the `>= 48` non-vacuity floor 49. Both
  files added to `files:`; ladder `[]` / healthy; 121 ok across the story's suites + both controls, the
  only reds the baseline's FF-11901/FF-11902 ×3 and 53/00's `source-slice` residue at HEAD. RETRO: the
  door's own doctrine says a story adding a sink importer "should not have to edit a control it has never
  read", yet FF-11902's no-headroom probe plus the meta-probe's retyped floor literals send exactly that
  bill — a four-site ratchet across two files for one new importer. The floor should be derived (or the
  no-headroom leg dropped), not retyped twice.
- **Feedback (129/02, orchestrator + lenses):** ADR-005 §1 and the story's feasibility note both
  assumed `process.execPath` is a Node runtime; under the payload-first launcher it is the SEA, so
  ANY aof self-spawn must branch on `isPackaged()` — the same latent shape sits at
  `src/work-audit/census.mjs:516` / `evidence.mjs:528` (architect). `scripts/test.mjs --only` exits 0
  with NO summary line when a suite drains the event loop mid-await — a false-green shape met twice
  in this build; the runner should treat an unsettled selection as a failure (developer). The
  declared `reads:` was incomplete (`test/session/agent-session-driver-door.test.mjs`,
  `test/support/mesh-worker-terminal-fixture.mjs`, `src/run-store.mjs`, `src/run-session-capture.mjs`,
  `src/run-spend-ingest.mjs`, `src/degrade.mjs`, `src/claude-trust.mjs`,
  `acd-phase-brief-bounded-in-writer`) and `files:` missed `test/loop/loop-fix-transport-shape.test.mjs`
  (its input-schema pin had to change) — added to the declaration at the build. The budget table's
  diff in this checkout carries 127/128's uncommitted ceiling rows beside this story's one `src/loop`
  exemption line, as does `agent-session-driver.mjs`'s tree-terminate hunk — the ship step must carve
  the batches (craft). TECH_DEBT item 85's trigger ("a third caller") is now met — status line appended,
  remedy unchanged (architect).
- **129/03 review close (2026-09-13, orchestrator under the cascade's continue phase; three lenses
  + one delta round, 1 Blocker → 0).** Round 1: architect / QA / craft each raised the SAME Blocker —
  `commitWorktreeChanges`'s `paths` scoped the `add` but not the commit, so `mergeDispatchLaneHome`'s
  own-writes step swept an operator's pre-staged out-of-scope entry (`M  README.md`) into a
  mesh-authored commit and door 2's staged-entry refusal never fired. Fixed: the scoped door checks
  `diff --cached -- <paths>` and commits `commit --no-verify -m … -- <paths>` (the operator's staged
  entries stay staged and are then refused by name); the `.aof` reset runs only when the scope can
  reach `.aof`, and then the commit carries `:(exclude).aof` because a pathspec commit takes WORKING-
  TREE contents. Round 2 (QA only, the raising lens): RESOLVED on the round-1 probe shape and 28/28
  edge probes; no new Blocker.
- **Fixed in the round (Important):** (I1, 3 lenses) `touched-paths` read plain `status --porcelain`,
  which collapses a wholly-untracked directory to `?? dir/` and never intersects the file-level
  three-dot diff — git then refused at the ff/merge door and the promised RETURNED refusal became a
  thrown `gate-propagation-failed`; now `-c core.quotePath=false status --porcelain --untracked-files=all`
  under `touched-paths` only (strict's invocation byte-identical; the `-c` also un-escapes non-ASCII
  names in `files`). (I2, craft) `dispatchLaneBase` answered against the MAIN worktree's line — wrong
  when the primary is itself a linked worktree, which this repo's gate-in-a-worktree flow is; gains
  `{ primaryRoot }` (explicit `rev-parse HEAD` there), list-main fallback only when absent. (I3, QA +
  craft; PO ruling made inline) EVERY `advanceTo` refusal is `lane-open-failed` with `cause` = the
  verb's code — a lane that cannot be brought to HEAD is not handed out whichever door refused, and
  04 switches on ONE code. (I4, architect + craft) a second porcelain-v1 parser had been born beside
  `laneChanges`, and `defaultGitExec`/`resolveExec`/the mesh identity argv were each spelled twice —
  one `parsePorcelainStatus`, one exported exec seam (`dispatch.mjs` borrows `worktree.mjs`'s), one
  `meshIdentityArgs`. (I5, QA) production passes no `pushExec`, so the moved verb's fallback budget
  fell 300s → 30s — `WORKTREE_COMMIT_TIMEOUT_MS` (5 min) on the default runner only; injected runners
  still receive exactly `{ cwd, env }`.
- **Amendments (contract, ratified here — the `.feature`s are untouched; for `aof:verify 129` to
  carry):** (a) task 00 "`acd-session-driver-mesh-blind` is green unchanged" was INFEASIBLE — the
  required re-export of `resolveRefInWorktree` from `../work/dispatch.mjs` necessarily adds
  `work/dispatch.mjs` + `mesh/launcher-lock.mjs` to the SINK's static closure; the pin is re-measured
  71 → 73 (driver reach 24 unchanged); `files:` gained `acd-session-driver-mesh-blind` and
  `acd-worktree-path-scoped` (now reads `dispatch.mjs` as the ref-resolution module); `SINK_CEILING`
  1957 → 1914. (b) task 01 intro "files in porcelain order" → lexically SORTED: every row is only
  consistent with sorting. (c) task 00 ruling (1) "the `.aof` reset still runs" under `paths` → only
  when the scope can reach `.aof` (in the primary the reset unstaged an operator's staged
  `.aof/aof.config.json` outside the scope — ADR-002 §2 "nothing else", ADR-008 §7(d)). (d) ADR-002
  §7 / task 02: `lane-open-failed` covers every refusal, `cause` carries the verb's code. (e)
  `dispatchLaneBase(lanePath, { primaryRoot, exec })` — additive. (f) rows the tests now hold that no
  feature states: the untracked-directory collapse; a staged out-of-scope entry across the own-writes
  commit; a linked-worktree primary; a dirty reused lane under `advanceTo`.
- **Recorded (Nits, 129/03):** `resolveDispatchLane` accepts any string as `advanceTo` (a ref such as
  `HEAD` resolves against the LANE and answers `already-current` silently — a `[0-9a-f]{7,64}` guard
  would enforce the "SHA, never a ref" ruling); `withMoveFixture` / `withDirtyPolicyFixture` re-scaffold
  `withDispatchRepo`, and `writeRel`/`writeUnder`, `mergeHeadAbsent`, `conflictMarkers` are spelled
  2–3× across the three suites (the support module was outside `files:`); `mesh-worker-commit-diff`'s
  traversal row asserts `existsSync(worktree/../../etc) === false`, which cannot fail; the three
  unknown-policy rows build a real repo to exercise a recording double; a `.`-shaped scope's `.aof`
  reset still unstages a staged `.aof` edit (unreachable from the loop, which never passes `.`);
  `worktree.mjs` 964 → 1194 and `dispatch.mjs` 582 → 776 against ADR-008's ~1,030 / ~700 (54–56%
  comment lines in the added code). **Consumer notes for 04:** `mergeDispatchLaneHome` can THROW
  (`commit-failed`, `gate-propagation-failed`, `gate-propagation-base-unresolved`) as well as return;
  a `branch-missing` refusal carries `base: null, tip: null`; a `commit -- <paths>` during an
  in-progress merge in the primary is refused by git → thrown `commit-failed`, MERGE_HEAD intact.
- **Ship hygiene (architect + craft):** `test/arch/session/acd-session-driver-mesh-blind.test.mjs`
  carries 127/01's `work/observe.mjs` route hunk beside this story's 71 → 73 hunk — whoever commits
  129/03 must not sweep that lane's change in or out with it. TECH_DEBT item 83 re-measured: 1,914
  lines (−43), one verb of seam 3 paid as the contract scoped it — the ledger line is verify's to
  append (TECH_DEBT.md was outside `files:`).
- **Feedback (129/03, retro-worthy):** the feasibility note that ruled `worktree.mjs` out as the
  resolver's home cited a `work.mjs` edge that module ALREADY carried (`loadWorkspace`, HEAD:47) and
  conflated the sink's pinned reach (71) with the driver's (24) — a rationale written into the
  contract before it was measured; `dispatch.mjs` stands as the home on ownership grounds alone
  (architect). `aof test --scope impacted --story 129/03` resolves to `all` because `.gitattributes`
  is not a graph node — the build terminator was run as `--scope file` over the named suites
  (`17/1067 suites · scope file`), never as the whole run; a non-module in `files:` should widen to
  nothing, not to everything (developer).

- **129/03 accepted (product-owner, 2026-09-13, `aof:verify 129/03` under the cascade's verify
  phase).** Story lane 208 / 0 under an isolated home (208 registered = 208 reported), story-attributable
  103 / 0 — one named case per scenario and Examples row of all 37, every one over a real git fixture;
  the move, the re-exports, the unchanged call sites and the one `merge=union` line read at the source
  and through `git check-attr`. Grade `pass` 1,956 / 0 beyond baseline; `validate` `[]`; `loops validate`
  0 error; `doctor` no `control-unresolved` at story scope. Findings `F-28`–`F-47` allocated: the
  Blocker (`F-28`) closed in item at round 1; `F-29`–`F-33` closed at the review close; the three
  amendments ratified as `F-34`–`F-36` (the `.feature`s untouched — for `aof:verify 129` to carry);
  nits closed by edit here (`F-38` — `advanceTo` must be a hex object name, thrown
  `dispatch-lane-advance-not-a-sha` before any door, five rows; `F-40` — the traversal row plants the
  directory it denies; `F-41` — bare temp dir for the no-invocation rows; lane re-run 213 / 0), by
  ruling (`F-42`) or by record (`F-37`, `F-43`, `F-46`); the fixture dedupe and the throw-shapes owed to
  04 (`F-39`, `F-44`); the ship-hygiene hunk to the commit batch (`F-45`); `--scope impacted` widening
  to `all` on `.gitattributes` an `aof test` item (`F-47`). **`F-09` corrected:** 03's six fixture paths
  sit in its delivered `.feature`s and the sweep reads those, so no act of 03's clears them — they are
  the 124/126 species and the door's remedy is the architect's (FF-11903's reader); measured 57 vs 47.
  TECH_DEBT item 83's status line appended (1,957 → 1,914, one verb of seam 3). Story
  `RETROSPECTIVE.md` (R1–R7) and `OUTCOME.md` authored; observability snapshot written (1h26m active,
  the flagged "stall" is the round-1 hand-off, the grind is real — `worktree.mjs` ×10). The first
  build run was reclaimed `runtime_offline` after the host slept (loop death #4 below) and the retry
  carried the story — the recovery path worked; the cost was a second session.

- **Loop death #4, bracketed to the line (2026-09-13, `aof work loop 129`, pid 73904, diag
  `~/.aof/mesh/logs/loop-diag.129.2026-09-12T23-26-42-974Z.log`).** 01 and 02 accepted cleanly —
  both sessions' stop brackets completed (`stop-requested` → `tree-terminated ok:true` →
  `pty-released` → `exit-confirmed`) and the loop survived each, which the 2026-09-12 fix bought. 03's
  session (`96eb26ce…`) worked 03:24–03:31Z (transcript 1.1 MB, one consumed heartbeat at 03:31:30Z,
  no file of its write set touched), then made no progress; the loop's own minute-beat also stopped
  03:31:45–03:47:35Z. Windows System log: **the machine entered sleep at 03:47:35Z and woke at
  08:21:51Z** — the stall is the host going idle, not the agent. At the sleep instant the heartbeat
  deadline fired (`stop-requested … failureReason: "timeout"`, correct), `taskkill /T /F` FAILED
  ("The process with PID 5648 (child process of PID 2536) could not be terminated. Reason: The
  operation attempted is not supported"), `pty-released` ran anyway, and nothing was written after
  03:47:40Z: no `exit`, no `uncaught`, no signal — the process was terminated from outside during
  node-pty's console-list kill, the 2026-09-12 class, this time on a FAILED tree-terminate. Two
  lessons, one each: (a) an overnight loop needs the host awake — no code owns that; (b) when the tree
  kill fails, the driver still runs node-pty's `kill()` console-list path against a live pseudoconsole,
  and that is the path that takes the parent down — skipping it (or failing the stop `pty_kill_failed`)
  after an `ok:false` tree-terminate is a one-condition hardening in `agent-session-driver.mjs`; 04's
  child-process model moves the whole bracket into a per-lane child regardless. 03's run
  `20260913T032426340Z-0000` is left `running` for `--resume`'s reclaim (`runtime_offline`), not
  hand-settled.

- **129/05 built and reviewed (developer + all three lenses inline — `--solo`, 2026-09-14).** The
  four controls, the never-discards extension and the prompt paragraph landed; every register probe
  performed by a scratchpad script against the shipped bytes with sha256 restore (OUTCOME.md's
  table). Focused build evidence 246 / 8 over the story's suites plus the class-level `test/arch`
  controls, the gates it moves and the wave/driver suites; the eight reds are the inherited set at
  HEAD (`FF-11903` ×3, `FF-11901`/`FF-11902` ×4 naming other stories' files, `FF-5307`'s `ui/`
  digest) and none names a file of this story. `aof test --scope impacted --story 129/05` is the
  forbidden full suite here (four new paths widen it), so the focused set is the run.
  TWO CONTROLS WERE BLIND AT FIRST CONTACT and were amended (OUTCOME.md): FF-12903's structural leg
  answered the register's probe with a bare `NOT FOUND` (the non-vacuity guard ahead of the rule),
  its fixture leg judged the wave's END state before its spawn-time observations, and FF-12907's
  pass-through count was module-wide — the wave run's own pass-through hid the lane mint's removal.
  Retro: a non-vacuity guard and a rule share a subject; when the probe REPLACES the subject the
  finding must carry both, and a fixture leg judges what it observed before what it ended on.
  REVIEW FINDINGS, routed at the close (no Blocker; nothing created):
  - *recorded* (Important) — `classifySites` was LIFTED into `test/support/source-slice.mjs` but
    `acd-number-null-safe.test.mjs` (outside this story's `files:`) keeps its private
    `classifyNumberSites`/`originalLineOf`; fold it, with 127/01's copy, onto the generic when 127
    lands (the story notes already scope that fold). A two-line edit each; not taken here because
    the file is outside the declared write set.
  - *recorded* (Nit) — FF-12907's `loop: {` construction check is module-wide over a three-module
    family; precise enough today, worth scoping to the mint if the family grows.
  - *story (operator)* — the red-probe runner (edit → run under a fresh home → restore → sha256)
    lived in the session scratchpad; a reusable `scripts/red-probe.mjs` that performs a register
    row's probe and restores the bytes would let `aof:verify` re-observe a probe after the bytes
    move (68's R8). New acceptance criteria — handed back as a story shape, not created.

- **129/06 built and reviewed (developer + lenses inline — `--solo`, 2026-09-14).** The one
  code-shaped deliverable is in: `.aof/aof.config.json` carries `work.loop.concurrency:
  "refine_first"` beside the two loop bounds, `work.agents.mode` untouched; `loopConcurrencyFromConfig`
  resolves it and `aof work loop 129 --json` (the read-only probe) answers `act: gate 129/05` — the
  status routing of ADR-001 §4, launched nothing. The story's task is `@manual` and the operator's:
  the live run is performed at `aof:verify`, and its readings land here then. PRECONDITIONS NOT YET
  MET, read at the source: the deployed payload is `2321dce8+dirty.20260912T202852` (pre-129 —
  deploy after 129/05 is committed, `aof --version` read); 129/05's work is uncommitted on
  `127-129`; and 127's through-review wave is now `[03, 04]` with nothing held (02 is `in-review`),
  so the "two-member wave with a held third" the feature names is the standing test-bed's, not
  127's — the operator picks the target.

## Verification


<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
