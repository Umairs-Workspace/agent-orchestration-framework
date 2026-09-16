---
doc: retrospective
updated: 2026-08-22
---
<!--
  Milestone RETROSPECTIVE.md — answers ONE question: what did we learn that is worth carrying?
  Owner: product-owner. Distilled at the close from STATE.md's `## Feedback (for retro)` notes and
  VERIFICATION.md's findings. Lessons are `## R<n>` headings (ADR-008 ruling 1 — the bare form,
  unhyphenated, which is what memory's parser indexes). REFERENCE the finding; never restate it.
-->
# 68 · Loop telemetry — Retrospective

**The milestone in one line: it set out to stop aof guessing at its own numbers, and it took five
`aof:verify` passes and three blockers to learn that a green lane is not a measurement.** Every
blocker was found by leaving the suite — by probing a fix, by re-running an edited foreign pin, by
driving the seam over the real corpus. None was found by the lanes the stories shipped green. That
is the milestone's own thesis turned on itself: a number nobody has watched fail is not evidence,
and neither is a test.

## R1 · The fix already existed one caller over, and the second caller was written without it

- **Kind:** mistake · **Area:** code
- **Stage:** build · **Owner:** developer · **Raised by:** product-owner at `aof:verify`
- **What happened:** The drive path persisted the captured session id fire-and-forget, so the write
  could land after the settle and restore a pre-settle snapshot. The sibling caller
  `src/mesh-worker-execution.mjs` had already solved this and said so in a comment naming *"the
  attribution write racing the settle"*. The same story added the second caller without carrying the
  shape across; the fix was a straight port of the sibling's.
- **Why:** The guarantee lived as a hand-copy rather than as a shared function, so a new caller
  inherited nothing. It took ADR-009's later extraction (`captureSessionIdOnRecord`) to give it one
  home — which is exactly why the drive command could be written without it in the first place.
- **Lesson:** When a story adds a SECOND caller to a seam, diff it against the existing caller before
  review. A comment in the sibling naming a hazard is a specification, not commentary. If a guarantee
  has to be hand-copied to hold, extract it instead of copying it.
- **Refs:** `VERIFICATION.md` `@finding-F-04`; ADR-009 Decision 3.

## R2 · A story that EDITS another milestone's pinned test has changed a delivered guarantee

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at `aof:verify`
- **What happened:** Story 68/01 shipped with structural CONFORMS, behavioural PASS and 43/43 on its
  own lanes. The blocker was caught only because verify re-ran the milestone-53 pinned suite the
  story had edited — and even then it failed one run in five.
- **Why:** Story-scoped lanes run the story's own scenarios by design. A pin the story EDITED is the
  one piece of another milestone's contract the story is known to have touched, and nothing re-ran it.
- **Lesson:** The edit is the signal. A story that touches a pin belonging to another milestone has
  changed something that milestone froze — re-run that pin at verify, not only at build.
- **Refs:** `VERIFICATION.md` `@finding-F-04`.

## R3 · A flaky failure in a settle/persist path is a race until proven otherwise

- **Kind:** near-miss · **Area:** code
- **Stage:** verify · **Owner:** developer · **Raised by:** product-owner at `aof:verify`
- **What happened:** The defect reproduced in 1 of 5 probe runs and looked like flake.
- **Why:** A write-ordering defect surfaces probabilistically; its failure rate is a property of the
  scheduler, not of the defect's severity.
- **Lesson:** Re-running until green is the exact wrong response. Treat intermittency on a
  settle/persist seam as a race and go find the unawaited write.
- **Refs:** `VERIFICATION.md` `@finding-F-04`.

## R4 · A scenario whose `Given` describes an ordering must FORCE that ordering

- **Kind:** near-miss · **Area:** contract
- **Stage:** verify · **Owner:** QA · **Raised by:** product-owner, by probing the fix
- **What happened:** The five `@bug` scenarios closing the race all open with *"the id's persist has
  not completed when the run settles"* and none arranges it — they call the scripted driver and race
  the ambient scheduler. Measured against the committed pre-fix shape over four runs: `12/13`,
  `12/13`, **`13/13` fully green on known-defective code**, `11/13`, naming a different scenario each
  time.
- **Why:** The `Given` was written as narration rather than as arrangement, so the guard's green is
  indistinguishable from a broken one — the milestone's own red-probe principle, applied to a
  behavioural scenario.
- **Lesson:** Hold the promise, inject the barrier — never race the scheduler. And the open question
  worth answering: the red-probe obligation deliberately reaches `FF-NN` ids alone, but a `@bug`
  scenario closing a **blocker** on a silent timing-dependent defect is precisely where a green lane
  proves nothing. Probing it cost one command.
- **Refs:** `VERIFICATION.md` `@finding-F-05`.

## R5 · A fix that changes an ordering must sweep the prose that described the old one

- **Kind:** mistake · **Area:** code
- **Stage:** build · **Owner:** developer · **Raised by:** product-owner, by probing the fix
- **What happened:** After the race was closed, `src/commands/drive.mjs` still told its reader the
  driver invokes `onSessionIdCaptured` fire-and-forget — the exact claim the fix falsified — three
  lines above the belt-and-braces write that claim justifies.
- **Why:** The fix changed an ordering in code and left the ordering described in prose untouched.
- **Lesson:** A stale comment describing a fixed race is worse than no comment: it re-teaches the
  defect to the next reader. Sweep the prose in the same commit as the ordering.
- **Refs:** `VERIFICATION.md` `@finding-F-06`.

## R6 · A result-content classifier needs markers a command EMITS, never words it MENTIONS

- **Kind:** mistake · **Area:** code
- **Stage:** build · **Owner:** developer · **Raised by:** QA at review, then product-owner on the real corpus
- **What happened:** The story existed to retire a command-name regex that reported a confident
  **zero**. Its first replacement classified **53.3% of 1,323 Bash results** as test runs with ~95% of
  those wrong, because the markers were bare words (`test`, `spec`, `passed`) that file names, paths
  and prose all contain. Repaired to count-bearing/structural markers, it fell to 1.1% of read-only
  calls.
- **Why:** The generalisation was recorded in STATE at the time — and then applied to **five of the
  seven** alternatives. The two missed are an optional colon that matches bare prose and an
  `AssertionError` that matches any document *quoting* a stack trace, including this milestone's own
  `VERIFICATION.md`.
- **Lesson:** Applied to five of seven is not applied. When a lesson names a class, sweep the whole
  class in the same pass and count what you swept.
- **Refs:** `VERIFICATION.md` `@finding-F-07`, `@finding-F-10`.

## R7 · A story that breaks ANOTHER milestone's control is invisible until the gate, and `done` has no reopen edge

- **Kind:** blocker · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** the milestone gate sweep
- **What happened:** Story 68/01 turned four controls of milestones 42 and 53 red. Nothing the story
  ran could have reported them; they surfaced at the gate, against a story already accepted and
  marked `done`. `aof work status 68/01 in-review` was then **refused** — `done` is terminal and
  there is no reopen edge — so the story read `done` on disk and in the fleet for two passes while a
  blocker stood against the code it delivered.
- **Why:** Story-scoped lanes run the story's own scenarios plus its own `FF-NN` by design; that
  trade is stated in `aof:verify` and it worked exactly as written. The lifecycle, however, cannot
  express the rework the trade predicts.
- **Lesson:** Either the cross-milestone control set runs per story, or `done → in-review` becomes a
  legal move. Until one exists, the gate can find rework it cannot record. Do **not** resolve this by
  hand-editing frontmatter — the refusal is evidence about the item, not an obstacle.
- **Refs:** `VERIFICATION.md` `@finding-F-09`; ADR-009.

## R8 · A red probe does not carry across passes if the bytes moved

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the fourth pass
- **What happened:** FF-6805 and FF-6806's probes were re-performed rather than read off the register,
  because `src/work-observe.mjs` had changed by 242 lines in between. The same question arose again at
  the fifth pass for F-09's controls and was answered the same way.
- **Why:** The register has no time dimension. A row reading *"green, probed"* is silent about WHICH
  bytes were probed, and a probe on superseded bytes proves nothing about the current ones.
- **Lesson:** A probe cell should carry the diff-stat or commit it was performed against, so a later
  reader can distinguish a current probe from a stale one without re-deriving the file's history.
- **Refs:** `VERIFICATION.md` `## Fitness functions` FF-6805 / FF-6806 rows.

## R9 · A branch-only failure is a HYPOTHESIS, and the in-process replica needs the box to itself

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the fifth pass
- **What happened:** The fourth pass called `build-sea-recipe-guards/F14` a drive-letter-case artifact
  of the verifier's harness. The fifth pass ran it with the casing corrected and it was **still red**
  — then green the moment nothing else was running. The real mechanism is
  `scripts/build-sea.mjs:80`: `assertSafeOutDir` resolves `path.resolve(outDir)` against the ambient
  `process.cwd()` while ignoring the `cwd` option its own signature accepts, so a second replica
  process on the box can turn the assertion red.
- **Why:** Two passes produced two wrong-or-incomplete diagnoses of the same green test, because each
  stopped at the first explanation that fit rather than reading the source it accused.
- **Lesson:** Confirm a branch-only failure by isolation **and** a source read before calling it a
  regression — the fourth pass's own lesson, which the fourth pass then only half-executed. And never
  run focused probes concurrently with a gate sweep: it corrupts both, and the corruption looks
  exactly like a finding.
- **Refs:** `VERIFICATION.md` `### The full-repo milestone gate sweep — fifth pass`.

## R10 · The junction countermeasure is now measured, not merely reasoned

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the fifth pass
- **What happened:** The fourth pass destroyed the real `node_modules` — `git worktree remove --force`
  follows the NTFS junction that gives a comparison worktree its packages, and the `npm ci` repair
  then removed the tracked `ui/` tree. This pass applied the stated countermeasure — `rmdir` the
  junction first, which unlinks rather than recurses, then remove the worktree — and verified
  `node_modules` at its 84 entries with `git status --porcelain ui/` empty.
- **Why:** The countermeasure had been reasoned from the failure but never executed, so it was
  advice rather than evidence.
- **Lesson:** The method is safe when the unlink precedes the removal, and that is now measured. The
  cross-`main` replay runs at every milestone gate, so this belongs wherever that method is written
  down.
- **Refs:** `STATE.md` `## Feedback (for retro)`; `VERIFICATION.md` fifth-pass sweep.

## R11 · A telemetry milestone must check its producer is on the path the project actually uses

- **Kind:** misunderstanding · **Area:** architecture
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner, driving the seam over the real corpus
- **What happened:** The join is correct, double-counting is structurally impossible and snapshots are
  append-only — and `aof work observe 68` reports **0 agent runs across 0 sessions and 283
  unattributed**, re-measured at the accept. Every run record predating 68/01 carries
  `sessionId: null`, and this repo drives its ACD work from the main session rather than through
  `aof work run`/`drive`, so the producer that would populate the join is not on the path the project
  uses.
- **Why:** The trade — honest emptiness over a 12.6%-double-counting lie — is right and was made
  deliberately. But it was discovered at verify, not at refine, when the scope was no longer movable.
- **Lesson:** A measurement milestone should drive one end-to-end measurement over the REAL corpus at
  refine, before the stories are cut. It is the only step that would have surfaced this in time.
  "The numbers are true" and "there are no numbers" look identical in a green suite and completely
  different to the next author who has to cite them.
- **Refs:** `VERIFICATION.md` `@finding-F-08`; `OUTCOME.md` `## Gaps`.

## R12 · A fitness function's crudeness becomes a design constraint, and that should be noticed at refine

- **Kind:** misunderstanding · **Area:** architecture
- **Stage:** build · **Owner:** developer · **Raised by:** the build, discovering the constraint
- **What happened:** STATE had left "where the price table lives" to the build. The build found the
  answer already forced: FF-6803 and FF-6804 scan `src/**` *excluding* `run-store.mjs` and trip on any
  module naming the four buckets or carrying `costUsd` + `priceTable` + a multiplication operator —
  **including a `*` inside a comment**. No producer module can build or price an envelope and pass, so
  the table lives in the writer.
- **Why:** The outcome is consistent with ADR-003/004's enforce-in-the-writer intent, but it was
  decided by a detector's coarseness rather than chosen on its merits.
- **Lesson:** When a control's detector is coarse, its coarseness IS a design constraint. Surface it
  at refine so the design is chosen deliberately and recorded as a decision, rather than discovered at
  build and rationalised afterwards.
- **Refs:** `STATE.md` `## Feedback (for retro)`; ADR-003, ADR-004.

## R13 · Phrase a mutual-exclusivity claim structurally, never as a value-overlap the data cannot express

- **Kind:** near-miss · **Area:** contract
- **Stage:** refine · **Owner:** QA · **Raised by:** QA at behavioural review
- **What happened:** A Scenario-Outline row read *"an `input` that includes the cache-read count → the
  buckets are mutually exclusive"*. QA flagged it as over-promising a **value-level** overlap refusal
  the writer cannot evidence: from four opaque integer buckets, a folded `input` is indistinguishable
  from a legitimately large one. Restated to the guarantee actually enforced *by construction* — an
  inclusive/fold-in bucket is refused because the four-key set is closed.
- **Why:** The claim was written as a property of the values, while the enforcement is a property of
  the schema. Only the second is checkable.
- **Lesson:** State an exclusivity guarantee as the structural refusal that implements it. A contract
  clause asserting something the stored shape cannot distinguish will either discharge vacuously or
  demand a detector that cannot exist.
- **Refs:** `STATE.md` `## Feedback (for retro)`; ADR-003.

## R14 · A contract clause naming a state the implementation cannot produce discharges vacuously

- **Kind:** near-miss · **Area:** contract
- **Stage:** verify · **Owner:** QA · **Raised by:** QA at 68/03 review, flagged not edited
- **What happened:** Two clauses were found discharging without asserting anything. `tasks/01`'s
  *"distinguishes that from a category it could not classify"* is vacuous — the classifier emits
  exactly two values (`test` / `other`) and has no unclassifiable state to distinguish. `tasks/00`'s
  *"is absent from the transcript entirely → reported as unattributed"* is not discharged as written:
  collection walks session DIRECTORIES, so a run record whose session produced no transcripts yields
  zero agents **and** zero unattributed — reported nowhere, silently.
- **Why:** Both clauses describe a third state by analogy with systems that have one. The
  implementation has two states and one blind spot, and neither clause maps onto either.
- **Lesson:** When authoring a clause about a residual category, name the value the system actually
  emits for it. If no such value exists, the clause is either a feature request or a deletion — decide
  which at refine rather than discovering it discharges vacuously at verify.
- **Refs:** `STATE.md` `## Feedback (for retro)`; `tasks/00`, `tasks/01` of story 68/03.
