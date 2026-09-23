---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Scaffolded at refine (2026-09-13) so the fitness register exists for story 05's red probes; every
  row below reads pending with an em-dash probe (129's convention) until its control lands and is observed failing.
-->
# 130 · Stop a running loop — Verification

## Verification evidence

Recorded at `aof:verify 130` (2026-09-24). The story lane is ONE focused run over the union of the six
stories' write sets, plus every suite that imports the stop's modules, the whole `test/arch/loop/`
family and the run-store retry suites: `AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only`
over 121 files. **1000 ok, 8 not ok.** Every not-ok is a whole-tree register control, and none is a
130 scenario. They are attributed and repaired under `## Findings` (F-15 to F-19). Cargo:
`cargo test --manifest-path app/desktop/Cargo.toml` → core `118 passed; 0 failed`.

- **130/01 — the stop request has one home.** `test/loop/loop-diag.test.mjs`'s `130/01 stop-request/00–02`:
  **32 ok, 0 not ok.** *verifies →* tasks 00–02 (`@executable`).
- **130/02 — the verb and the shell honour it.** `130/02 task00–04` across the four `loop-command-*`
  suites: **41 ok, 0 not ok**. Also green: 130/06's regression for the retry carry (`51cfa6a`), `loop stop
  — an operator retry of a dead loop's run carries no declaration, so the verb still addresses the live
  loop` in `loop-command-probe`. *verifies →* tasks 00–04.
- **130/03 — the fleet sees and stops it.** `presence-carries-the-loops/00`, `status-names-the-serving-node/01`,
  `loop-stop-route/02`, `the-line-and-the-button-are-pure/03`, `the-card-renders/04`: **44 ok, 0 not ok**.
  *verifies →* tasks 00–04.
- **130/04 — the desktop stops what it supervises.** Task 03 (`work-loop-declarations`): **8 ok**. Task 00
  (cargo, `supervision.rs`): inside core's 118 passed, including ADR-007's
  `only_an_unpressed_declarations_duplicate_run_attaches`. Tasks 01 and 02 are `@manual`, and three
  lanes discharge them. (a) The node leg of FF-13007 pins the shell's shape: no `"--stop"` literal
  in `supervisor.rs` (the argv is formed in core by `stop_argv`), and no `start_kill` on the declaration path.
  (b) The 2026-09-21 fixture render of `app/desktop/ui/index.html?loops=<signal>` (chromium-1234,
  light and dark), recorded in STATE's `## Feedback`, matches Surface 2's binding checklist region by region.
  (c) The live window, read in 130/06 leg 6 (below). The operator's screenshots show the loop bar
  with `loop 02` at `stopped` with no control (run 2, before ADR-007), then the pill at `stopping` after
  press 1. Presses 1 and 2 wrote levels 1 and 2 through the desktop's own `--stop` spawn (`by.pid 11912`),
  and the loop's own bracket cancelled the session. Not observed live: the grace-then-`taskkill` rung for a
  loop the desktop SPAWNED and that does not answer. The desktop has not spawned a running loop on this
  machine, and ADR-007 gives an attached row no kill rung. That rung's decision is cargo's `stop_step`
  (red-probed under FF-13007), and its shell application is unobserved (F-12). *verifies →* tasks 00–03.
- **130/05 — the register.** The three files under `test/arch/loop/`: **20 ok, 0 not ok**. Every red
  probe is recorded under `## Fitness functions`. *verifies →* tasks 00–01.
- **130/06 — the live stop (`@manual`).** The procedure, every paste and each leg's result are in
  `STATE.md` `## 130/06 · The live stop`. They are not restated here. The legs ran on the test-bed
  `aof-test-repo`, scope `02`, loop `6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11`, 2026-09-23. The payload was
  measured at the source before each run (`aof.exe --version`, `BUILD_ID.json`, both `daemon-started`
  lines after the operator's own restart).
  - PRECONDITION: pass (payload `292f5f0+dirty.20260923T152311`, then `874eef6+dirty.20260923T220812`
    for leg 6). *verifies →* `Scenario: PRECONDITION` and `a wrong build is refused before any
    observation`, rows 1 and 3 (the 2026-09-21 refusal).
  - leg 1, the verb drains: **pass**. Halt `level=1` at 17:17:02Z, record `done`, `Cleared … (honoured, level 1)`.
  - leg 2, the verb cancels: **pass**. Bracket 10 ms after escalation, record `cancelled` /
    `failureReason null` / the bracket's `sessionId`.
  - leg 3, a gap stop: **pass** on the fourth arming. `not live`, honoured 11 ms after the request, the
    next tick halted, no new record.
  - leg 4, no relaunch: **pass** at the source. No row for `<L>` at +17/+30/+60 s, no newer record,
    and the row returned 6.6 s after `--resume`. The operator's visual of the bar was not reported.
  - leg 5, the fleet's two rungs: **pass**. Both rungs went through the `mesh ui` route (`by.pid 23508`),
    and the line was gone 3.3 s after the halt.
  - leg 6, the desktop's row: **finding (F-02), fixed by ADR-007, then pass** on its build. The row
    attached to the console-started loop and wrote both rungs, and no fallback kill ran.
  - a remote loop refused by name: **not exercised** (no loop on the Mac's console, and nothing asked of it).
  - every observation is in STATE.md: **pass**.
  *verifies →* `tasks/00_the-live-stop-read-at-the-source.feature`, every scenario above.

**Design conformance — INCONCLUSIVE, no render attempted.** The renderability precondition fails
before any render. `.aof/aof.config.json` has no `work.ui` block (no `work.ui.baseUrl`, no
`work.ui.renderer`), no `--url` was given, and neither DESIGN surface declares a `Route` (Surface 1 is a
region of the fleet node card, Surface 2 the desktop window's loop bar). No designer or QA session was
spawned. No mock exists (DESIGN §"NO MOCK WAS ELICITED"), so the binding checklists are the baseline.
What exists instead is recorded above as observation, not as a verdict: 04's fixture render and the
operator's live screenshots of both surfaces during 130/06. To close it, declare `work.ui.baseUrl` for
the fleet (`http://127.0.0.1:4181`) plus a `Route` per surface, then re-run the lane.

## Fitness functions

<!-- THE RED-PROBE REGISTER. Every row CITES a declaration in the sibling `ARCHITECTURE.md`
     `## Fitness functions` register and declares nothing of its own. The `red probe` cell records what
     was changed to make the control fail, and the message observed; an untouched placeholder cell is a
     MISSING red probe, never a recorded one. Story 05 landed the files and recorded the probes
     (2026-09-21): each mutation applied in place, the three files run under a fresh isolated home, the
     subject restored byte-for-byte, every control green again after its revert. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13001 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | green (2026-09-21; 3 cases) | **(1)** `function stopPathOf(id) { return path.join(globalMeshPaths().meshRoot, "loop-stops", id); }` added to `src/mesh/declarations.mjs` → TWO cases red, only FF-13001's: *the literal "loop-stops" and the state literals "requested"/"honoured" (as a stop-request state) appear only in src/loop/stop-request.mjs — spelled by: src/loop/stop-request.mjs, src/mesh/declarations.mjs* and *src/mesh/declarations.mjs contains no path.join( whose arguments name meshRoot beside a loop literal — found: path.join(globalMeshPaths().meshRoot, "loop-stops", id)*. **(2) Non-vacuity:** the control's needle `HOME` misspelled in scratch (the module's basename given a trailing `s`, `stop-requests`) → *the sweep finds the module and at least four importers: [the misspelled path] was NOT found, 0 importer(s) resolved (none) — a needle that resolves to nothing is a guard asserting over the empty set, not a clean tree*. Both reverted; green again. |
| FF-13002 | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` | green (2026-09-21; 4 cases) | **(1)** the early `return` re-inserted before `settleDriven` in the shell's post-drive block (the `:1833` shape: `await source.poll(); if (source.level() >= 1) return await haltOnStop(…)` moved above the settle) → THREE cases red, only FF-13002's: structural *for every await drivePhase( site the assigned binding reaches a settleDriven( call before any return in the enclosing block (ADR-003 §3): src/commands/loop.mjs:1658 (runLoopBody) `phaseRun = await drivePhase(`: the binding phaseRun must reach a settleDriven( call before any return in the enclosing block (the FF-12702 enclosing-function rule) — a return stands between the drive and its settle in runLoopBody*, and the fixture legs *the record is cancelled* (left `running`) and *the drive settles done — as it ended*. **(2) Non-vacuity:** the control's drive-site needle misspelled (`drivePhaze` / `retried.recordz`) in scratch → *there are exactly three drive sites — the main site (shell), the in-process retry and the cross to verify (both in the ladder, FF-12602 cited): 0 found. A sweep that finds fewer is reading the wrong needle, not a cleaner tree*. Both reverted; green again. Reading recorded: the register says "in src/commands/loop.mjs … exactly three drive sites"; since 129/04 two of the three live in `src/loop/cycle.mjs`, so the control sweeps the family FF-12602 sweeps and the count holds as cited. |
| FF-13003 | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` | green (2026-09-21; 3 cases) | **(1)** `cli.launch` made to ignore `stop` — `launch: (options) => options.dryRun === true ? null : body` → ONE case red, FF-13003's: *cli.launch's predicate names options.stop — a --stop stays on the probe side exactly as --dry-run does (ADR-002 §1); the predicate reads: launch: (options) => options.dryRun === true*. **(2)** the declaration read re-implemented inside the `/api/mesh/loop-stop` route (`readLoopDeclaration` + `readRuns` + `requestLoopStop` in `ui-serve.mjs`, `stopLoop` no longer imported) → ONE case red, FF-13003's: *stopLoop is defined in src/loop/stop.mjs and imported by exactly src/commands/loop.mjs and src/mesh/ui-serve.mjs — importers found: src/commands/loop.mjs. A face that re-implements the declaration read is a second home for the stop's resolution*. Measured beside it (task 01 ruling 4): the standing `acd-mesh-ui-read-only` and `acd-mesh-ui-no-core-import` stay GREEN on this probe — the face still imports `../loop/stop.mjs` for `STOP_REFUSALS` and the re-implementation reaches only modules the allow-list admits — so FF-13003's importer-set leg is the one guard against a re-implemented route. Both reverted; green again. |
| FF-13004 | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` | green (2026-09-21; 3 cases) | the `stopped: await honouredStops(workspaces),` argument dropped from the producer's `decideSupervisedDeclarations` call in `src/mesh/declarations.mjs` → TWO cases red, only FF-13004's: producer fixture *a honoured request for that loopRunId answers no row — the producer reads the mark through the one module and the engine drops it (ADR-004 §4-§5)* (one row answered), and structural *the producer passes stopped to the engine — the honoured marks ride decideSupervisedDeclarations's input (ADR-004 §4); the call reads: decideSupervisedDeclarations({ workspaces, maxAttempts: …, retryReadiness, })*. The engine fixture (a literal `stopped` Set) stays green, as it should: the engine was not mutated. Reverted; green again. |
| FF-13005 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` | green (2026-09-21; 3 cases) | **(1)** the launcher's `readActiveLoops(` call removed from `src/mesh/launcher.mjs` (`loops.push(...await readActiveLoops(local.items, …))` → `loops.push()`) → ONE case red, FF-13005's: *every src/** module that calls readActiveRuns( also calls readActiveLoops( (ADR-005 §2 — both producers, or the next tick erases the key): src/mesh/launcher.mjs*. **(2) Non-vacuity:** the control's `readActiveRuns(` needle misspelled (`readActiveRunz`) in scratch → *the sweep must find both heartbeat.mjs and launcher.mjs — callers of readActiveRuns( found: none. A sweep that finds fewer is reading the wrong needle, not a cleaner tree*. Both reverted; green again. |
| FF-13006 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` | green (2026-09-21; 3 cases) | **(1)** `loopStopAffordance` rendering the button for every node — `const local = nonEmptyString(localNodeId);` (the `node.nodeId === localNodeId` guard dropped) in `ui/src/fleet/runs.mjs` → ONE case red, FF-13006's: *button: null for node.nodeId !== localNodeId — the fleet renders a Stop only where the card is this node (ADR-005 §5)*. **(2)** the `fetch("/api/mesh/loop-stop"` literal removed from `api.ts` (the URL joined from a constant) — zero in `ui/src/fleet/**`; the exactly-one anchor is the non-vacuity → ONE case red, FF-13006's: *ui/src/fleet/** contains exactly one fetch("/api/mesh/loop-stop" (in api.ts) — found in: none. The one door (ADR-005 §5); zero means the button reaches no route, two means a second caller of the write*. Both reverted; green again. |
| FF-13007 | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` (node leg) + `app/desktop/crates/core/src/supervision.rs` (cargo) | green (2026-09-21; node leg 1 case; cargo 116 passed) | **Node leg:** the argv formed in `supervisor.rs` — `if let Some(argv) = ctl.spec.argv.get(0..3).map(|prefix| { … argv.push("--stop".to_string()); argv })` in place of `stop_argv(&ctl.spec)` → ONE case red, FF-13007's: *supervisor.rs spells no "--stop" literal — the argv is formed in core by stop_argv(child) and never in the shell (ADR-004 §3)*. **Cargo half (130/04's, probed here):** `stop_step`'s `Some(since) if since >= grace_ms => StopStep::Kill` arm mutated to `StopStep::Wait` and `cargo test --manifest-path app/desktop/Cargo.toml` run → *test result: FAILED. 114 passed; 2 failed* — `supervision::tests::stop_step_decides_the_rung_from_presses_the_cancel_clock_the_grace_and_the_exit` panicked at `supervision.rs:893`: *assertion `left == right` failed: stop_step(2, Some(30000), 30000, false) — left: Wait, right: Kill*, and `the_grace_is_a_named_constant_and_its_boundary_is_stated_through_it` at `:906`: *at the grace, the kill — left: Wait, right: Kill*. Both reverted byte-identically; node leg green again, cargo `116 passed; 0 failed`. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | 130/06 run 1: `--stop` addressed a dead 2026-09-10 loop. An operator's `aof work resume` minted an unbriefed retry carrying the prior's whole `brief`, `loop` included, so the resurrected record was the newest declaration in scope. | defect | blocker | blocker — fix | 130/06 (`src/run-store.mjs` `carriedBrief`) | fixed `51cfa6a`; regression in `loop-command-probe` went red with the carry reverted |
| F-02 | 130/06 leg 6: the desktop's controller for a foreground `--supervised` loop's row relaunched it, walled on `duplicate-run` and held a dead `stopped` row, so the desktop could not stop a loop it did not start. | defect | blocker | blocker — fix | 130/04 → ADR-007 "attach on duplicate-run" | fixed `874eef6`; leg 6 re-run passes |
| F-03 | After a `session-needs-input` halt, `--resume` cap-hands the milestone to a refine mint that walls on the same open run. | defect | minor | non-blocker — defer | backlog (loop, story shape) | open |
| F-04 | An operator-gated `@manual`-only story was put in a wave. The 2026-09-21 wave spent a mint and a lane to find out, and died doing so. | process | minor | non-blocker — defer | backlog (loop: `aof work next` holds it `needs-operator`) | open |
| F-05 | The resume sweep offers `130/01 READY` for a lineage whose retry already closed `done`. | defect | minor | non-blocker — defer | backlog (run-store resume sweep) | open |
| F-06 | The failed wave run's rollback moved 130's `SPEC.md` to `not-started` while five stories were `in-review`. | defect | minor | non-blocker — defer | cited as m129/F-68 | open |
| F-07 | The fleet card shows `loop 01 · verify 01 · cycle 3 of 3` with a live `Stop` for a loop that ended. Its needs-input verify run is still `running`, and presence reads liveness off the latest running record. | defect | minor | non-blocker — defer | backlog (presence `readActiveLoops`) | open |
| F-08 | Neither loop surface has an overflow rule: the fleet's loop line truncates at `cycle 1 …` on the card's width, and the desktop bar overflows at ~4 rows at 760px. | design-gap | minor | design-gap — DESIGN rule first | aof-designer (DESIGN §Surface 1/2) | open |
| F-09 | After the desktop's tree kill, nothing is written. The request stays `requested` at level 2, the run stays `running` until stale, and the row stays held until `--resume` (ADR-004's accepted shape). | gap | minor | non-blocker — defer | backlog (ADR-level: an honoured mark after a kill) | open |
| F-10 | The request file's `workspaceId` is `null` on an unpinned checkout, although the fleet route has just resolved it (130/03 review (d); 130/02's contract pins the spelling). | defect | minor | non-blocker — defer | backlog (TECH_DEBT item 4's class) | open |
| F-11 | The fleet face's write routes, now three, lift an uncapped `readJsonBody`. | gap | minor | non-blocker — defer | backlog (face-wide body cap) | open |
| F-12 | The desktop's grace-then-`taskkill` rung for a loop it spawned has no live observation. Its decision is cargo-tested and red-probed. | gap | minor | non-blocker — defer | OUTCOME gap (130/04) | open |
| F-13 | After `Stop`, the fleet's `Stop now` is disabled for one poll with no cue that it is transient. The operator read it as a failed click. The `· cancelling ·` word was not seen: the halt beat the presence refresh. | design-gap | minor | design-gap — DESIGN rule first | aof-designer (DESIGN §Surface 1) | open |
| F-14 | A stop in the between-drives gap (0.3–0.5 s) cannot be aimed by a human, and the loop gives no visible signal of one. Leg 3 is an agent-timed observation. | process | minor | non-blocker — defer | retro (130/06) | recorded |
| F-15 | Gate repair, 137's: four budget rows over by one. 137 (`a297159`) added `src/work/digest-template.mjs` and three suites (`test/bundle`, `test/memory`, `test/work/gate`) without raising them (FF-11904). | defect | blocker (gate) | inherited — repair at owner | 137 (budget table) | fixed at 130's door: four rows raised by one, each stating why |
| F-16 | Gate repair, 137's: the session driver's static reach went 24 → 25 through `src/work.mjs`'s static import of `digest-template.mjs` (FF-5301). | defect | blocker (gate) | inherited — repair at owner | 137 (`src/work.mjs`) | fixed at 130's door: validate's one digest branch defers the import, and the reach is back to 24 |
| F-17 | Gate repair, 137's: `digest-template-ships.test.mjs:94` asserted a derived heading set equal to a literal list (FF-11902). | defect | blocker (gate) | inherited — repair at owner | 137 (`test/bundle`) | fixed at 130's door: one row per heading plus a count, the file's own frontmatter idiom |
| F-18 | Gate repair, 130's: 130/06's `carriedBrief` (`51cfa6a`) moved `isStale`'s export from `src/run-store.mjs:1031` to `:1044`, so two shipped loop records cited the old line (FF-5810). | defect | blocker (gate) | own — repair | 130 (`src/bundle/loops/*.md`, manifest) | fixed: bundle re-pointed and manifest regenerated. The rendered `.aof/loops/` copies await the operator's `aof work update` |
| F-19 | Gate repair: FF-11903 read 61 unresolved citations against 54. Five are in 131's uncommitted docs, which a clean gate does not read. One was 130's own VERIFICATION (a probe's misspelt needle written as a path), now respelt. The rest are 134's refine, citing the modules its build will land. | defect | blocker (gate) | re-pin at the door, argued in the row | 130 (FF-11903's ceiling note) | see the gate row |

## Accept decision

<!-- Written at `aof:verify 130`. -->
