---
type: milestone
number: 126
slug: the-declaration-is-the-unit
title: "The declaration is the unit — a loop that says what it is doing, a clock that counts work not sleep, and a supervisor that restarts what died"
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-10
depends: [124]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 126 · The declaration is the unit — a loop that says what it is doing, a clock that counts work not sleep, and a supervisor that restarts what died

## Objective

**A loop that cannot say what it is doing, and cannot be restarted when it stops, is not autonomous —
it is a long bet on nobody closing the lid.**

This milestone was framed from one measured failure, end to end, on 2026-09-07/08.

| clock | what happened |
|---|---|
| 23:32:31Z | `aof work loop 124` started — 124/00, `continue`, cycle 1 of cap 3, L2 |
| 23:32–00:02Z | ~30 minutes of real work: **~940 lines** across 7 files, all inside 124/00's declared write set |
| 00:02:19Z | last heartbeat — the operator closed the lid |
| 11:02:13Z | `aof work loop 124 --resume` → **`deadline-exhausted`**, `elapsedMs=41384106` against `ceilingMs=7200000` |

Between the first line and the last the terminal printed **nothing at all** beyond a Node
`ExperimentalWarning`, so the loop was indistinguishable from a hung process — and the recovery path
then refused on a deadline a sleeping laptop had consumed.

Four defects, one root: **the system holds every fact it needs and neither reports it nor acts on
it.** The record carried fifteen keys; the reclaim path correctly wrote
`failureReason: runtime_offline`. None of it reached the operator, and none of it reached anything
that could restart the work.

Measured at HEAD, 2026-09-08:

| seam | what it knows | what it does with it |
|---|---|---|
| `reportLine` (`src/commands/loop.mjs:940`) | every driven row, phase and outcome | replays the whole history **at exit** — all ~17 call sites are terminal, so a multi-hour loop is mute until it stops |
| `work:run-status` (`src/commands/run-status.mjs:96`) | the run record's **fifteen** keys | renders **two** — `runId` and `state` |
| `decideScheduleToClose` (`src/work/loop.mjs:784`) | the declaration's origin timestamp | measures `now − startedAt`, so downtime is charged as work — 11h29m billed for 30m of it |
| `assignment-reclaim` (`src/mesh/assignment-reclaim.mjs`) | presence **and** heartbeat both stale ⇒ the runtime is gone | writes `reclaimed` and stops. `"reclaimed"` occurs **once** in `src/` — its own producer. Nothing consumes it |

Row three is a defect against a **declared** intent, not a design disagreement: `69/ADR` sizes
`scheduleToClose` as a compute budget — *"total across all attempts"*, running *"from the moment
**the attempt** starts"* — and the implementation measures wall-clock from the moment the
**declaration** was minted. Because elapsed keeps growing in real time, a halted declaration is
**permanently unresumable**. Row four is milestone 124's own thesis — **a verdict that does not
change what runs next is a report** — and this is the fourth such path, and the most expensive,
because the verdict it drops is the one that would have restarted the work.

**The unit this milestone names is the `Declaration`** — the noun the loop already persists: the
durable statement that a scope is under autonomous execution, at a level, with a cap, since a time.
It survives the process, it is what `--resume` recovers, and it is what the overnight crash left
behind. Generalising that existing noun rather than minting a sibling is what lets a supervisor keep
work alive without learning what a loop is.

## Scope

In scope:

- **The loop narrates itself, by default.** Progress reaches the operator while a phase is in flight
  — which ref, which phase, which cycle against which cap, and which stage within the drive — through
  the injected `report` seam the module already owns. Default-on with a `--quiet` opt-out, not
  opt-in behind `--verbose`: a command that runs for hours in silence is a defect, not a preference.
  The one-`console.log`-at-the-launcher-seam discipline (m42 PRINTERS category 2) is **preserved**;
  this adds lines through the existing printer, never a second one.
- **`run-status` renders what the record holds.** Phase, cycle/cap, level, attempt, elapsed, session
  id, node and heartbeat age — the keys already on disk. No new field is authored; the defect is a
  renderer that discards its input.
- **The clock counts attempts, not calendar.** `scheduleToClose` is measured against accumulated
  attempt time carried on the declaration, so downtime contributes nothing and the property `69/ADR`
  actually asserts — *the ceiling that makes `maxAttempts: 3` safe* — survives resume intact. A fresh
  declaration per reboot is **refused** as the alternative: it resets the total budget and makes a
  bounded loop unbounded.
- **Reclaim's verdict reaches an action.** The dual-staleness decision is already correct and stays
  where it is; what changes is that `reclaimed` acquires a consumer. `runtime_offline` (the runtime
  died) and `deadline-exhausted` (a bound was hit, a human should look) must route differently — the
  first is resumable, the second must never be auto-retried.
- **The `Declaration` becomes the supervised unit, and the supervisor is level-triggered.** aof
  answers *which declarations should be running on this node now*; the Rust supervisor reconciles
  desired against actual and never learns what any of them mean. A completed loop stops appearing in
  the answer, so nothing relaunches it — reconciliation replaces restart-on-exit, and no completion
  semantics cross into Rust. The existing core is the substrate, not a rewrite: `supervision.rs`
  already carries `SupervisedChild { label, argv }`, `LocalProcessState`, `transition` and
  `jittered_backoff_ms`, and `poll.rs` already carries a cadence. The change is that the supervised
  set is **supplied by aof** rather than a `match` on `is_control_node`.
- **An installer for the control node, with login autostart.** The one place the daemon environment
  is fixed rather than fought: PATH, a Linux/Windows-native toolchain, an **authenticated** `claude`,
  and a workspace identity that is not cwd-derived (TECH_DEBT item 4). Power on → log in → declared
  work resumes, with no operator command. This is the deliverable that answers the framing complaint;
  everything above it is what makes the resumption correct rather than merely automatic.
- **The `node:sqlite` ExperimentalWarning is suppressed at its two sources** —
  `src/effects/journal.mjs:44` and `src/global-work-store.mjs:162`. A targeted filter, never a
  blanket `--no-warnings`, which would also hide the deprecations this repo wants to see.

Out of scope:

- **Running the supervisor as a Windows service.** Refused on a measured basis rather than deferred:
  a service runs in session 0 with no login session, so `claude` is unauthenticated — precisely the
  failure that burned the Mac worker's runs over SSH, and that the WSL notes in `CLAUDE.md` exist to
  prevent. Login autostart is the correct shape and the only one that keeps agent sessions authentic.
- **A scheduler inside aof.** `63/SPEC` put one out of scope and `work:trigger` was built to hand its
  argv to an external tick. Nothing here reopens that: the Rust supervisor **is** the tick, and it
  asks aof what to run rather than deciding for itself. Loop policy must not come to live in two
  languages.
- **Mesh re-dispatch of a reclaimed assignment to a different node.** A reclaimed assignment
  returning to the local declaration set is in scope; choosing a new worker for it is a distinct
  concern with its own admission and credential questions. Deferred whole.
- **An opt-in registry of which scopes may auto-resume.** Named here because auto-resume without one
  means every login silently spends tokens re-entering whatever was open when the lid closed. It may
  prove to be one story of this milestone rather than a deferral — `aof:refine` decides.

## Stories

<!-- The stories that compose this milestone. Each is its own NN_story_<slug> item with parent: NN.
     Populated at the Break-down stage (refine); "to be broken down" until then. The milestone is
     accepted when all its stories are. -->

Six, drawn at refine on 2026-09-08 against the codebase graph (`ARCHITECTURE.md` §Proposed
partition). Three form a chain on the loop god-node; the write-set constraint against `124/01` is a
hard one, and because a story's `depends:` must resolve to a sibling it is carried by this
milestone's own `depends: [124]` — every story here waits for 124's acceptance, which is one event.

- [x] `00_story_the-loop-says-what-it-is-doing-and-counts-what-it-did` — the clock sums attempt time
      over the `retryOf` lineage (ADR-001) and the loop narrates in flight through its one printer,
      `--quiet` opting out (ADR-002). First on the chain; writes the two files `124/01` declares.
- [x] `01_story_run-status-renders-what-the-record-holds` — the render gains the record's own facts,
      the `--json` document does not change, and the byte-pin that froze the file is re-pinned in the
      open (ADR-003). Depends `00` for the one-home elapsed derivation.
- [x] `02_story_the-declaration-predicate-and-its-door` — one pure decider answers which
      declarations should be running now, `supervised` is a ninth declaration key off by default,
      and the answer rides `mesh status --json --declarations` (ADR-004, ADR-005). Depends `00`.
- [x] `03_story_the-supervisor-reconciles-a-supplied-set` — the Rust supervisor reconciles a set
      supplied by the poll, level-triggered, with no completion semantics (ADR-006). Depends `02`.
- [x] `04_story_the-installer-fixes-the-daemon-environment` — `install --autostart` through one
      injected runner, a coded refusal off Windows, and a three-check preflight the verbs report
      (ADR-007). Independent.
- [x] `05_story_the-warning-has-one-home` — the SQLite runtime is imported at one leaf with a
      targeted, restored filter; no blanket suppression anywhere (ADR-008). Independent.
- [x] `06_story_the-preflight-names-the-missing-heartbeat-hook` — a fourth preflight check names any
      workspace on this node carrying no `claude-run-heartbeat` hook, superseding `04`s count of
      three (ADR-007). Added at verify, from a measured 8h34m bill. Independent.

## Dependencies

- **`124/01` (`cap-exhaustion-returns-to-the-plan`)** — declares `src/work/loop.mjs` and
  `src/commands/loop.mjs` in its `files:`, which is where the narration and the clock both land.
  Sequencing against it is a hard constraint, not a preference: two writers on those two files is the
  collision this milestone must not cause.
- **`69` (`loop-bounds`)** — owns the four-deadline taxonomy and the `scheduleToClose` derivation the
  clock fix is measured against. The fix restores its stated intent; it does not amend it.
- **`53` (`loop-artifact`)** — owns the declaration, the launcher seam, and the single-printer
  discipline the narration must respect.
- **`36` (the desktop app)** — owns `supervision.rs` / `poll.rs`, the substrate the reconciler extends.
- **`63` (`work:trigger`)** — owns the argv-emitting surface the supervisor consumes.
