# 129/04 · The wave tick — Outcome

## Delivered

### The per-story post-drive ladder is `settleStoryCycle` in `src/loop/cycle.mjs`
`settleStoryCycle(phaseRun, bookkeeping, ctx, { crossToVerify })` is the one home of the grade delta, the sampler, the review gate, the four bookkeeping maps and the verify cross, parameterised by the workspace it grades in; `src/commands/loop.mjs` reaches `work:grade` and the sampler only through it, is 1,686 lines (2,311 before), and under `sequential` produces byte-identical `LoopState` (ten keys) and `driven` rows (six keys). The gate ladder, `DOCTOR_GATE_CODES`, `haltDecision` and the git helpers stay in the shell and reach the ladder through its options bag; `narrate` and `report` are parameters — neither family module owns a printer.

### `refine_first` is three phases, and BUILD is the wave tick in `src/loop/wave.mjs`
REFINE drives every in-scope story with no tasks, in stream order, then commits the loop's own writes scoped to the in-scope drivers' folders under the mesh identity (skipped when nothing was driven; a git refusal is a `lane-merge-refused` halt with the index restored). BUILD asks `work:next` with `throughReview: true`, hands the answer to `decideWave` minus the lanes it holds and the units set aside, asks `work:dispatch { refs }` to admit the wave, and runs every admitted member as a lane; `done` is the boundary. VERIFY honours a fresh `gate` act on an `in-review` story — validate, doctor, the recorded grade (a successor run's, else the attempt run's ledger) without a re-run — and routes to `verify` or a `continue` re-drive.

### A lane runs its story in its own tree
Each admitted member is opened at the primary's HEAD (a reused lane advanced there through `advanceTo`; a still-fresh running record in it refuses the open by name, a stale one is reclaimed and the lane re-driven from its own tree), its item resolved in the lane, its run minted there with the loop's declaration and `brief.lane`, driven by a child `aof work drive` with the lent id, an isolated home and a deadline of `startToCloseMs + startupGraceMs`, settled against the lane item, graded and gated in the lane workspace, committed on the lane branch, merged home in the primary serially through `mergeDispatchLaneHome`, and cleaned up through `work:dispatch --cleanup`. The primary's story docs hold no record until the merge. Every step is narrated; a cleanup refusal is narrated, never a halt; a halt in one lane drains the others (each committed and merged where it merges) before the loop returns.

### Every refusal of the merge home is one named halt, thrown or returned
`mergeHome` reads `mergeDispatchLaneHome`'s thrown `commit-failed` / `gate-propagation-failed` / `gate-propagation-base-unresolved` as the `refused` shape (`reason` = the code, `merge-home-error` when it has none, the message on `error`), so `mergeHalt` names `lane-merge-refused` / `dispatch:merge-home:refused` for a returned and a thrown refusal alike, and `lane-merge-conflict` for an aborted conflict; the lane stays committed and kept for the resume's reconcile, and the wave run settles `failed`.

### The grade baseline is a property of the base commit
One baseline per wave, measured once in the first lane and keyed by the base sha; `readGradeBaseline({ baseCommit })` answers by sha and by ref, never across the two; every lane's delta is its own; a baseline that cannot be taken degrades once and grades raw; a held member on a new base measures a new one; a resumed loop reads a lane-held baseline back without a rubric run; VERIFY never re-grades; `sequential` keeps the per-story baseline on the primary.

### The wave run carries the loop's liveness
A milestone-level run with `brief.wave` (members, bound, base) is minted in the primary before the first dispatch, heartbeated on the wave interval through the hook's own queue only while a lane is open, settled `done` with the wave and `failed` on a halt, and re-minted after every merge and every mid-epoch admission so each epoch's brief names exactly its lanes and `decideSupervisedDeclarations` lists exactly one row per loop; every lane run's `brief.loop` deep-equals the wave run's except `cycle`; the `driven` rows carry `lane`, `baseCommit`, `merge` and `wave`.

### Admission is dispatch's answer, re-asked after every merge
A held member is dispatched only once the colliding lane merged, from the merged HEAD; refused members are re-asked as lanes close; the bound is narrated from `work:dispatch`'s answer and `wave.mjs` holds no concurrency literal; `at-capacity` with own lanes in flight waits, with none in flight halts `lane-open-failed` / `work:dispatch:at-capacity` naming the foreign holders and the remedy; an empty dispatch with held members is dependency-blocked with nothing in flight and waits with a lane in flight.

### Signals, the parent deadline and the resume
The first `SIGINT`/`SIGTERM` drains and halts `operator-interrupt`; the second ends every child's stdin, settles each lane run `cancelled` and halts the same way; a child past the parent deadline is settled `timeout` and retried in its lane under the lineage budget; `--resume` reconciles every live lane under the dispatch root in order before the first ask — a stale running run reclaimed and re-driven from its tree, a committed unmerged tip merged, an ancestor tip cleaned up, dirt committed first, an unclassifiable or out-of-scope lane narrated and left — and re-mints its wave run without retrying it as the milestone's act.

### The loop is a declared supplier of the lane opener, behind the door
`69/FF-6907` admits `src/loop/wave.mjs` by name and reason: its `resolveDispatchLane(` call sits inside `openLane`, the function it binds onto `ctx.runDispatchLane` for `work:dispatch` to call inside the admission lock and pool; a call outside that function, a binding with no `work:dispatch` ask, or an undeclared supplier is each a named finding, and the door count stays the door's alone.

## Assumptions

- **Lanes are cut after the own-writes commit that carries the wave run's mint** — so the first merge of a wave is a fast-forward and the lanes' base is one commit past the HEAD the wave brief names.
- **The seams are honoured by every caller** — `ctx.invokeRegistered`, `ctx.spawnLaneDrive`, `ctx.waveTimers`, `ctx.signalSource` and `ctx.now` are the family's injectable surface; production passes none and gets the real registry, child, timers, process signals and clock.
- **A progress-continuation re-drive does not advance the cycle** — a first failing grade re-drives from the PROGRESS rung at the same cycle, and the second record carries the first's grade.
- **A child that answers `aborted` under no signal is an operator interrupt** — halted `operator-interrupt` / `driver:aborted`, never re-dispatched.
- **A wave whose every member is live in a lane another process heartbeats is a named open refusal** — `lane-open-failed` / `run-store:duplicate-run`, never a poll.
- **The cancel channel is the child's stdin, ended** — with `LANE_CANCEL_GRACE_MS` (10 s) before the kill; a cancel landing inside the child's startup window is 02's arming order to honour.

## Gaps

### The family's structural invariants have no register control yet
- **Status:** open
- **Discharge condition:** `129/05` lands `FF-12901`–`FF-12907` under `test/arch/loop/` (and extends `FF-12904`'s sweep over `dispatch.mjs`, `wave.mjs`, `cycle.mjs`), each red on contact.
The mode's single home, the family's child-process boundary, the read-never-recomputed wave, lane-owned records, one declaration, lane-scoped grades and merge-never-discards hold by the delivered suites and by inspection; no arch control asserts them.

### A startup-window cancel may be dropped
- **Status:** open
- **Discharge condition:** `129/06`'s live run measures a second signal landing during a child's spawn window; if the child runs on, `src/commands/drive.mjs` arms on a pipe stdin only and treats any `end` as the cancel (`m129/02/F-15`).
The parent ends stdin on the second signal; whether the child honours an `end` seen before its PTY is live is the child's arming order, untouched here.

### The lane fixture's one home
- **Status:** open
- **Discharge condition:** the next story touching 03's suites folds `withMoveFixture` / `withDirtyPolicyFixture` and the `writeRel` / `mergeHeadAbsent` / `conflictMarkers` helpers onto `test/support/dispatch-lane-fixture.mjs` (`m129/03/F-39`, routed to `129/05`).
04's fixture lives under `test/support/loop/lane-fixture.mjs`; 03's three suites still carry their own copies.

### No real wave has run
- **Status:** open
- **Discharge condition:** `129/06` switches `work.loop.concurrency` to `refine_first` here and drives one real `aof work loop` over a two-member wave with a held third, every SPEC outcome read at the source.
Every row is driven through the injected child, registry, timers and signals over a real git fixture; no `claude` has been spawned in a lane by this code.
