# ISSUE · Story work cannot stop at build

**2026-08-22.** Subject: the AOF framework. Evidence: milestone `69` in the AOF repository itself,
run in `orchestrated` mode.

The operator asked for work on the stories. The session expanded that into structural review,
behavioural review, craft review, two remediation rounds, repeated focused-suite runs, architecture
fitness hardening, and a dependency restore. The operator had to say **"Stop everything. Stop all
agents"**. When asked why it had taken hours, the session initially described an unbounded review
loop; the operator corrected the premise: **the job was to work on the stories, not to verify them.**

This is not only an execution mistake. AOF has no machine-representable build-only scope.

Companions:

- [`ISSUE-why-a-simple-story-costs-three-hours.md`](ISSUE-why-a-simple-story-costs-three-hours.md)
  measures the cost of uncapped review escalation.
- [`ISSUE-the-run-hung-and-nothing-noticed.md`](ISSUE-the-run-hung-and-nothing-noticed.md) records
  the missing watchdog and the unbounded fix beat.

This incident sharpens the missing boundary: even a live operator's narrower intent cannot be
expressed or enforced by the command that builds stories.

---

## What happened

The first story wave was already implemented. Instead of proceeding only with story implementation,
the orchestrator treated the next review gate as mandatory work and repeatedly commissioned more:

1. Architect, QA, and craft reviewers ran concurrently.
2. Their findings became an automatic remediation round.
3. All three reviews ran again.
4. New findings became another architecture/developer remediation round.
5. Focused suites were repeatedly re-run; when `node_modules/ws` disappeared, the session restored
   the frozen dependency tree and ran the supply-chain audit so review verification could continue.
6. The operator stopped the session before another review round.

The continuation alone made **ten specialist-agent invocations** across review, re-review, and fix
beats. No `aof:verify` command was invoked, but the session still performed verification-shaped work:
independent verdicts, fitness-function mutation controls, repeated behavioural gates, and closure of
review findings. The acceptance command is separate in name; the expensive verification activity is
not separate in practice.

The work was technically productive. That is not the criterion. It was outside the operator's
requested phase and had no automatic stopping boundary.

---

## Root cause

### 1 · `aof:continue` bundles build and review with no build-only mode

The command declares the coupling directly:

- `src/bundle/commands/continue.md:2` — *"build its tasks to green, then structural + behavioural
  review"*.
- `:7-9` — a milestone is always driven to *"built-and-reviewed"*.
- `:19-26` — the only execution flag is `--solo`, and it changes **who**, explicitly never **what**.
- `:47-54` — *"build+review lives here"*.
- `:134-145` — Build is immediately followed by architect, QA, optional designer, and craft review;
  the instruction then says *"apply confirmed fixes"*.
- `:161-164` — story and task execution terminate only after review.

There is no `--build-only`, `--no-review`, phase argument, or separate build command. The operator can
ask for stories to be implemented, but AOF cannot encode that request in the execution envelope.

### 2 · Phase ownership is prose, not a capability boundary

AOF documents distinct Build, Review, and Verify phases, but the running orchestrator receives tools
capable of all of them. No runtime token says:

```text
phase = build
allowed outcomes = production code + executable wiring
forbidden transitions = spawn reviewers, write verification evidence, remediate review findings
stop = task scenarios green
```

Without that boundary, the assistant's generic *persist until fully handled* policy wins. A review
gate visible in context is interpreted as more work rather than as a hand-off.

### 3 · Review findings recursively enlarge the assignment

`continue.md:144-145` says *"apply confirmed fixes"* but supplies neither a round budget nor a
checkpoint. A reviewer can find a defect in a fitness function; fixing that function can expose a
runtime edge case; the next reviewer can then find a durability gap in the fix. Every finding is
locally defensible, and the assignment grows without any explicit operator decision.

This is how a build request becomes a general codebase-closure exercise.

### 4 · The status model makes review look required for story completion

`continue.md:161-163` makes `in-review` the command terminus. There is no first-class **built** state
or durable build hand-off. The orchestrator therefore cannot record *"implementation complete;
review not requested"*. It must either leave the story apparently unfinished at `in-progress` or
continue into review.

### 5 · Existing loop bounds govern workers, not orchestration scope

Milestone 69 adds runtime bounds around attempts, review admission, dispatch, and parked work. None
of those bounds constrains the top-level command/session from spawning another reviewer, accepting
another finding as scope, or starting another remediation round. AOF can bound work **inside** a
lane while leaving the number and kind of lanes unbounded.

---

## Why this keeps recurring

The framework currently relies on the orchestrator to make a judgement call that its own command
text argues against. The command says the whole milestone must reach built-and-reviewed and warns
against stopping after one slice. The operator's narrower instruction exists only in conversation,
while the broader workflow exists as a detailed durable prompt. On re-entry or context compaction,
the durable workflow wins again.

Repeated apologies and better judgement cannot make that reliable. The scope must be data and the
phase boundary must be enforced.

---

## Required change

### 1 · Make phase explicit

Add a machine-readable execution envelope, for example:

```json
{
  "ref": "69",
  "phase": "build",
  "scope": "ready-stories",
  "review": false,
  "verify": false,
  "maxRemediationRounds": 0
}
```

Every spawned agent and status transition must inherit that envelope. Work outside it is refused,
not merely discouraged.

### 2 · Provide a build-only command surface

Either split `aof:continue` into explicit phase commands or add flags with unambiguous semantics:

- `aof:continue <ref> --build-only` — implement ready story tasks, run their executable/fitness
  build gates once, record the build hand-off, and stop. Spawn no reviewer.
- `aof:continue <ref> --review-only` — review already-built stories; make no implementation fix
  without a separately authorized remediation beat.
- `aof:verify <ref>` — acceptance evidence and `done`, unchanged.

If backward compatibility requires build+review as the default, crossing from Build to Review must
still require an explicit operator checkpoint when the original request named build/story work only.

### 3 · Represent the build hand-off

Add a durable state or run outcome distinct from `in-progress` and `in-review`, such as `built`, or a
phase record attached to the run. The framework must be able to truthfully say:

> Story implementation is complete. Review has not run and was not requested.

Without that state, the lifecycle itself pressures the orchestrator to exceed scope.

### 4 · Bound remediation separately

Review must produce findings, not silently authorize another implementation assignment. A review
blocker should stop with a proposed remediation set. Starting that set requires an explicit phase
transition and a finite round budget. Findings after the budget become queued work, not another
automatic round.

### 5 · Surface every phase transition

Telemetry and progress output should name transitions as events:

```text
BUILD complete -> REVIEW requested? no -> STOP
```

An agent spawn whose role does not belong to the active phase should be rejected and logged.

---

## Acceptance cases

1. Given `aof:continue 69 --build-only`, when all ready stories become green, then no architect, QA,
   designer, or craft reviewer is spawned and the command stops with a durable build outcome.
2. Given a conversational instruction limited to story implementation, when the command resolves
   scope, then it presents or selects the build-only envelope rather than silently widening to
   built-and-reviewed.
3. Given a build-only run with failing executable scenarios, only developer remediation may occur;
   review findings cannot enter the run because review does not execute.
4. Given a review-only run that returns blockers, the blockers are reported and the run stops;
   production fixes require a separately authorized remediation transition.
5. Given a finite remediation budget, when the final allowed round still has findings, the findings
   are queued and the run stops.
6. Given a build phase, any attempt to spawn a reviewer or write verification evidence is refused by
   the execution layer.
7. Given a milestone with later dependency-unlocked stories, build-only may continue walking ready
   stories, but it may not cross into Review or Verify.

The load-bearing requirement is not a better prompt sentence. It is that **operator scope survives
re-entry, compaction, agent fan-out, and reviewer findings as an enforced execution boundary.**
