---
type: story
doc: retrospective
number: 01
parent: 127
slug: one-enumerator-three-roots
title: "Retrospective — one enumerator, three roots"
created: 2026-09-12
updated: 2026-09-12
---
# 127/01 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A count of second-scanners taken at framing is a floor, and the sweep at build is what finds the rest

- **Kind:** near-miss · **Area:** contract · **Stage:** refine/build · **Owner:** architect · **Raised by:** developer

**What happened.** The SPEC counted seven work-root scanners and ADR-001 §5 tabled them. The
developer's sweep at HEAD found an eighth — `src/work/observe.mjs`, three functions `readdir`-ing a
hard-coded `wiki/work` with a `/^(\d+)_/` of their own — and found two of the seven were not what the
table said (doctor's `:541` is the ORPHAN lane, which must see what the enumerator drops;
`provenance.mjs` is a synchronous resolver that cannot await `listItems`). The allow-list went from
three keepers to six, each with a reason.

**Why.** The framing count was made by grepping for the regex, and observe.mjs never spelled the
regex — it matched a numeric prefix and then walked. A scanner is a `readdir` PAIRED with an
item-name match, in any spelling, and only a comment-stripped sweep over both halves sees them all.

**Lesson.** When a story's job is "retire every X", make the control DERIVE the population from the
source (FF-12701's sweep) before the build starts, and treat the framing table as its first input,
not its answer. The ratification rule carried the corrections into the contracts without re-opening
the ADR, which is the right cost. Refs: ADR-001 §5, FF-12701's allow-list, `STATE.md` "Story 01
refined 2026-09-11".

## R2 — A probe as spelled can be unreachable for a reason the control cannot see

- **Kind:** misunderstanding · **Area:** contract · **Stage:** verify · **Owner:** architect · **Raised by:** product-owner at accept

**What happened.** Task 05's first probe — "paste a private `const ITEM_RE` back into
`src/work/doctor.mjs`" — is a duplicate binding, because doctor.mjs also IMPORTS `ITEM_RE` now. The
runner dies at module load with a `SyntaxError` before the sweep runs, so as written the probe never
reaches the control. The same probe applied as the pre-127 shape (import dropped, const added)
reddened exactly the two legs the register names. A second probe for FF-12706 was reachable but
landed on one leg only: `nextWork` references the predicate twice, so dropping it from the driver
walk left the token test green and the fixture leg did the catching.

**Why.** A probe is written against the tree as it will be AFTER the story, and its author reasons
from the control's assertion rather than from the subject's post-story text. The parser and the
second reference are both facts of the post-story file, not of the control.

**Lesson.** A red probe is a small program against the post-story subject; run it once at refine
against the intended shape, or write it as a shape ("give the file back its private copy") rather
than as an edit ("paste this line"). And when a control has a textual leg and a driven leg, say in
the register which one enforces a partial break, so the reader does not take the cheaper leg as the
control. Refs: `m127/F-01`, `m127/F-02`.

## R3 — A story that edits a bundle prompt, retires a pinned regex or adds a suite owes its `files:` the derived files and the ratchets

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer, then FF-7106

**What happened.** The declared write set was short by nine: the bundle manifest and the three
tracked renders of `recent.md` plus the lock (`aof work update` writes them; FF-7106 names exactly
these), and four arch-tests the new suites and the retired regex homes necessarily tripped —
the directory budget, the loop-registry test that had enshrined the THREE `ITEM_RE` homes, a pinned
line number that moved when `nextFreeSlot` retired, and the mesh-blind admission. FF-7106 named this
story until the declaration was repaired at cascade cycle 5.

**Why.** `m126/F-05` and `m126/F-07` measured the same species twice and the lesson was recorded
there; it was not applied at 127/01's refine. Derived renders and ratchets are not derivable from a
write set by reading the code the story changes — they are derivable from the KIND of change (a
bundle prompt edit; a regex home retired; a suite added to a budgeted directory).

**Lesson.** Refine should ask three questions of every story before it locks `files:`: does it edit
anything under `src/bundle/`? (then the manifest, the renders and the lock); does it retire or move
anything another arch-test pins by text or by line? (then that test); does it add a suite to a
directory `acd-source-directory-budget` rows? (then that ratchet). Three yes/no questions at refine
are cheaper than a cycle of the cascade. Refs: `m127/F-05`, `m126/F-05`, `m126/F-07`.

## R4 — A story's grade over a shared checkout is the checkout's grade, not the story's

- **Kind:** blocker · **Area:** loop harness · **Stage:** review/verify · **Owner:** operator (outside this story's write set) · **Raised by:** orchestrator, cycles 3–5

**What happened.** `work:grade` ran the whole fitness tier over the shared checkout and returned
7–11 failing cases, of which ONE was this story's (`F-05`, repaired). The other six were other lanes'
uncommitted work (`src/loop-diag.mjs`, `ui/`, `refine.md`), HEAD's own reds, and FF-11903 — red
because 127's documents cite `src/commands/promote.mjs` and `src/commands/archive.mjs` before stories
02/03 create them. The cascade re-drove `continue 127/01` on those reds until `no-progress` halted
it, and the story sat `in-review` for three re-drives it could not affect. FF-11903 in particular was
a deadlock: it cannot clear before 02/03 land, and the cascade would not reach 02/03 before 01's
grade was green. The only exit was the operator invoking `aof:verify 127/01` by hand.

**Why.** The grade has no notion of whose diff it is grading, and the fitness tier has no
story-scoped selection; the review cap is the only bound, and it is spent on rounds the story cannot
use.

**Lesson.** A story's grade needs either a story-scoped fitness selection (the controls whose
subjects intersect the story's `files:`, plus the story's own suites) or a per-lane worktree at the
milestone base, so a red that is not the story's is reported, not re-driven. And a citation-ceiling
control (FF-11903) over a milestone whose later stories CREATE the cited modules is a forward
reference by design — the register should admit it per milestone rather than deadlock the first
story. Refs: `m127/F-09`, `m127/F-11`.

## R5 — A restarted cascade re-drives `continue` on an `in-review` story, and pays a session to rediscover the gate

- **Kind:** blocker · **Area:** loop harness · **Stage:** review · **Owner:** operator (outside this story's write set) · **Raised by:** orchestrator, cycles 3–4

**What happened.** Two restarts of the cascade each re-drove `continue 127/01` on a story already
`in-review` with its review close recorded and its tree byte-unchanged. Each re-drive spent a full
session verifying at the source that nothing had moved, then stopped at the same gate.

**Why.** `decideLoopPhase` reaches `continue` for any story with tasks unless `lastPhase ===
"continue"` is supplied, and the shell supplies it only in-process (`loop.mjs:1994`); nothing
reconstructs it from the run records on resume. The scope walk is `work:next 127`, which answers
127/01 while it is `in-review`, rather than `--through-review`, which already offers the 02/04 wave.

**Lesson.** On resume, a story whose status is already `in-review` should route to the gate/verify
decision, not to another build; `lastPhase` is recoverable from the newest run record's phase and
should be read from there. Refs: `m127/F-11`, `STATE.md` cycle-4 entry.

## R6 — A NEEDS_INPUT that leaves the run `running` is not a stop the operator sees

- **Kind:** blocker · **Area:** loop harness · **Stage:** review · **Owner:** operator (outside this story's write set) · **Raised by:** orchestrator, cycles 4–5

**What happened.** Two sessions stopped with NEEDS_INPUT for a decision only the operator could make
(force-proceed / guide / stop). Both were left `running`, went silent after their final message, and
were reclaimed `runtime_offline` ~2.5 h later by a restart whose resume path rebuilt the pending fix
from stale progress samples and re-drove the same lane — reading the silence as reaffirmation.

**Why.** NEEDS_INPUT is a line in a transcript, not a run state; the reclaim sweep sees a stale
heartbeat and the resume path sees a fix to retry. Nothing parks the run as "awaiting a decision".

**Lesson.** A blocking question should settle the run into a state the reclaim sweep does not
reclaim and the resume path does not re-drive — parked, carrying the question — so a restart
surfaces the question instead of answering it by default. Refs: `m127/F-11`.

## R7 — The progress sampler and the grade record both lose information the loop then reasons from

- **Kind:** near-miss · **Area:** loop harness · **Stage:** review · **Owner:** operator (outside this story's write set) · **Raised by:** orchestrator, cycle 4

**What happened.** The progress sampler charged the fleet/shell lane's `ui/src/app/*` and
`test/ui/*` edits to this story's run (`filesTouched`, `linesChanged` 2925 → 3113) while the story's
tree was untouched — so a story whose neighbours are busy never stalls by that reading. The grade
record kept 3 of 11 failing cases, and its truncation line pointed at two records that hold the same
3; the dropped 8 had to be re-measured at ~5 minutes of fitness tier per round.

**Why.** The sampler reads the checkout, not the story's `files:`; the grade record is
ceiling-truncated with no spill-over to the run record it claims to have.

**Lesson.** Sample progress over the story's declared write set; keep every failing case on the
graded run (a list of names is small) so a re-drive reasons from the record rather than re-running
the tier to learn what it said. Refs: `m127/F-11`.
