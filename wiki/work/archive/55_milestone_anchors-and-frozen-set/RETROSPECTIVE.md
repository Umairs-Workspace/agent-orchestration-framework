---
type: milestone
doc: retrospective
number: 55
slug: anchors-and-frozen-set
title: "Retrospective — the milestone about trustworthy instruments, which edited nine of them"
created: 2026-08-27
updated: 2026-08-27
---
# 55 · Retrospective

Lessons from delivering and accepting the milestone. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

Distilled from `STATE.md`'s in-flight notes (now archived), this milestone's `VERIFICATION.md`
findings (`F-55-00-1` … `F-55-M-8`), the two gate refusals of 2026-08-27, and the empty
`observability/` snapshot. **Reference, never restate** — each entry points at the finding rather than
retelling it.

## R1 — Nine times in one milestone, a control in service went red under a story's own change, and the control was edited

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer / architect · **Raised by:** the milestone gate and a commit partition
- **What happened.** Four reconciliations, each individually defensible: a leg dropped
  (`F-55-00-1`), a pin dropped (`F-55-02-1`), a pin moved (`F-55-01-2`), a byte-freeze replaced with
  something narrower (`F-55-02-2`). Then five more left red rather than reconciled at all
  (`F-55-M-1` … `F-55-M-5`).
- **Why.** When a guard goes red under your own diff, the guard is the thing in front of you and the
  invariant is not. Editing it restores green in one line and produces no visible loss, because the
  loss is a failure that will now never happen.
- **Lesson.** **A frozen seam moves only on a declaration, never on a diff** — the same shape as
  53/FF-5302's *"raising the ceiling is an ADR decision, not a diff."* The countermeasure is not
  "check before you edit"; it is that the edit is not the author's to make alone.
- **Refs:** `@finding-F-55-00-1`, `@finding-F-55-02-1`, `@finding-F-55-01-2`, `@finding-F-55-02-2`

## R2 — The rule "never edit a control" is unfollowable, and the red probe is what makes the honest version work

- **Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** product-owner · **Raised by:** the second milestone gate
- **What happened.** Two of the five gate repairs — `F-55-M-3` and `F-55-M-5` — were themselves
  control edits: FF-6904 extended to read a new declaration kind, and a pinned call-shape regex
  re-aimed to the reach it protects. By R1's rule they are the pathology; by outcome they are the
  correct repair.
- **Why.** An instrument whose subject legitimately moved must move with it, or it stops measuring
  anything. R1 covers moving a seam wrongly and does not cover an instrument that must be re-aimed.
- **Lesson.** **A control may be re-aimed only with a red probe recorded against its RE-AIMED form.**
  What separates a re-aim from a quieting is not intent — every one of R1's nine had intent — it is
  having watched the changed control fail on the thing it must still catch. That is FF-5503's own
  reasoning (*"an extension never observed failing is indistinguishable from one never written"*)
  generalised from extensions to re-aims. This completes R1 rather than replacing it.
- **Refs:** `@finding-F-55-M-3`, `@finding-F-55-M-5`, `55/ARCHITECTURE.md` FF-5503

## R3 — Five regressions in other milestones' controls were invisible to every story gate, structurally

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the first milestone gate
- **What happened.** Five stories passed their own scoped lanes and were marked `done`; the full lane
  then found five failures, every one in a control owned by another milestone (53, 69 ×2, 47, and the
  bundle census). All five stories needed rework after acceptance.
- **Why.** `aof:verify`'s scope rule runs a story's own scenarios at the story gate and the whole
  lane once, at the milestone gate. No story's scoped lane runs another milestone's controls, so a
  cross-milestone regression is *structurally* invisible until the one place that runs everything.
- **Lesson.** This is the documented trade being paid in full, not a failure — the rule names it out
  loud (*"a poisoning story is caught at the gate, not immediately, and may need rework after being
  marked done. That is the intended trade, not an oversight"*). The carryable form is narrower:
  **a story that edits, deletes or re-pins a file another milestone's register names must run that
  control at its own gate**, because the coupling is knowable from the register at build time and
  costs one test to check. Widening every story to the full lane is the wrong fix; reading the
  register for the file you are about to touch is the cheap one.
- **Refs:** `@finding-F-55-M-1` … `@finding-F-55-M-5`

## R4 — A repair sent back to a story returned having reversed another milestone's recorded decision, on a premise that was false

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** the 55/01 second gate
- **What happened.** `F-55-01-1` routed a blocker back with the preferred repair named — delete the
  unrequested board route. It came back with the route **kept** and milestone 53's FF-5307 frozen pin
  **moved** to bless it, justified by a claim that the command/board bijection requires a route for
  every registered read. It does not: that suite carries a `BOARD_DEFERRED` door, and the three
  sibling `loops-*` reads were put inside it at 53's gate with a *stronger* reason.
- **Why.** The door existed, was documented at another milestone's gate, and was not read. Moving the
  pin was locally sufficient to restore green and required knowing nothing about why the pin was there.
- **Lesson.** **A finding that names its preferred repair still needs the alternative's reasoning
  checked, not just its outcome.** And more usefully: when a control refuses a change, the first
  question is *what did the last person to touch this deliberately exclude, and where did they write
  it down* — the exclusion list is where that answer lives.
- **Refs:** `@finding-F-55-01-1`, `@finding-F-55-01-2`, `m53/F-14`

## R5 — The gate's own baseline measurement deleted 124 tracked files, and only verifying the result caught it

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the verifier, post-hoc
- **What happened.** To attribute the lane's failures honestly, `main` was checked out as a
  `git worktree` with this tree's `node_modules` junctioned in. `git worktree remove --force`
  followed the junction into the **real** `node_modules`, and through `node_modules/@aof/ui` — a
  workspace symlink back to `ui/` — deleted 124 tracked files plus the build output. Recovered in
  full, and the lane re-run to prove the recovery by measurement rather than by hope.
- **Why.** A directory junction is transparent to a recursive delete, and a workspace symlink inside
  the junctioned tree points back at source. Neither is visible in the command that does the damage.
- **Lesson.** **Never junction a shared `node_modules` into a git worktree** — copy it, or let the
  worktree install its own. Milestone 70's `R6` recorded three silent destructive losses of
  uncommitted work; this is a fourth, and the *only* thing that separates it is that the cleanup was
  followed by a check of the thing it had operated on. That check is the general rule, and it is the
  same discipline this milestone's own subject demands of an instrument.
- **Refs:** `55/STATE.md` (archived verify-time incident)

## R6 — The one measurement the whole accept rests on is not reproducible, in two independent ways

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the operator's re-verify
- **What happened.** Two post-repair runs of an identical tree both reported 42 rather than the 41 the
  repairs predicted, and the 42nd was a **different test each time** (`F-55-M-6`). The operator's
  re-verify then found the tree itself moving mid-run: a concurrent session added 66 uncommitted lines
  to `src/work.mjs`, and the god node read 1426 lines to the test, 1339 at `HEAD` and 1405 in the
  worktree minutes later — one file, three numbers (`F-55-M-7`).
- **Why.** 6,900 process- and filesystem-heavy tests in one process produce resource-pressure flakes;
  and the gate has no exclusive hold on the tree it measures, because nothing gives it one.
- **Lesson.** **A gate's count is not a verdict — the set-difference over failure names AND causes
  is.** Both halves matter: `bundle-asset-manifest-complete/00` failed at both revisions with
  *different causes* and would have filed as pre-existing on a name comparison alone. The repair is a
  gate that measures a **fixed revision** — a clean checkout or a recorded stash boundary — rather
  than whatever the working tree happens to contain, which belongs with 59's instrument audit.
- **Refs:** `@finding-F-55-M-6`, `@finding-F-55-M-7`

## R7 — The single-writer register disagreed with its own prose twice, and a check reads the column, not the prose

- **Kind:** mistake · **Area:** contract · **Stage:** verify · **Owner:** product-owner · **Raised by:** the operator's re-verify
- **What happened.** Five story accept decisions were filed under `## Verification evidence` instead
  of `## Accept decision` (`F-55-01-3`); and `F-55-02-1`'s row narrated *"FIXED"* in its observed cell
  while its `status` cell still read `open` (`F-55-M-8`) — the repair itself was real, confirmed at
  source in FF-5307's pin map.
- **Why.** The single-writer rule prevents *collisions* — two lanes allocating one id — and prevents
  nothing about inattention by the single writer. Both slips are in the artifact that rule exists to
  protect.
- **Lesson.** **Prose is for the reader; the column is the record.** `aof work doctor` reads the
  `status` cell and the section heading, not the narrative, so a row whose narrative and column
  disagree is a row no check can act on. When closing a finding, move the cell in the same edit that
  writes the words — never in the edit that only writes the words.
- **Refs:** `@finding-F-55-01-3`, `@finding-F-55-M-8`

## R8 — The milestone whose subject is anchored measurement produced zero telemetry about its own execution

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** `aof work observe 55`
- **What happened.** `aof work observe 55 --write` at the close reports **0 run records across 0
  declared phases, 0 active time, 0 tokens, no sessions**. Every story was built through
  `aof:continue --solo` in a main session rather than through the loop shell, so nothing minted a run
  record. The retrospective therefore has no per-agent stall or spend evidence to triage.
- **Why.** Telemetry is produced by the loop shell, and the loop shell is not how this milestone was
  built. Nothing refuses that — nor should it — but nothing notices it either.
- **Lesson.** **A milestone that does not route its own delivery through an instrument leaves that
  instrument's coverage claim untested at exactly the moment it matters.** This milestone unlocked L3
  on a gate composed from measurements, while its own execution generated none. The narrow carryable
  form: when the close's `observe` returns an empty snapshot, that emptiness is a finding about the
  instrument's reach, not an absence of information — record it rather than skipping the step.
- **Refs:** `55/observability/` (empty snapshot, 2026-08-27)

## R9 — The milestone about trustworthy instruments shipped an instrument its own repository had ledgered to extinction

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the first milestone gate
- **What happened.** 55/03's arch-test cut source positionally —
  `bundle.slice(0, bundle.indexOf("---", 4) + 3)`, an end computed from a second `indexOf` sentinel.
  Milestone 47's ledger allows **zero** such slices, after *"six instruments found wrong about the
  tree across milestones 45–47"*, and `test/support/source-slice.mjs` already exists as the one home
  whose helpers return `null` so the caller fails loudly instead of asserting over the wrong region.
- **Why.** The ledger is enforced by a control that runs in the full lane, which no story gate runs
  (R3) — so the author got green feedback for the whole story.
- **Lesson.** **A ledger at zero is not self-enforcing; it is a claim that has to be reachable at the
  moment someone would violate it.** Worth more than its non-blocker severity suggests: a milestone
  whose stated subject is measurements that cannot be argued with shipped an instrument of exactly
  the kind its own repository had already found wrong six times.
- **Refs:** `@finding-F-55-M-4`; the ledger itself is `test/arch/acd-test-suite-registration.test.mjs`
  and its `ARCHITECTURE.md` row in milestone 47 — cited by file rather than by id, because 47 records
  that finding in prose and not as a register row, so the id does not resolve as a citation.
