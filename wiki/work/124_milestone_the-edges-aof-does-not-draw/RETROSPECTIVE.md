---
type: milestone
doc: retrospective
number: 124
slug: the-edges-aof-does-not-draw
title: "Retrospective — the edges aof does not draw"
created: 2026-09-08
updated: 2026-09-08
---
# 124 · Retrospective

Milestone-level lessons. Each story carries its own `RETROSPECTIVE.md` for the lessons of its own
build; these are the ones no single story could state. Findings are **referenced**, never restated:
they live in `VERIFICATION.md`.

## R1 — The fitness gate had been vacuous for a whole commit, and only its own guard said so

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** the test face · **Raised by:** the developer of `124/00`, reading a `case-failed` grade

**What happened.** `b088825c` moved every arch control one level down into family folders and
updated the rubric runner's comments but not its enumeration. From that commit until `124/00`
tripped it, `scripts/test-rubric.mjs` swept zero controls; `work:grade` could not go green, and the
finding sat unread as `case-failed` for a day and a half.

**Why.** A flat `readdir` over a root that had just gained an interior. The runner's non-vacuity
guard is the only reason this failed loudly instead of banking a green gate.

**Lesson.** A sweep whose root can gain an interior needs a recursive walk *and* a guard, and a
change that moves files en masse owes the same audit to its **runners** that 119 gave to citations.
Refs: `m124/F-05`, `119/R2`.

## R2 — Un-blinding the lane surfaced reds no story could reach, and the loop has no word for "stories green, tree red"

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** the developer of `124/00`, then the accept

**What happened.** With the lane restored, three controls were red at HEAD: FF-11903, FF-9603 over
another lane's `PLAN.md`, and FF-6607b over five accepted registers. Every story lane in 124 was
green. `aof:continue`'s terminator asks "do the fitness functions pass", and the honest answer was
"the stories' do; the tree's do not, and none of the reds is inside this milestone's write set".

**Why.** Story-scoped lanes structurally cannot see a red one directory over (`119/R3`); the
whole-tree run is the first place inherited reds appear, and here the whole-tree run cannot execute
until the tree is committed.

**Lesson.** Expect the milestone gate to surface debt the stories never touched, and triage it as the
gate's, not the stories': accept the stories on their own lanes, and route each inherited red to the
lane or ruling that owns it. Refs: `m124/F-01`, `m124/F-03`, `m124/F-04`.

## R3 — An instrument that persists its own failure text under its own subject can only ever rise

- **Kind:** mistake · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** the accept, measuring why FF-11903 could not fall

**What happened.** FF-11903 sweeps every file under `wiki/work/**`. A graded run record stores the
runner's failure text — which for this control is the full casualty list — and `aof work observe`
writes every path an agent typed. Three run records kept 49 of 66 casualties alive, and the accept's
own observability snapshot added one more. No document repair could bring the count under the
ceiling; the ratchet was jammed shut by its own output.

**Why.** The ADR's subject is a path cited in a *delivered document*, and the walk did not
distinguish an authored document from a machine-written record beside it.

**Lesson.** A sweep over a subject tree must exclude the subtrees the tooling writes into it —
especially any that can carry the sweep's own output. Fixed at accept by scoping the walk and
lowering the ceiling to the re-measured 47. Refs: `m124/F-01`, `119/F-40`.

## R4 — The rename map is squash-blind, and 119's green gate did not survive its own merge

- **Kind:** blind spot · **Area:** process · **Stage:** verify · **Owner:** operator · **Raised by:** FF-6607b at the accept

**What happened.** 119 accepted on a green whole-tree gate. The PR squash-merged, and four of its
moved controls — moved in one commit and rewritten in later ones — collapsed to delete-plus-add at
23–47% similarity, below git's 50% rename threshold. Five accepted registers now cite paths the
rename map cannot see, and the doctor reports each as `control-unresolved`.

**Why.** `119/ADR-004` is explicit that the map is prospective and pays only for moves committed *as*
renames; a squash merge re-derives the diff and can lose exactly that.

**Lesson.** A move that will be squash-merged must either land as its own PR, or the accepted
registers must be re-pointed at the accept — and the choice is a ruling, because re-pointing a
delivered register was refused at 119 on immutability grounds. Refs: `m124/F-03`.

## R5 — A story declaring a new file under a budgeted layer must declare the budget table, and nothing derives that

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** the developers of `124/01` and `124/02`

**What happened.** `124/00` declared `acd-source-directory-budget` because its new control lands in
a layer whose row is a shrink-only ceiling at the delivered count. `124/01` and `124/02` each landed
a new control in another budgeted layer and did not declare the table; both builds had to write a
file outside their contract.

**Why.** The obligation is mechanical (new path under a budgeted directory ⇒ the table's row moves)
and lives in nobody's head twice; the check that would derive it does not exist.

**Lesson.** Until a check derives it, the refine checklist owns it: any `files:` entry that is new
and sits under a directory FF-11904 budgets adds the budget table to `files:`. Refs: `m124/F-06`.

## R6 — The first feasibility agent stalled for most of a working day, and the run finished in eight minutes once restarted

- **Kind:** blocker · **Area:** process · **Stage:** refine · **Owner:** operator · **Raised by:** the refine session; confirmed by `observability/`

**What happened.** The refine's first feasibility agent produced nothing past its opening line for
5h44m and was stopped and re-run; the re-run completed in eight minutes. The observability snapshot
puts the milestone's real active time at 2h11m inside a 36h07m span, with 33h56m idle.

**Why.** The stall class `aof work observe` exists to surface and aof still has no watchdog for.

**Lesson.** Read the report's "Lost time" table before reading its token table: this milestone's
wall-clock is a stall story, not a compute story. Refs: `observability/snapshots/`, `m124/F-13`.

## R7 — An ADR that writes to a budgeted document must price the budget

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** the developer of `124/01`

**What happened.** ADR-006 instructed the story to append a 12-line ledger entry verbatim. The ledger
sat at exactly its shrink-only ceiling, so any append at all was a red; the entry the story was
already repairing was compacted from 47 lines to 13 first, and the new entry landed inside budget.

**Why.** The ceiling is invisible from the ADR; nothing in the architecture pass asks what the target
document's headroom is.

**Lesson.** When an ADR names a document with a budget as its write target, the ADR states the
headroom it needs and where it comes from. Refs: `m124/F-10`.
