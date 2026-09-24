---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 129 · Loop concurrency — Architecture

The SPEC made the design decision — the unit of concurrency is a WORKTREE, the loop reads the wave
it already has, and every measured 127 defect is a form of two sessions sharing one checkout. These
ADRs answer the SPEC's six questions in its order, preceded by the mode question (Q0) the brief
adds, and they decide HOW: which existing verb does each job, which tree owns each record, what a
child process is for, and where the new code lives. They do not re-litigate the thesis.

## Memory recall — what was surfaced, and what it changed

`aof work memory recall "loop concurrency worktree lanes merge-back grading per lane child process"
--area architecture --block`, run before the first ADR. Five records returned; each honoured or
departed from in writing.

- **`71/ADR-006`** (*review lanes are spawned concurrently with a small stagger, and execution mode
  is read off the wave rather than off static config*) → **HONOURED at its own grain, DEPARTED FROM
  at the loop's (ADR-001 §5).** The wave is READ off `work:next`'s answer and never recomputed
  (FF-12906). But `decideExecutionMode`'s "solo wins, wave of one is inline" derivation governs
  whether the PROSE orchestrator spawns role agents into worktrees; it has zero readers in `src/`
  (graph, below) and the loop does not consult it for the lane decision. Under `refine_first` the
  loop fans out every wave into lanes — a wave of one included — because the lane buys isolation
  from the operator's tree, which 127 measured as necessary even for one story. `work.agents.mode`
  keeps exactly its existing meaning: what the session INSIDE a lane spawns.
- **`52/ADR-007`** (*the five checks are PURE functions over the parsed model … land ONLY in
  `work:loops validate`*) → **HONOURED as the engine rule.** Every decision this milestone adds —
  which members to dispatch, how an `in-review` story routes, which stop a merge failure is — lands
  in `src/work/loop.mjs`, which imports nothing (`acd-clock-counts-attempts:194` asserts it) and
  reads no disk, clock or environment. Git, child processes and the heartbeat clock live in
  `src/loop/` and the existing leaves.
- **`36/ADR-002`** (*spawn + watchdog + restart with backoff, behind a kill-on-close containment
  seam; role-driven supervision set*) → **HONOURED by shape, not by import.** A lane's drive is a
  child process the loop watches (exit, deadline, cancel) exactly as the desktop supervisor watches
  its daemons (ADR-005); the containment is the child's own `terminateTree` and the parent's grace
  kill, never a second Job Object. Restart-with-backoff is NOT copied: a lane that dies re-enters
  the existing run-store retry ladder (`runtime_offline`, capped by `maxAttempts`), which is the
  loop's one restart policy.
- **`53/ADR-008`** (*`autonomous.md` is a shell-out; "proven" is a named `@manual` soak lane; no
  new `/aof:*` wrapper*) → **HONOURED, and it shapes story 06.** The live run of 129 on 127 is an
  `@manual` lane, not a test. `autonomous.md` gains one sentence naming `work.loop.concurrency`
  (FF-7101 leg (a) holds because the key resolves through the bounds home) and no new wrapper
  ships — `aof work loop` is the one door and gains no flag for the mode.
- **`124/ADR-002`** (*the advisory lane is the mechanism; "never gates" is a class claim*) →
  **HONOURED.** Nothing here reads the graph, the loop document or an advisory lane into a gate.
  The three new stops are decided by git's own answers (conflict, refused precondition, a lane that
  could not open), never by an advisory.

## Measured facts this document reasons from

Measured 2026-09-12 on the working tree at `2321dce8` plus the uncommitted loop fixes (graph built
`2026-09-12T21:14:48Z`, 16,559 nodes, 40,406 edges, egress none — `aof graph build .`). Cited as
actual structure, not inference. `aof work debt <files>` could not run in this tree (127/02's
in-flight `insert-shared.mjs` change breaks its import); the ledger was grepped by hand.

| claim | value | source |
|---|---|---|
| `src/commands/loop.mjs` | **2,311** lines; src dependents **1** (`command-core.mjs`), test dependents **40**; it already imports `node:child_process` (`execFile`, `:14`) | `wc`, `aof graph impact` |
| `src/work/loop.mjs` (the engine) | **1,450** lines, **0** import statements — the graph's two "deps" are comment citations; src dependents 8 (`commands/loop`, `run-status`, `trigger`, `mesh/assignment-directive`, `mesh/declarations`, `work-trigger/*`) | `grep ^import`, `aof graph impact` |
| `decideExecutionMode` readers in src | **0** — exported, tested (`test/work/story-context-contract.test.mjs`), consumed by nothing | `grep -rl` |
| `src/mesh/worktree.mjs` | 964 lines; src dependents **10**, incl. `src/work/dispatch.mjs`, `src/commands/grade.mjs`, `src/mesh/worker-execution.mjs` | `aof graph impact` |
| `src/work/dispatch.mjs` | 582 lines; deps `degrade`, `mesh/launcher-lock`, `mesh/worktree`; src dependents 4 (`commands/dispatch`, `commands/mesh/terminal-resume`, `loop-progress`, `mesh/assignment-reclaim`) | `aof graph impact` |
| `commitWorktreeChanges` | defined `src/mesh/worker-execution.mjs:462`; callers **2**, both in that file (`:1420`, `:1944`); its name is in the frozen export list at `test/arch/session/acd-session-driver-single-home.test.mjs:91` | `grep` |
| `advanceBranchToBase` | `src/mesh/worktree.mjs:766-894`: merges `commit` INTO the branch checked out at `worktreePath` — direction-agnostic; four doors (already-current, dirty refusal, ff-only, `merge --no-ff` with abort-on-conflict) | read |
| the wave on the `work:next` answer | `wave`/`heldSet` ride every answer (`src/commands/next.mjs:36-50`); `throughReview` is an input the loop never passes (`nextDecision`, `loop.mjs:991`) | read |
| `decideLoopPhase` status blindness | reads `next.type`, `tasks`, `gate`, `lastPhase`; never `next.status`, which the answer already carries (`ready(story, status)`) | `src/work/loop.mjs:1056-1132` |
| the shell on a fresh `gate` act | halts `unmapped-item-type` (`loop.mjs:1631`) — a gate is only ever produced after a continue | read |
| `LOOP_STOPS` | 12 members, frozen, deep-equalled against a literal in `acd-loop-probe-contract:100` | read |
| `runBounded` | `src/work-audit/spawn.mjs:137`: no shell, `stdio ["ignore","pipe","pipe"]`, outcomes `not-started` / `deadline-expired` / `exited`; kill is SIGKILL on deadline only; zero imports | read |
| the driver's external kill seam | `options.onPtyLive(kill, write)` (`agent-session-driver.mjs:957`), the withdraw path's own | read |
| heartbeat queue | `runs/.heartbeats.ndjson`, `{runId, at}` per line; consumed DESTRUCTIVELY into `record.heartbeatAt` by `consumeHeartbeatQueue` (rename → batch → rm); the supervisor reads records only (`declarations.mjs:55`) | read |
| run records in this checkout | node-partitioned `runs/<node>/<runId>.json`, NOT ignored, UNTRACKED (`??`) — nobody commits them on the control node | `git status`, `git check-ignore` |
| the primary's dirt | **130** files in `git status --porcelain`, 10 under `wiki/work/`; it includes the uncommitted loop fixes and 127/01's build | `git status` |
| retryable failure reasons | `runtime_offline`, `timeout`, `session_limit`; anything else fails closed | `src/run-store.mjs:311` |
| `work.agents.mode` in this repo | `"orchestrated"`; `work.loop` sets `startToCloseMs` 4h, `scheduleToCloseMs` 12h; `work.dispatch.concurrency` unset (bound 3) | `.aof/aof.config.json` |
| the tuner on a non-numeric knob | `ordinalityOf` refuses a non-integer `from`/`to` as `NOT_AN_ORDINAL_KNOB`; `ladderFor` probes integers 0..1024 and finds none; `declaredBoundValues` keeps numbers only | `src/work-acceptor/rule.mjs:357`, `:414`; `src/work-audit/declared-bounds.mjs:104` |
| `loopBoundsFromConfig` | eight explicit keys, never a spread of the resolver map — a ninth resolver does not leak into `deadlinePolicy` | `src/loop-bounds.mjs:125` |
| the budget predicate | `measured === ceiling` in BOTH directions; a flat layer under `src/` owes a row or an exemption; an exemption is admitted at ≤ 8 children and is re-checked every run; `src/work-acceptor` (6), `src/work-promote`, `src/work-trigger`, `src/work-tune` are exempt subject families | `acd-source-directory-budget.test.mjs:646-720`, `:583` |
| arch directories at ceiling | `test/arch/loop` 54/54, `test/arch/work` 46/46, `test/arch/grade` 24/24 | `ls`, the table |
| FF-12602's needles | `acd-loop-narrates-in-flight` asserts `Baseline work:grade`, `Gate work:grade`, `Driving`, `Retrying` … are on `narrate` INSIDE `src/commands/loop.mjs` | `:97-112` |
| 119/ADR-009's own precedent | "a sequential handoff on one control file across stories 2 → 3 → 4, declared here so the partition holds it" — the budget file was an accepted serialisation point once | 119/ARCHITECTURE.md |

---

## ADR-001 — Concurrency is a MODE with one home; the loop owns the fan-out

<!-- Heading shortened at 127's accept (2026-09-16): the refine brief's architecture slice carries each declared ADR's heading, and at this milestone's heading lengths the slice was budget-truncated past the ids its stories declare (127/VERIFICATION). The original sentence is the lede below; the id and every citation are unchanged. -->

**`work.loop.concurrency` is a MODE with one home; `refine_first` is three phases over a `--through-review` walk; the engine routes on status; the loop owns the fan-out**

### Context

The SPEC names the key and its two values. Every `work.loop.*` key resolves in `src/loop-bounds.mjs`
(69/ADR-001, FF-6901) through a VALUE-shaped resolver so `rangeProbe` and FF-7101 can answer for it
— and every existing resolver is numeric. 127 measured that a restarted loop re-drives `continue`
on an `in-review` story because the engine never reads status and `lastPhase` is in-process only,
and that the walk asks `work:next <NN>` without `--through-review`, so it never sees the 02/04 wave.
The SPEC also proposes that under `refine_first` the execution path follows `work.agents.mode`.

### Decision

1. **The key resolves in the bounds home as a mode.** `src/loop-bounds.mjs` exports
   `LOOP_CONCURRENCY_MODES = ["sequential", "refine_first"]`, `DEFAULT_LOOP_CONCURRENCY =
   "sequential"`, `resolveLoopConcurrency(value)` (a member verbatim, anything else → the default,
   never a throw) and `loopConcurrencyFromConfig(workspace)`. Both join their maps —
   `"work.loop.concurrency": resolveLoopConcurrency` / `loopConcurrencyFromConfig` — so FF-6111's
   two-way key equality holds and `rangeProbe(key, p)` answers `resolve(p) === p` iff `p` is a mode.
   It is NOT added to `loopBoundsFromConfig` (that object is the driver's deadline policy).
   `src/loop-record.mjs`'s `configBound` gains the same `Number.isSafeInteger` guard on a resolver's
   answer that it already applies to raw keys, so a loop record citing the mode as a `ceiling:`
   reads `unknown` rather than a string. The tuner needs nothing: a non-numeric step is already
   `NOT_AN_ORDINAL_KNOB`.
   *Amended 2026-09-13 at 129/01's review close (all three lenses):* the projection is `state:
   "bounded"`, `bound: null`, `comparison: null` — never `unknown`. `ceilingOf` (78/ADR-004) reserves
   `unknown` for a record that DECLARES it; a declared pointer the projection cannot number is a
   bound with no number on it, as a `module:` pointer already projects. The locked feature (task
   00) and the code say so; this sentence was the drift.
2. **`sequential` (unset) is today's loop** — one act per tick in the primary — with exactly one
   change, the status routing in §4, which the SPEC lists as a defect to close and which is
   mode-independent.
3. **`refine_first` is three phases, in order, each a walk of `work:next`:**
   - **REFINE** — while any in-scope story lacks tasks (or the milestone has zero stories), drive
     `refine` on it in the PRIMARY, sequentially, as today. Then the loop commits its own writes
     (ADR-002 §2) so the lanes, which are cut from HEAD, see the contracts.
   - **BUILD** — `work:next { scope, throughReview: true }` until its `readySet` is empty or its
     state is `done`; each answer's `wave` (minus live lanes and set-aside refs) is what the loop
     asks `work:dispatch` to admit (ADR-006); every admitted member is driven in its lane (ADR-004,
     ADR-005), graded there (ADR-003), merged home (ADR-002); after every merge the loop re-asks.
   - **VERIFY** — `work:next { scope }` (no through-review): each `in-review` story routes to the
     gate (§4) then `verify`, then the milestone, sequentially in the PRIMARY, as today.
4. **The engine routes on status.** `decideLoopPhase` reads `input.next.status` — present on every
   `work:next` answer already, so no new input — and an `in-review` story with tasks returns
   `{ act: "gate", ref, command: "work:validate" }` whatever `lastPhase` says. The shell honours a
   `gate` act from a FRESH decision (today it halts `unmapped-item-type`): it runs validate + doctor
   and reads the RECORDED grade (`work:grade` without `--run`); clean → `verify`; findings → the
   existing review-gate decision and a `continue` re-drive. Two additive engine inputs carry the
   mode: `concurrency` (the resolved mode) and `unrefined` (in-scope stories with no tasks, not
   done, in stream order); under `refine_first` a non-empty `unrefined` makes the engine answer
   `drive refine <unrefined[0]>` ahead of the head. A `next.state === "done"` answer under a
   through-review walk means "build phase complete", never "milestone accepted" — the shell reads
   it as the phase boundary.
5. **The loop owns the fan-out; `work.agents.mode` governs only the session inside a lane.**
   Under `refine_first` EVERY build drive runs in a lane — a wave of one included — and the loop
   never drives the milestone-level `/aof:continue <NN>` orchestrator. A lane's child drives
   `/aof:continue <NN>/<SS>`, whose session spawns role agents or plays them inline exactly as that
   key already decides for a story session. This DEPARTS from the SPEC's scope sentence ("under
   `refine_first`, execution follows `work.agents.mode`: orchestrated → the loop drives the
   milestone") and needs the PO's ratification at break-down. Reasons, each measured: (a) the
   orchestrated path is a SECOND home for wave fan-out and merge-back, and the SPEC's own table says
   that home merges by prose and never by code; (b) a grade over the primary leaks the operator's
   CONCURRENT edits at any grain — 130 dirty files today, six of seven reds foreign in 127/01 — and
   only a lane closes that; (c) this repo is `orchestrated`, so the SPEC's verifiable outcome ("02
   and 04 in lanes, each with its own grade") would be unreachable here without flipping every
   story session to solo. 71/ADR-006's asymmetry ("never adds a fan-out against a solo setting") is
   about AGENT fan-out inside a session and is preserved there; the lane is process isolation the
   operator opted into with a different key.
   **AMENDED 2026-09-15 (129/07, the operator's sign-off of the configuration surface)** — the
   loop's settings are SELF-CONTAINED under `work.loop`, and the role mode of each driven phase is
   the loop's own decision: `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode`
   (`solo` | `orchestrated`, resolved in the bounds home beside the mode, `null` when unset) are
   what the DRIVE composes onto the phase command — `--solo` or `--orchestrated`, the latter the
   twin `refine.md` / `continue.md` gained for the other direction — and the two phases are
   independent of each other and of the workspace default. When a phase's key is UNSET the drive
   composes no flag and the prompt's own read of `work.agents.mode` is the fallback, byte for byte
   as before; `verify` resolves no mode. The drive never reads `work.agents.mode` itself (69/ADR-001:
   the bounds home declares `work.loop.*` keys and nothing else, so the twin is read by the consumer
   that already reads it). 71/ADR-006's asymmetry is unchanged for the SESSION's own derivation; an
   explicit per-phase `orchestrated` under a solo workspace is the operator's configured decision
   for the loop, not a derivation adding a fan-out.
6. **Interleaved is considered and deferred**, as an additive third value. The wave partition is
   meaningful only over refined stories (`declaredWriteSet` is null for an unauthored `files:`, so
   the first unrefined member runs alone and the rest are held — `ready-wave.mjs:34-44`), which
   degrades interleaving to serial; refine-first is what locks N contracts before N lanes read them.
7. **Ruling on TECH_DEBT item 91** (the engine is never told the cycle): the ENGINE decides and the
   SHELL hands it facts — status and phase this milestone (§4), the cycle map when the 124/01 plan
   hand-off is next touched. Item 91 stays open with its `cycle` leg only.

### Alternatives considered

- The SPEC's mode split (orchestrated → milestone drive; solo → loop lanes) — rejected in §5.
- A `--concurrency` flag on `aof work loop` — rejected: the resume argv is `argvFor(route, {scope,
  level}, {resume})` and a flag would have to be reconstructed on every relaunch; config is durable.
- A numeric `work.loop.concurrency` (lanes at once) — rejected: a second concurrency number
  (ADR-006); the bound is dispatch's.
- Reconstruct `lastPhase` from run records on resume instead of reading status — rejected: the
  record says what the loop DID, the status says what the story IS; a story moved by hand to
  `in-review` has no record and still must not be re-built.

### Consequences

One key, one home, one mode literal outside the home (the engine's branch). An unset key is
byte-identical except for §4. The `.feature`-level observables — the phase order, the through-review
walk ending at "every story in-review", an `in-review` story never re-driven — are stories 01's and
04's; the single-home and read-never-recompute properties are FF-12901 and FF-12906.

### Invariant

`work.loop.concurrency` resolves in exactly one src module and is a mode, not a number; the loop
family reads `wave`/`heldSet` only off the `work:next` answer. *(129/07)* `work.loop.agents.<phase>.mode`
resolves in that same module and reaches a session only as the flag the drive composes.

---

## ADR-002 — The loop merges each lane home, serially, through the one merge verb

**The LOOP merges each lane home in the primary, serially, through the mesh's one merge verb; conflict and dirt are named stops, never a half-merged tree**

### Context

N lanes are N `aof/mesh/<ref>` branches. Nothing in code merges a dispatch lane today
(`continue.md:166` does it by prose). `advanceBranchToBase` already holds the four doors and the
never-discard discipline (m43/ADR-008, `acd-gate-propagation-never-discards`), and it is
direction-agnostic: it advances the branch checked out at `cwd` to include `commit`. The primary is
the operator's live tree with 130 dirty files.

### Decision

1. **The loop merges, in the primary checkout, serially, in lane-completion order**, by calling
   `advanceBranchToBase(primaryRoot, <lane tip sha>, { dirtyPolicy: "touched-paths", message, node })`
   — the SAME verb, not a twin: door 1 (tip already an ancestor) is the resume's "already merged";
   door 3 (HEAD strictly behind the tip) is the common fast-forward when the primary did not move;
   door 4 is a real `merge --no-ff --no-edit` under the mesh identity when it did. The verb gains
   ONE additive option: `dirtyPolicy`, default `"strict"` (today's door 2, unchanged for the mesh),
   or `"touched-paths"` — the paths in `git diff --name-only HEAD <tip>` intersected with the
   porcelain's paths must be empty, else the refusal names them. Git enforces the same rule itself
   ("your local changes would be overwritten"); computing it first keeps the refusal RETURNED, never
   thrown, with the tree untouched — the verb's own discipline.
2. **Two preconditions the loop meets before asking.** The primary is on a branch (`symbolic-ref
   HEAD` answers; detached → `lane-merge-refused`). The loop's OWN primary-tree writes are committed
   first: at the end of REFINE and before each merge it runs `git add -- wiki/work/<milestone dir>`
   + `commit --no-verify` under the mesh identity with an `aof(loop): …` message, scoped to the
   milestone's folder and nothing else (record docs, run records of the refine/verify/wave runs).
   What remains dirty is the operator's; it blocks a merge only where the lane touched the same
   path, and then the stop is `lane-merge-refused` naming the files — commit or stash them and
   `--resume`.
3. **Conflict → `merge --abort` → halt `lane-merge-conflict`** naming lane, branch, base and tip.
   The lane worktree and branch are kept intact; the operator merges by hand and `--resume`s; the
   resume reconciliation (ADR-007 §4) reads the hand-merged tip as door 1 and cleans up.
4. **A held story is based on the merged work by construction.** After every merge the loop
   re-asks `work:next --through-review` and `work:dispatch`; 127/03 is admitted only once 02's
   lane has merged, and its lane is cut from the primary's HEAD at that instant.
5. **`.gitattributes` gains exactly one line: `wiki/work/**/STATE.md merge=union`.** STATE.md is
   append-only narrative whose frontmatter is `doc: state` alone (no `updated:` line to duplicate);
   two lanes appending to `## Notes`/`## Feedback` at the same base is the COMMON case and union
   keeps both. Nothing else gets union: `TECH_DEBT.md` entries carry `## N.` numbers a union would
   duplicate, `VERIFICATION.md` is a single-writer register, `loops.md` is a byte-compared
   projection — those conflicts halt and are rare. The attribute touches neither `text` nor `eol`,
   so `acd-runs-eol-pinned`'s `unspecified` control file stays unspecified.
6. **After a clean merge** the lane is closed through `work:dispatch --cleanup <ref>` (`--remove`,
   the branch is merged) so `settleLaneProjectionEffects` drains the lane's `publish-projection`
   steps before removal — the existing convergence gate, not a new one.
7. **A lane opened on an EXISTING branch is advanced to HEAD first** — `advanceBranchToBase(lane,
   HEAD)`, the mesh's continuing-item door — so its base is the current primary and never a stale
   tip left by an earlier dispatch; a conflict there is `lane-open-failed`.

### Alternatives considered

- Strict clean-tree (`status --porcelain` empty) for the primary — rejected: with the loop's own
  writes committed the remaining dirt is the operator's concurrent work, and refusing on files the
  merge never touches would make the live soak impossible on this tree; the mesh keeps strict
  because a worker's tree is nobody's desk.
- The lane pulls the primary before merging (the mesh's direction) — rejected: it makes the lane's
  tip carry the operator's later commits and the merge commit land on the lane branch; the primary
  is the branch the operator ships.
- Rebase or squash — forbidden by `acd-gate-propagation-never-discards`; a squash also loses the
  lane's per-run commits that the run records cite.
- `merge=union` on every record doc — rejected in §5.
- Halt on every STATE.md conflict — rejected: two lanes, two feedback appends, one halt per wave.

### Consequences

`src/mesh/worktree.mjs` gains one option and ~15 lines; no new git verb exists anywhere. The
primary's branch gains commits authored by the mesh identity — which is what a worker node's push
already does — and never a rewrite. FF-12904 extends the never-discards sweep over the two modules
that now call the verb.

### Invariant

No module on the merge-home path contains `rebase`, `push --force`, `reset --hard`, `checkout -B`,
`branch -f` or `update-ref refs/heads`; every `merge` has an `--abort` beside it.

---

## ADR-003 — The grade baseline belongs to the base commit; lanes grade in their own tree

**The grade baseline is a property of the BASE COMMIT, measured once per wave in a lane; every lane's grade and gate run in the lane's own workspace**

### Context

`brief.gradeBaseline` is per story on one tree (`loop.mjs:1726-1748`) and the delta is applied by
`applyGradeBaseline` (`:1955`). 127/01 stalled six rounds on seven reds, six not its own, because
the rubric ran over the shared checkout. A rubric run is ~8 minutes here.

### Decision

1. **One baseline per base commit.** The first lane admitted on a base (a clean checkout of HEAD
   after prepare — never the primary, whose dirt would leak reds no lane has) measures
   `work:grade --run` before its child is spawned; the result is keyed by sha in `gradeBaselines`
   and persisted on every lane run of that wave as `brief.gradeBaseline` with the additive
   `baseCommit`. `readGradeBaseline` gains a `{ baseCommit }` selector beside `ref`, so a resume
   reads it back by sha across stories. A lane whose post-drive grade needs a baseline still in
   flight awaits the same promise; no lane's child is held for it.
2. **Every grade and gate of a lane runs in the lane.** The per-story ladder (ADR-008 §3) receives a
   ctx whose `workspace` is `loadWorkspace(lanePath)`; `work:grade` resolves the item inside the
   lane and `planRubric` spawns in `ctx.workspace.projectRoot` = the lane; validate and doctor
   likewise. A lane's delta is therefore its own reds only — the 127 deadlock class closes by
   construction. The progress sampler samples the lane (`worktreePath: lanePath`,
   `baseCommit: <lane base>`), so `filesTouched` is the lane's.
3. **Cost, stated:** one baseline per wave plus one rubric per completed drive per lane, ~8 min
   each, and concurrent lanes contend for CPU on one machine. The lever is the bound (ADR-006),
   never a shortcut in the grade.
4. **The VERIFY phase does not re-grade.** Its gate over an `in-review` story is validate + doctor +
   the RECORDED grade (the lane's, arrived by merge). A re-run over the merged primary would carry
   sibling merges' reds to a story that cannot fix them — the defect in a new coat. The milestone
   drive carries no loop grade today and gains none; `aof:verify <NN>`'s own ceremony runs the
   gates over the merged tree, which is the integration judgement's proper home.
5. **`sequential` keeps today's per-story baseline on the primary**, byte-identical.

### Alternatives considered

- Per-story baseline in each lane — rejected: N × 8 minutes for one fact about one commit.
- Story-scoped rubric selection (grade only the story's declared suites) — rejected here: it is a
  different instrument with its own false-green argument, and the lane already isolates.
- Skip the baseline in lanes ("a fresh checkout has no foreign reds") — rejected: HEAD's own reds
  are inherited by every lane and must be excluded, exactly as today.

### Consequences

`gradeBaselines` changes key (ref → sha) on the lane path only. FF-12905 holds that no grade, gate or
sampler invocation in the loop family names the primary's root.

### Invariant

Every `work:grade` / `work:validate` / `work:doctor` / `recordBuildProgress` invocation in
`src/loop/**` passes the lane's workspace or worktree path, never `process.cwd()` and never the
loop's own `ctx.workspace.projectRoot`.

---

## ADR-004 — The tree that commits the change owns the record

**The tree that commits the change owns the record: a lane's run is minted, heartbeated, settled and committed IN the lane; `driven` rows gain additive keys**

### Context

`startedHere` (`continue.mjs:160-190`) states the rule the mesh already lives by: a control-side
write of a status the worker's tree also writes hands the branch a conflict over one line.
`resolveDrivenRun` (`resolve.mjs:91-124`) matches by REF, not directory, so a session inside a
worktree recognises a record minted under the same ref. `LoopState` is ten keys, `brief.loop` nine,
the run record sixteen; `driven` rows are the one additive place.

### Decision

1. **Per lane, in this order:** open (ADR-006, ADR-002 §7) → `resolveRefInWorktree(primaryRoot,
   workDir, lanePath, ref)` → `transitionRunStart(laneItem, { brief, node, now }, opts)` → lend the
   id to the child (ADR-005) → `settleDriven(laneRun)` with the lane item → the ladder in the lane
   (ADR-003) → `commitWorktreeChanges(lanePath)` → merge (ADR-002) → cleanup. The primary's copy of
   the story's docs is not written while the lane is open; the `run.started` / `run.completed`
   reactors move the LANE's STORY.md, and the merge brings status, VERIFICATION.md and the run
   records home together.
2. **The brief.** `brief.loop` carries the same nine keys as every run of this loop (same
   `loopRunId`, `scope`, `level`, `cap`, `phase: "continue"`, `cycle`, `startedAt`, `id`,
   `supervised`) — a lane run IS a run of this loop. Additive: `brief.lane: { worktree, branch,
   baseCommit }` and `brief.gradeBaseline.baseCommit` (ADR-003). The mint's `opts.workspace` is the
   lane workspace, so the publish reactor keys its `publish-projection` step to the lane root —
   which is what `settleLaneProjectionEffects` matches at cleanup — and `opts.lock` is the primary's
   lock context, so the item lock holds across trees.
3. **Heartbeats land where the record is.** The child's driver exports `AOF_RUN_ITEM_DIR` = the
   lane's item dir (it resolved the item under its own cwd) and `AOF_RUN_ID` = the lent id; the
   hooks append to the lane's queue; the child's `readHeartbeatAt` consumes it into the lane's
   record; the agent's `run-start`/`run-complete` yield to the lent run through `resolveDrivenRun`.
   The queue is consumed destructively at settle, so nothing of it is committed.
4. **Settle.** The child returns its `settlementContext` (projects dir keyed by the lane cwd,
   transcript baseline) on its JSON result; `settleDriven` runs against the lane item with it,
   spend included. A child that exits without a document settles `failed / runtime_offline`
   (retryable — the existing ladder re-spawns in the SAME lane, door 2 reuse); a child the parent
   killed on its own deadline settles `failed / timeout`; a child cancelled by the operator
   (ADR-005 §4) settles `cancelled`. No new failure reason is minted.
5. **The lane is committed after settle + gate + grade**, through `commitWorktreeChanges` (a clean
   tree is a no-op), so the record docs and run records ride the lane branch and arrive in the
   primary by the merge. This is the worker's discipline (`worker-execution.mjs:1420`) applied to a
   local lane.
6. **`driven` rows gain additive keys** on the lane path: `lane: { worktree, branch }`,
   `baseCommit`, `merge: { outcome, commit }` (`fast-forwarded` / `merged` / `already-current` /
   `refused` / `conflict`). The wave run (ADR-007 §2) is a row with `ref: <milestone>`, `phase:
   "continue"` and `wave: { members, bound }`. Existing keys keep their names and meanings;
   `sequential` rows are byte-identical.
7. **`LoopState` stays ten keys, `brief.loop` nine, the record sixteen.** The standing controls
   (`acd-loop-probe-contract`, `acd-loop-state-rides-the-run-record`) hold it; this milestone
   declares no twin.

### Alternatives considered

- Mint in the primary and let the child heartbeat there — rejected: the lane's `run.started`
  reactor would still move the lane's STORY.md, and the primary's record would be settled from a
  tree that never saw the work; two trees, one record, the `startedHere` conflict by design.
- The child mints and settles (`ownsRun`) — rejected: the loop carries the declaration, the cycle
  and the grade on the brief, and a child that mints cannot carry them; `--run` is the lent id the
  drive already honours.
- A `.gitignore` for `.heartbeats.ndjson` — not needed; the queue is consumed before the commit.

### Consequences

Nothing on the primary's story dirs is written during the wave. The 127 defect "the sampler
charges the whole checkout to one run" closes because the sample is the lane's. FF-12903 holds
the ownership rule structurally and over a fixture.

### Invariant

No `transitionRunStart` / `transitionRunComplete` in `src/loop/**` whose brief carries `lane`
targets an item whose `dir` is under the primary root; the wave run is the only primary-tree mint
on the build path.

---

## ADR-005 — A lane's drive is a CHILD `aof work drive` process

**A lane's drive is a CHILD `aof work drive` process: one JSON document, a lent run, stdin as the cancel channel, a parent-side deadline as belt-and-braces**

### Context

Three loop deaths on 2026-09-12 happened at the driver's kill of a finished session inside the
loop's own process. N PTY drivers in one process would multiply that surface by N. `runBounded`
(`spawn.mjs:137`) is the tree's shell-less bounded child; the `--json` face emits exactly one
document (`face.mjs:230`); `work:drive-<phase>` already runs under a lent id when
`ctx.loopDrive.runId` is set. Windows delivers no POSIX signal to a child.

### Decision

1. **Per lane the loop spawns** `process.execPath` with `[<this tree's src/cli.mjs>, "work",
   "drive", "continue", <ref>, "--run", <runId>, ("--fix", <file>)?, "--json"]`, `cwd` = the lane,
   env inherited (`AOF_GLOBAL_HOME` included), through `runBounded` — no shell, ever. The parent
   reads EXACTLY ONE JSON document from stdout; a non-zero exit without one is `{ outcome:
   "failed", failureReason: "runtime_offline" }` and the last lines of stderr ride the narration.
   `runBounded` gains three additive options: `signal` (an `AbortSignal`), `graceMs`, and
   `stdin: "pipe"`; an abort ends the child's stdin, waits `graceMs`, then kills; the outcome is
   `"aborted"`. Existing callers pass none and are byte-identical.

   **AMENDED 2026-09-13 (129/02 review)** — the argument vector depends on WHAT `process.execPath`
   IS, and this clause first wrote it for only one of the two answers. Under a Node runtime (the
   source tree, an `npm link`) it is `[<this tree's src/cli.mjs>, "work", "drive", …]` as above;
   under the launcher (`isPackaged()` true — `aof.exe`, payload or embedded) `process.execPath` IS
   the CLI (`scripts/sea-entry.mjs:42` derives the payload from it and hands `process.argv.slice(2)`
   to `run()` verbatim) and the vector is `["work", "drive", …]`. The discriminator is
   `isPackaged()` from `src/asset-base.mjs` — never file presence: under the payload install
   `<exeDir>/src/cli.mjs` exists AND the exe is the interpreter, and `aof.exe <cli.mjs> work drive …`
   answers `Unknown command "…/src/cli.mjs"` (measured against `~/.aof/bin/aof.exe`, 2026-09-13).
   FF-12902's argv leg ("its argv's first element resolves to `src/cli.mjs`") takes the same branch
   when 05 lands it. The same latent self-spawn shape — `process.execPath` plus a script path —
   exists at `src/work-audit/census.mjs:516` and `src/work-audit/evidence.mjs:528`; out of scope
   here, named so the next reader does not rediscover it.
2. **`work:drive-<phase>` gains `--run <id>` and `--fix <file>`** in its closed input schema, CLI
   flags and argv. `--run` is the lent id: `managedRunId` is read from it before `ctx.loopDrive`,
   the child never mints or settles (today's `ownsRun = false` path), and it returns
   `settlementContext` on its result. `--fix` names a file holding the fix transport
   (`fixTransport`'s shape verbatim), which the child reads where it reads `ctx.loopDrive.fix`
   today. Under `--run` the child wires `onPtyLive(kill)` to `process.stdin`'s `end`: a closed
   stdin is the graceful stop, through the driver's own bracket (tree-terminate, release, confirm).
3. **The fix file lives in the aof home** — `<globalMeshPaths>.logs`'s sibling `loop-fixes/<runId>.json`,
   honouring `AOF_GLOBAL_HOME` — never in a checkout: a loop must leave the tree exactly as it
   found it (78's black-box contract), and a lane's `git add -A` would otherwise commit it.
4. **Interrupt semantics.** First SIGINT/SIGTERM on the parent: stop dispatching, let in-flight
   lanes finish, merge what finished, halt `operator-interrupt` — today's rule. Second signal:
   abort every child through §1 (stdin end → grace → kill), settle each lane run `cancelled`,
   halt. **Parent-side deadline:** `startToCloseMs + startupGraceMs` per child, the child's own
   driver deadline being the first line of defence; expiry settles `failed / timeout`.
5. **No PTY driver in the loop family.** `src/commands/loop.mjs` and `src/loop/**` import neither
   `agent-session-driver.mjs` nor `node-pty`; the only spawn of a drive is `child-drive.mjs`'s.
   A lane's death is one lane's `runtime_offline`, not the loop's.
6. **Tests inject the child.** `ctx.spawnLaneDrive` mirrors `ctx.runDispatchLane`
   (`commands/dispatch.mjs:129`): a fake that answers a document without a process, so the wave path
   is driven in-process by the existing loop fixtures.

### Alternatives considered

- N in-process drivers with `Promise.all` — rejected: the measured death surface × N, and the
  `loop-diag` bracket cannot tell which session's stop killed the process.
- Signals as the cancel channel — rejected: Windows has none to a child; stdin is the one channel
  every platform has and the child already owns a `kill` seam.
- The fix on stdin — rejected: stdin is the cancel channel and one channel carries one meaning.
- `child.kill()` alone on cancel — rejected: it orphans the child's PTY; the graceful stop runs the
  driver's tree-terminate first.

### Consequences

`drive.mjs` grows ~30 lines and one import (`node:fs/promises` for the fix file); `spawn.mjs` ~25.
The child cannot be reached by `ctx.agentSessionDriverOptions` — the `onSessionStop` diag bracket
is the child's own, and its exit is what the parent sees. FF-12902 holds §5.

### Invariant

The loop family spawns a drive only as a child process through `runBounded`, with `process.execPath`
and an argv, and never imports the session driver.

---

## ADR-006 — The bound is `work.dispatch.concurrency`, asked through one admission

**The bound is `work.dispatch.concurrency`, asked through `work:dispatch`'s admission; there is no second admission, and the loop's own `work.loop.dispatch.concurrency` (129/07) can only narrow it**

### Context

`dispatchConcurrencyFromConfig` (`dispatch.mjs:79`) is the one resolution site (story 65,
`acd-dispatch-bound-single-home`; the slot rule is 69/ADR-006); `work:dispatch { refs }` reserves in request order under the
admission lock and answers `admitted` / `refused at-capacity` per member; `work.loop.*` is held to
deadlines and caps by FF-6901, which also asserts the bounds home annexes no dispatch concurrency.

### Decision

1. **The loop asks `invokeRegistered("work:dispatch", { refs })`** with the wave members it does not
   already hold (ADR-001 §3) and drives the admitted ones; refused members are re-asked as its own
   lanes close. The bound rides every dispatch answer and the loop narrates it; it never reads the
   config key and never holds a number of its own.
2. **`at-capacity` with no lane of this loop in flight** — the slots are held by lanes this loop
   did not open (`holders`) — halts `lane-open-failed` with producer `work:dispatch:at-capacity`;
   the remedy is `aof work dispatch --list`. The loop never polls foreign state.
3. **`decideWave` is pure** (`src/work/loop.mjs`): `{ wave, heldSet, live, setAside }` →
   `{ dispatch: [refs], hold: [refs] }`; the bound is not an input because admission is dispatch's.
4. **AMENDED 2026-09-15 (129/07, the operator's sign-off of the configuration surface) — the loop
   has a bound of its own, and it can only NARROW.** `work.loop.dispatch.concurrency` joins the
   bounds home (`src/loop-bounds.mjs`, beside the mode; a positive integer verbatim, `null` when
   unset), the shell resolves it once and hands it to the wave on `bounds.laneBound`, and the wave
   passes it as `bound` on its `--list` read and its `{ refs }` ask. `work:dispatch` resolves the
   effective bound as `min(bound, pool)` through `narrowDispatchBound` beside the pool's one
   resolution site, and every face of its answer carries the EFFECTIVE bound, which is what the loop
   narrates and records on the wave run. The pool's `work.dispatch.concurrency` stays the one number
   for the machine and stays read by `src/work/dispatch.mjs` alone; a caller can ask for fewer lanes,
   never more. Unset, nothing is passed and admission is the pool's, byte for byte as before. §1's
   "never holds a number of its own" is amended to "never reads the pool's key and never spells its
   own": the family takes the number from the home's resolver and holds no literal.

### Alternatives considered

- Reading `dispatchConcurrencyFromConfig` in the loop and running `dispatchReadySet` itself —
  rejected: `work:dispatch` already composes admission, lock and materialisation, and a second
  caller of the parts is a second admission.
- A `work.loop.lanes` number — rejected: FF-6901's own text forbids the home annexing it.
  *(129/07)* The loop's own `work.loop.dispatch.concurrency` is NOT that twin: it is a `work.loop.*`
  key the home exists to hold, and it narrows the pool's bound rather than standing beside it as a
  second admission — FF-6901's annexation leg now tells the home's read of its own key apart from a
  read of the pool's (`loopConfig(workspace)?.dispatch?.concurrency` vs `work?.dispatch?.concurrency`).
- Making `work:dispatch`'s pool resolver read `work.loop.dispatch.concurrency` too — rejected at
  129/07: the loop's number would then govern every dispatcher on the machine, which is the pool's
  key wearing a loop key's name.

### Consequences

Zero new config at 129/05; one loop-scoped key at 129/07, inert when unset. The `at-capacity`
refusal is the only path to a wait, and the loop waits only on its own children. FF-12901's second
leg holds it: the pool key has one reader, the loop key has one reader, and the family reads neither.

### Invariant

`src/loop/**` and `src/commands/loop.mjs` contain no read of `work.dispatch.concurrency`, spell no
`work.loop.dispatch.concurrency`, and hold no numeric concurrency literal; the loop's own bound
reaches the family only as the home's resolved number, and the EFFECTIVE bound reaches it only
inside a `work:dispatch` answer.

---

## ADR-007 — The supervisor sees one declaration per scope

**The supervisor sees one declaration per scope: a wave run in the primary carries the liveness, lanes are its children, and a resume reconciles live lanes before it walks**

### Context

`decideSupervisedDeclarations` (`work/loop.mjs:1322`) lists one row per `brief.loop.scope`, on the
latest run's liveness (`heartbeatAt` on the record, read from the primary's items only). A relaunch
is `aof work loop <scope> --resume` (`declarations.mjs:103`). Lane runs live in lane trees until
merged.

### Decision

1. **One declaration per scope, unchanged.** Lane runs carry the parent's `loopRunId` and `scope`;
   they are children of the declaration and never their own row.
2. **The wave run.** Before dispatching a wave the loop mints ONE milestone-level run in the
   primary (`brief.loop.phase: "continue"`, additive `brief.wave: { members, baseCommit, bound }`);
   while any lane is open it appends `{ runId, at }` to the milestone's `runs/.heartbeats.ndjson`
   (the hook's exact bytes) and calls `consumeHeartbeatQueue(milestoneItem)` on the same interval
   (every `heartbeatMs / 3`), so `record.heartbeatAt` — the only thing the supervisor reads — is
   fresh; it settles the run `done` when the wave closes, `failed` on a halt. The refine and verify
   phases mint per act in the primary as today.
3. **The relaunch argv is unchanged.** `aof work loop <scope> --resume` under the resolved mode
   enters the reconciliation below before any walk.
4. **Reconcile live lanes first.** For each lane under the dispatch root (`inspectDispatchLanes`),
   resolve the item in the lane and read its runs: a run still `running` with a stale heartbeat →
   `transitionStaleRunsReclaimed([laneItem])` (the same reclaim the primary gets, `runtime_offline`,
   retryable) and the lane is re-driven from its own tree; a lane whose tip is committed and not an
   ancestor of HEAD → merge (ADR-002); a lane whose tip IS an ancestor → cleanup; a dirty lane with
   no running run → committed, then the same. A lane the loop cannot classify is narrated and left.
   Only then does the walk resume.

### Alternatives considered

- One declaration per lane — rejected: the supervisor would relaunch N loops for one scope.
- No wave run; the parent heartbeats the lane runs — rejected: lane records are invisible to the
  primary until merged, so the supervisor would see a dead loop while N lanes work.
- Write `heartbeatAt` through `run-store`'s `heartbeat()` directly — rejected: the consumer is the
  one writer of that field today; the queue append keeps the hook's crash-window argument.

### Consequences

The gap between waves (settle → next → mint) is a few seconds with no running run, the same gap
today's loop has between drives; it is recorded, not widened. FF-12907 holds §1 over a fixture.

### Invariant

Over a wave run plus N lane runs of one loop, `decideSupervisedDeclarations` yields ONE row; no
lane run's `brief.loop.scope` differs from its parent's.

---

## ADR-008 — Where the code lives: a `src/loop/` family born exempt

**Where the code lives: a `src/loop/` family born EXEMPT, git-level verbs in their existing homes, and the wave tick as a SUBTRACTION from the shell**

### Context

`src/` root and `src/commands/` are at ceiling (92/92, 67/67); the root row's `why` already names
the `src/loop/` family. `src/commands/loop.mjs` is 2,311 lines; `worker-execution.mjs` is TECH_DEBT
item 83 at 1,957 with seam 3 (worktree lifecycle) unpaid. The budget predicate fails a row whose
count is below its ceiling, so a row born in one story and grown by two others is a three-story
handoff on one file — 119/ADR-009 accepted that once; this milestone's thesis is that its stories
run concurrently.

### Decision

1. **`src/loop/` holds three modules:** `child-drive.mjs` (ADR-005 §1: spawn + parse), `wave.mjs`
   (the BUILD phase: wave run, dispatch, per-lane open → mint → child → settle → ladder → commit →
   merge → cleanup, interrupt handling, reconcile-on-resume) and `cycle.mjs` (§3). Pure decisions
   go to `src/work/loop.mjs`; the mode resolver to `src/loop-bounds.mjs`.
2. **The family is born as an EXEMPTION, not a row**, in the first story that creates the
   directory (story 02): three members is under `FLAT_LAYER_THRESHOLD`, its four `src/work-*`
   subject-family precedents are exempt, and the exemption is re-checked for size on every run.
   This departs from 119/ADR-009 leg 1's preference for a row on a born family, for a measured
   reason: a row's ceiling must equal the count, so it would be edited by 02, 03 and 04 in turn.
   The row arrives with the (out-of-scope) `loop-*` root-leaf move or with the ninth file,
   whichever is first.
3. **The wave tick is a SUBTRACTION.** The per-story post-drive ladder now inline in
   `runLoopBody` (`loop.mjs:1917-2274`: grade delta, sampler, review gate, `pendingFixes` /
   `pendingGrades` / `progressStates` / `reviewRounds` bookkeeping, the verify cross) moves to
   `src/loop/cycle.mjs` as `settleStoryCycle(phaseRun, bookkeeping, ctx, { crossToVerify })`,
   parameterised by the workspace it grades in. `runLoopBody` calls it with the primary workspace
   and `crossToVerify: true` (byte-identical under `sequential`, held by the 40 loop suites); the
   wave calls it per lane with the lane workspace and `crossToVerify: false`. `narrate` and
   `report` are PARAMETERS of every `src/loop/` function — never a second printer — and FF-12602's
   needle scan extends over the family. `src/commands/loop.mjs` is expected to LOSE ~300 lines;
   story 04's review measures it and a grown file is a finding.
4. **Git-level verbs stay in their homes.** `commitWorktreeChanges` MOVES to `src/mesh/worktree.mjs`
   beside its sibling verbs (accepting `options.exec ?? options.pushExec`, so both worker call
   sites keep their lines) and is re-exported from `worker-execution.mjs` — TECH_DEBT item 83's
   seam 3, one verb of it, paid the way seams 1 and 2 were (absent definition, present re-export).
   `src/work/dispatch.mjs` — the lane's home — gains two composed verbs, `commitDispatchLane` and
   `mergeDispatchLaneHome` (ADR-002 §1-§2), and `dispatchLaneBase`. `advanceBranchToBase` gains
   `dirtyPolicy` (ADR-002 §1).
5. **Three stop ids** join `LOOP_STOPS`: `lane-open-failed`, `lane-merge-refused`,
   `lane-merge-conflict`. `acd-loop-probe-contract`'s literal grows by exactly those three; every
   halt's detail (lane, branch, base, tip, files) rides `reportLine`'s details, so `actShape`'s
   whitelist is untouched.
6. **Observables vs invariants.** The stories' `.feature`s own: the phase order; an `in-review`
   story routing to the gate; a lane opened at HEAD and narrated; a held story dispatched after the
   colliding lane merges; a conflict halting with the lane intact; the lane's grade excluding
   HEAD's reds; the supervisor listing one row; `--resume` reconciling a stale lane. The register
   owns the structural claims (FF-12901 – FF-12907).
7. **What the live run of 129 on 127 requires of the primary tree, plainly:** (a) it is on a branch;
   (b) HEAD CONTAINS every sibling's work a lane must build on — a lane sees HEAD and nothing else,
   so the uncommitted loop fixes and 127/01's build are committed before the soak; (c) the loop
   will commit under `wiki/work/127_…/` in the operator's name of the mesh identity — anything the
   operator has hand-edited there is swept into that commit; (d) every other dirty file is left
   alone and blocks only a merge that touches it, by name; (e) `work.loop.concurrency:
   "refine_first"` in `.aof/aof.config.json` (story 06's edit), `work.agents.mode` untouched.

### Alternatives considered

- Everything in `src/commands/loop.mjs` — rejected: 2,311 lines and one src dependent; the file is
  the accretion this milestone must not deepen.
- A `lanes.mjs` under `src/loop/` for the composed git verbs — rejected: `src/work/dispatch.mjs` already
  owns `resolveDispatchLane` / `cleanupDispatchLane` / `sweepDispatchLanes`; a sibling home for
  the same lane is the second-home species.
- A budget row for `src/loop/` — rejected in §2 with the measurement.

### Consequences

`src/work/dispatch.mjs` 582 → ~700, `src/mesh/worktree.mjs` 964 → ~1,030 (+65 moved in),
`worker-execution.mjs` 1,957 → ~1,890, `src/work/loop.mjs` +~90 (a decider, two inputs, three
stops), `src/commands/loop.mjs` −~300. `test/arch/loop` rises 54 → 58 (four files, seven ids).

### Invariant

`src/loop/` holds exactly the members its exemption names, imports no session driver, and prints
through no `console.log` of its own.

---

## Codebase health — what these stories land in

`src/commands/loop.mjs` at **2,311 lines** is the widest file this milestone touches and the one
whose growth rate is worst: it gained the grade baseline, the settle-conflict narration and the
diag bracket in one week. ADR-008 §3 makes story 04 a subtraction and story 04's review measures
the line count before and after; a net growth is a finding. `src/mesh/worker-execution.mjs`
(**1,957**, item 83, half-paid) loses `commitWorktreeChanges` to its declared home in story 03 —
one verb of seam 3, recorded against the entry. `src/work/loop.mjs` (**1,450**, imports nothing)
gains ~90 lines of pure decision and keeps its zero imports (`acd-clock-counts-attempts:194`).
`src/work/dispatch.mjs` and `src/mesh/worktree.mjs` grow by the verbs they already should have
owned. **Added:** three `src/loop/` modules, one resolver, one decider, three stop ids, one
`.gitattributes` line. **Removed:** the ladder from the shell, one function from the god-node.

Ledger entries citing the subject files, re-measured: **item 91** (the engine is never told the
cycle) — still true at `nextDecision`'s six sites; routed as ADR-001 §7 (status/phase paid by
story 01, the `cycle` leg stays ledgered because it rides the 124/01 plan hand-off). **Item 83** —
routed to story 03 as above. No entry cites `drive.mjs`, `dispatch.mjs`, `worktree.mjs` or
`loop-bounds.mjs`. `aof work debt` itself is broken in this tree by 127/02's in-flight
`insert-shared.mjs` change (`runInsertTopLevel` no longer exported) — that is 127's to close, not
this milestone's, and is recorded here so nobody re-discovers it.

Recurring shape, ratcheted: the per-directory `test/**/index.mjs` and the budget table are shared
writes for any two stories that add a suite or a file in one directory. This milestone avoids the
collision by partition (below) rather than by a control; the shape is named so the PO can author
`files:` around it.

---

## Proposed partition

Drawn from the graph's coupling: `src/work/loop.mjs`, `src/loop-bounds.mjs`, `src/commands/drive.mjs`,
`src/work-audit/spawn.mjs`, `src/mesh/worktree.mjs` and `src/work/dispatch.mjs` share no
import edge with one another (each is a leaf or imports only leaves the others do not touch), so
01, 02 and 03 are write-disjoint by construction and form the first wave at exactly the bound of 3.
04 imports all three's exports and is the only story that touches `src/commands/loop.mjs`. 05
lands the register (every arch-test file, the `test/arch/loop` index and row bump) so no other
story edits `test/arch/loop/index.mjs`; 02 alone edits the budget table for the exemption. Stories
extend existing unit suites in their subject's directory rather than adding files, so no story but
01 and 04 edits `test/loop/index.mjs`.

| story | ADRs | lands | files (write set) | depends |
|---|---|---|---|---|
| 01 `the-mode-and-the-engine-decide` | ADR-001, ADR-006 §3, ADR-008 §5 | `resolveLoopConcurrency` / `loopConcurrencyFromConfig` in both maps; `decideLoopPhase` reads `next.status`, `concurrency`, `unrefined`; `decideWave`; `LOOP_STOPS` + 3; `configBound` guard | `src/loop-bounds.mjs`, `src/work/loop.mjs`, `src/loop-record.mjs`, `test/loop/loop-bounds.test.mjs`, `test/arch/loop/acd-loop-probe-contract.test.mjs` (stops literal), one new engine suite under `test/loop/` + `test/loop/index.mjs` | — |
| 02 `the-drive-is-a-child` | ADR-005 | `--run` / `--fix` / `settlementContext` / stdin-end kill on `work:drive-*`; `src/loop/child-drive.mjs`; `runBounded` `signal`/`graceMs`/`stdin`; the `src/loop` exemption | `src/commands/drive.mjs`, `src/loop/child-drive.mjs`, `src/work-audit/spawn.mjs`, `test/arch/testing/acd-source-directory-budget.test.mjs`, `test/loop/drive-command-phase-drivers.test.mjs`, `test/audit/audit-spawn-bounded.test.mjs` | — |
| 03 `the-lane-commits-and-merges-home` | ADR-002, ADR-008 §4 | `commitWorktreeChanges` moves to `worktree.mjs` (re-exported); `advanceBranchToBase` `dirtyPolicy`; `commitDispatchLane` / `mergeDispatchLaneHome` / `dispatchLaneBase`; `.gitattributes` union line | `src/mesh/worktree.mjs`, `src/mesh/worker-execution.mjs`, `src/work/dispatch.mjs`, `.gitattributes`, `test/mesh/worker/mesh-worker-commit-diff.test.mjs`, `test/grade/gate-propagation-refusals-leave-branch.test.mjs`, `test/work/lifecycle/work-dispatch-lanes.test.mjs` | — |
| 04 `the-wave-tick` | ADR-003, ADR-004, ADR-007, ADR-008 §3 | `src/loop/wave.mjs` (wave run + heartbeat, dispatch, per-lane lifecycle, interrupt, reconcile); `src/loop/cycle.mjs` (the extracted ladder); `runLoopBody` delegates by mode, honours a fresh `gate`, passes `throughReview`, commits its own writes; `readGradeBaseline` by sha; FF-12602 scan extended | `src/commands/loop.mjs`, `src/loop/wave.mjs`, `src/loop/cycle.mjs`, `test/arch/loop/acd-loop-narrates-in-flight.test.mjs`, new wave suites under `test/loop/` + `test/loop/index.mjs`, `test/support/` fixtures (+ the `test/support` row) | 01, 02, 03 |
| 05 `the-account-and-the-register` | all | the seven controls (four files) + `test/arch/loop/index.mjs` + the `test/arch/loop` row 54 → 58; FF-12904's extension; `autonomous.md` names the key (+ its three renders, manifest, lock); red probes in `VERIFICATION.md` | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs`, `test/arch/loop/acd-loop-family-boundary.test.mjs`, `test/arch/loop/acd-lane-records-and-the-declaration.test.mjs`, `test/arch/loop/acd-lane-grade-is-lane-scoped.test.mjs`, `test/arch/loop/index.mjs`, `test/arch/grade/acd-gate-propagation-never-discards.test.mjs`, `test/arch/testing/acd-source-directory-budget.test.mjs`, `src/bundle/commands/autonomous.md`, `.claude/commands/aof/autonomous.md`, `.codex/skills/aof-autonomous/SKILL.md`, `.opencode/commands/aof/autonomous.md`, `src/bundle/manifest.json`, `.aof/aof.lock.json` | 04 |
| 06 `the-second-live-run` (`@manual`) | all | `work.loop.concurrency: "refine_first"` in this repo; `aof work loop 127` over the 02/04 wave with 03 held; the SPEC §Objective outcome read at the source (two lanes, two records, two grades, 03 after 02, every lane named, a forced conflict halting `lane-merge-conflict`); ADR-008 §7's preconditions met first | `.aof/aof.config.json`, `wiki/work/129_…/STATE.md`, `wiki/work/127_…/STATE.md` | 05 |

02 and 05 both touch the budget table; 05 depends on 04 which depends on 02, so it is an ordering,
not a collision. 01 and 04 both touch `test/loop/index.mjs`; same ordering.

---

## Fitness functions

HARNESS SHAPE (`119/ADR-010`): each arch-test exports `archTests`, an array of `{ name, run }`, and
is registered by one import + one spread in its directory's `index.mjs` — never discovered by
`readdir`. Every control below is `pending` until story 05 lands it; each landed control owes a red
probe in `VERIFICATION.md`. The id stands alone in its first cell. Four new files land under
`test/arch/loop/` (its row rises 54 → 58 by exactly that count); FF-12904 extends an existing file
under `test/arch/grade/` and moves no row. The standing controls this milestone must keep green —
`acd-loop-probe-contract` (ten keys, the stops literal), `acd-loop-state-rides-the-run-record`
(nine loop keys, sixteen record keys), `acd-clock-counts-attempts` (the engine imports nothing),
`acd-loop-cap-single-home` / FF-6111 (two-way resolver-map equality), `acd-dispatch-bound-single-home`,
`acd-source-directory-budget`, `acd-console-log-confined` — are cited, not redeclared.

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-12901 | **The mode has one home and no concurrency number exists.** Leg 1: `resolveLoopConcurrency` and `loopConcurrencyFromConfig` are exported from `src/loop-bounds.mjs`, `"work.loop.concurrency"` is a key of BOTH resolver maps mapping to those bare identifiers, `rangeProbe(key, p).admissible` is true for exactly the two modes and false for `0`, `1`, `3`, `"parallel"`, and `stepProbe(key, "sequential", 1)` is not admissible. Leg 2: over a comment-stripped sweep of `src/**`, the literals `"refine_first"` / `"sequential"` appear only in `src/loop-bounds.mjs` and `src/work/loop.mjs` (an allow-list of two, by path); no src module outside `src/work/dispatch.mjs` reads `dispatch.concurrency`, and `src/loop/**` + `src/commands/loop.mjs` contain no read of it and no key `work.loop.<x>` whose resolver answers a number that is not one of the eight FF-6901 names. Non-vacuous: the sweep finds the engine's branch. Red probe: add `"work.loop.lanes": resolveLanes` to the value map; and separately spell `"refine_first"` in `src/loop/wave.mjs`. | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs`| ADR-001, ADR-006 |
| FF-12902 | **A lane drive is a child process.** `src/commands/loop.mjs` and every `src/loop/*.mjs` import neither `agent-session-driver.mjs` nor `node-pty` nor `claude-trust.mjs` (resolved import specifiers, not text); `src/loop/child-drive.mjs` is the only module in the family that reaches `runBounded` or `node:child_process`, its spawn command is `process.execPath` and its argv's first element resolves to `src/cli.mjs`, and no `shell:` option appears anywhere in `src/loop/**`. Non-vacuous: `child-drive.mjs` must contain the `runBounded` call. Red probe: import `driveInteractiveClaudeSession` into `wave.mjs`; and separately pass `shell: true`. | `test/arch/loop/acd-loop-family-boundary.test.mjs`| ADR-005 |
| FF-12906 | **The wave is read, never recomputed.** `src/loop/**` and `src/commands/loop.mjs` import neither `src/ready-wave.mjs` nor `src/story-contract.mjs` (resolved), and every occurrence of `.wave` / `.heldSet` in the family is a property read off a value bound from an `invokeRegistered("work:next"` call — asserted by the enclosing-function textual rule FF-12702 uses; every `work:next` invocation in `src/loop/wave.mjs` carries `throughReview: true`. Red probe: call `partitionReadySetByDeclaredFiles` from `wave.mjs`. | `test/arch/loop/acd-loop-family-boundary.test.mjs`| ADR-001 §3 |
| FF-12903 | **The tree that commits the change owns the record.** Structural leg: in `src/loop/**`, every `transitionRunStart` / `transitionRunComplete` whose `brief` (or the record it settles) carries `lane` takes an item bound from a `resolveRefInWorktree(` call in the same function; `resolveItemExact` appears in `wave.mjs` only in the wave-run mint. Fixture leg: drive a two-member wave through `runLoopBody` with an injected `spawnLaneDrive` and exec seam; assert the primary's two story dirs hold NO `runs/` file until the merge lands, each lane's story dir holds one `running` → `done` record with `brief.lane.worktree` equal to its lane, and `readRuns(primaryStory)` after the merge returns that same `runId`. Red probe: mint the lane run against `resolveItemExact(ctx, ref)`. | `test/arch/loop/acd-lane-records-and-the-declaration.test.mjs`| ADR-004 |
| FF-12907 | **Lanes are children of one declaration.** Over the same fixture, every lane run's `brief.loop` deep-equals the wave run's `brief.loop` except `cycle`, and `decideSupervisedDeclarations({ workspaces: [{ items: [milestone + both stories after merge] }], … })` yields exactly ONE row whose `loopRunId` is the loop's; `src/loop/**` contains no assignment to `brief.loop.scope` or `.loopRunId` (the declaration is passed in whole). Red probe: mint a lane run with `scope: ref`. | `test/arch/loop/acd-lane-records-and-the-declaration.test.mjs`| ADR-007 |
| FF-12905 | **A lane's grade is taken in the lane.** In `src/loop/cycle.mjs` and `wave.mjs`, every `invokeRegistered("work:grade"` / `"work:validate"` / `"work:doctor"` call and every `recordBuildProgress(` call receives a ctx / `worktreePath` bound from the lane's workspace parameter — no occurrence of `process.cwd()` and no reference to the outer `ctx.workspace.projectRoot` inside the lane path (asserted textually over the function bodies, with the sequential call site allow-listed by name); `gradeBaselines` in `wave.mjs` is keyed by a `baseCommit` binding; `readGradeBaseline` accepts `{ baseCommit }`. Fixture leg: with a fake `work:grade` recording its `ctx.workspace.projectRoot`, both lane grades report their lane paths and the baseline ran once. Red probe: grade with the loop's `ctx`. | `test/arch/loop/acd-lane-grade-is-lane-scoped.test.mjs`| ADR-003 |
| FF-12904 | **Merge-home never discards.** `BRANCH_PATH_MODULES` in the existing control gains `src/work/dispatch.mjs`, `src/loop/wave.mjs` and `src/loop/cycle.mjs`; the forbidden forms (`rebase`, `push --force*`, `reset --hard`, `checkout -B`, `branch -f`, `update-ref refs/heads`) stay banned across the set, the sanctioned forms stay sanctioned (`worktree remove --force`, the path-scoped `reset -q -- .aof` that moves in with `commitWorktreeChanges`), and the ARMED leg — an `--abort` beside every `merge` — now also fires for `dispatch.mjs`; `advanceBranchToBase`'s `dirtyPolicy` literal set is exactly `{"strict","touched-paths"}`. Red probe: add `["reset", "--hard", base]` to `mergeDispatchLaneHome`. | `test/arch/grade/acd-gate-propagation-never-discards.test.mjs` *(extension)* | ADR-002 |
