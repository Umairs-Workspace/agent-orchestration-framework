---
type: story
number: 102
slug: the-declaration-names-its-loop
title: "The declaration names its loop — the join key that turns two dead instruments on"
status: done
owner: product-owner
created: 2026-09-04
updated: 2026-09-05
depends: [53, 78]
schema: 1
aofVersion: 0.1.0
# `reads:`/`files:` DERIVED at refine against a same-day graph, then subtracted — its test-lane leg proposed two suites that do not exist, so these are the ones that really pin the envelope. The last entry joined at the accept gate: F-102-A.
reads:
  - src/loop-record.mjs
  - src/run-store.mjs
  - src/work-loops.mjs
  - src/loop-bounds.mjs
  - src/effects/run-transitions.mjs
  - .aof/loops/autonomous-cascade.md
  - src/bundle/loops/autonomous-cascade.md
  - wiki/work/53_milestone_loop-artifact/stories/01_story_loop-engine/tasks/05_declaration-and-resume.feature
  - wiki/work/55_milestone_anchors-and-frozen-set/stories/05_story_l3-unlocked/tasks/00_the-ladder-widens.feature
  - wiki/work/78_milestone_loop-execution-record/VERIFICATION.md
  - wiki/work/78_milestone_loop-execution-record/OUTCOME.md
  - wiki/work/78_milestone_loop-execution-record/RETROSPECTIVE.md
  - wiki/work/78_milestone_loop-execution-record/stories/00_story_execution-projection/tasks/00_the-execution-model.feature
files:
  - src/work-loop.mjs
  - src/commands/loop.mjs
  - test/work-loop-declaration.test.mjs
  - test/work-loop-determinism.test.mjs
  - test/work-loop-stop-set.test.mjs
  - test/support/work-loop-story-fixtures.mjs
  - test/loop-command-board-state.test.mjs
  - test/loop-cap-exhaustion-carries-the-record.test.mjs
  - test/loop-only-fail-redrives.test.mjs
  - test/loop-record-reaches-the-redrive.test.mjs
  - test/loop-record-projection.test.mjs
  - test/loop-record-command.test.mjs
  - test/arch/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/acd-loop-probe-contract.test.mjs
  - test/loop-declaration-join.test.mjs
  - test/arch/acd-shell-loop-id-is-declared.test.mjs
  - test/arch/acd-registry-fixture-closed.test.mjs
  - scripts/test.mjs
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A standalone story (no parent) is self-contained.
-->
# 102 · The declaration names its loop — the join key that turns two dead instruments on

## User story

As an operator,
I want every run a loop mints to carry the loop's own registry id,
so that `aof work loop-record` and `aof work observe` report what actually ran instead of correctly
reporting nothing.

## Why

**Two shipped instruments currently measure zero, for one reason.** Milestone 78 delivered the loop
execution record — projection, renderer, command, sign-off block, doctor lane, ten fitness functions,
all green. Run against this repository it answers `runsFound: 0, runsCarryingDeclaration: 0, ratio: 0`
with all seven registry loops under `declared-never-ran`. That is the honest-absence behaviour 78
scoped in and built deliberately, and it is also the whole of what the milestone can ever report until
this story lands.

**The cause, measured rather than assumed** (`78/VERIFICATION.md` **F-78-A**). `buildLoopDeclaration`
(`src/work-loop.mjs:903-923`) returns exactly seven keys — `loopRunId`, `scope`, `level`, `cap`,
`phase`, `cycle`, `startedAt` — and **no loop id**. `scope` is a work-ref range and `level` is
L1/L2/L3; neither resolves to a registry record. 78's projection joins a run to a loop on
`brief.loop.id`, a key nothing in the repository writes. So coverage stays 0 **even once the loop shell
is driven** — which is one step worse than 53/ADR-003's measured "0 of 61 runs carried `brief.loop`":
that number reads as "nobody has run the loop yet", when the truth is "running it would still not
join".

**The second customer is what raises the priority.** `aof work observe 78 --write` at 78's close
reported **0 agent runs across 0 sessions with 418 unattributed agent runs** — every transcript found,
none joinable. Two independent instruments now measure nothing for the same missing key
(`78/RETROSPECTIVE.md` **R7**). A gap with one customer gets deferred indefinitely; this one has two.

**Why it is a story and not a chore.** The deliverable is a behavioural contract with acceptance
criteria worth writing down — which id a run carries, what happens when a loop is driven outside the
registry, and whether an existing run record without the key is a gap or an error. A chore's ticked
checklist is the wrong shape for that.

## Tasks

- [x] `tasks/00_the-eighth-key.feature` — the envelope gains `id`, appended last, superseding
      53/01/05's frozen seven; a declaration cannot be built without a shaped id; the resume reader's
      five recovered keys are untouched, so a run minted before this change still resumes.
- [x] `tasks/01_the-shell-declares-the-loop-it-is.feature` — the shell hands in the one loop it IS,
      `loop:autonomous-cascade`, as a constant read from one home; the same id across every phase,
      cycle and resume of an engagement; the shell reads no registry at run time and the drift is
      caught by a check over the shipped records instead.
- [x] `tasks/02_the-join-closes.feature` — built by the producer, minted through the store, read back
      and joined by 78's projection: coverage non-zero, the loop off `declared-never-ran`, an
      undeclared id reported through `ran-undeclared` rather than raised, and a pre-existing
      empty-brief run counted rather than dropped.

## Notes

**Scope boundary inherited from 78.** `78/SPEC.md` puts instrumenting the loops out of scope in as many
words — *"The join key is `brief.loop` and it belongs to 53. This milestone reads it; if 53 has not
populated it, this milestone renders the absence honestly and says so."* This story is the other half
of that sentence. 78 is `done` and is not reopened; nothing here changes 78's projection, renderer,
writer or controls, and FF-7801's pinned direct-import set must stay `["src/loop-bounds.mjs"]`.

**The settled stop reason is the adjacent gap.** Decided below: it does not ride along.

**Lesson to apply at refine, from the milestone that found this** (`78/RETROSPECTIVE.md` **R1**): when a
contract names a field another component produces, open the producer and read the literal before the
contract is locked. This story exists because that was not done for `brief.loop.id`.

## Decisions taken at refine

**The adjacent gap does NOT ride along.** The loop id is known when the declaration is BUILT and rides
the mint that already exists; a loop's settled stop reason is known only when the loop HALTS, after the
engagement's last run is already terminal. Carrying it needs a post-mint amendment of a written brief
(the shape `recordAnchorReading` uses, `src/run-store.mjs:707`), a new store export and a call at each
halt site — a different mechanism, not an eighth key on the same envelope. 78's projection already reads
it forward-compatibly (`lastDeclaration?.stopReason ?? null`), so the gap keeps its own discharge
condition in `78/OUTCOME.md`.

**An undeclared loop id is REPORTED, not refused** — a departure from this story's opening sketch,
argued in `tasks/01`: 78 ships `ran-undeclared` for exactly it, a consumer repository may legitimately
have no `.aof/loops/` (`loadLoops` answers `present: false` by design), and a runtime refusal would turn
a reporting gap into an outage. **An ABSENT id is still refused**, which is the different question:
without that, a later edit could drop the id and leave a declaration that still validates, still
resumes, and silently returns coverage to zero — F-78-A reintroduced with nothing red.

## Boundary — the phase-command path is not instrumented here

Measured at this refine: **64 run records** under `wiki/work`, **3** carrying a `sessionId` (96/00's
ladder, working), **0** carrying any `brief.loop`. So the runs `aof:refine` / `aof:continue` /
`aof:verify` mint still carry no declaration after this story, and `loop-record` reports on the shell
alone. That is a different deliverable: it needs a decision about which registry loop each phase command
actuates, a way to group phases into an engagement with no shell to mint the `loopRunId`, and it lands
on the four bundle prompts and their rendered copies — the surface 96/00 opened. `work:run-start`
already accepts a `brief`, so the door exists. Raised so it is scheduled, not created here.

**Two residuals, named rather than carried silently.** `53/ARCHITECTURE.md`'s FF-5307 entry will
describe seven keys once this lands: the control's implementation is widened in the same diff, the
delivered register of a `done` milestone is not edited, and the superseding statement lives in
`tasks/00` (the F-78-G species). And `.aof/loops/autonomous-cascade.md`'s prose cites
`src/commands/loop.mjs:754` and `src/work-loop.mjs:596-611` for subjects that have since moved; the live
lines were re-measured for `tasks/01` and the generated record is left to its own owner.
