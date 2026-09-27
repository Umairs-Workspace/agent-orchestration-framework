---
doc: verification
updated: 2026-09-04
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 81 truly done, and what is the evidence?
  Written at aof:verify 81. Only sections with content appear (absence is information).
  Standalone story (parent: null) → this is the story's own verification record; there is no milestone
  SPEC box to tick. It DOES carry an OUTCOME.md — story 80 (`done`) widened that artifact from
  milestones to every delivering item.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a CLI + loop-runtime concern, no DESIGN.md, no Route) → no design-conformance lane
  and no ## Design conformance section.
  NO ## Fitness functions register → story 81 is standalone and declares no ARCHITECTURE.md, so it
  declares no `FF-NN` id for a citing register to resolve to. The controls it had to keep green are
  other milestones' and are recorded in evidence, against the run that armed them.
-->
# 81 · The loop's bounds survive a grader that takes real time — Verification

## Method

Lanes in scope: **`@executable` only**. All four task features carry
`@executable @cli @work @work-stream` and nothing else — no `@manual`, no `@uat`, no UI surface — so
no human was brought in, no agent-run manual procedure was owed, and no design-conformance render was
attempted.

The suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs` binds
`:4182`, which this machine's live control daemon holds, and a full run on this node is a known false
signal. Selection was by `node scripts/test.mjs --only <file …>`, which imports the named files and
runs what they export through the runner's own `runSuite()`, so per-case global-home isolation still
applies. Every run carried a throwaway `AOF_GLOBAL_HOME` (hook-enforced).

Selection was scoped to the story and widened only by **who reads what this story touched**: the four
task suites, the grade family's structural gates, and every loop suite the story's own `files:` list
declares as its blast radius — the bounds resolver, the cost ladder, the resume path, the driven row,
the record-to-redrive seam, the cap-exhaustion record and the warm fix loop. It was not widened to
everything: `54/ADR-004 §3` prices the full suite once, at a milestone gate, and this is a standalone
story.

The story's code landed across two commits — `b1ba1197` (tasks 00–03) and `f42b02c4` (the review
findings) — and both are on the branch under verification. Measured footprint across them:
**2,196 insertions / 52 deletions over 9 files**, of which `src/` is four files
(`commands/grade.mjs` +163, `commands/loop.mjs` +237, `work-grade.mjs` +142, `loop-bounds.mjs` +22).

## Verification evidence

### Automated — **224 / 224 green, 0 failures, exit 0**

One selection, 19 suite files:

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only \
  test/grade-waits-without-blocking.test.mjs \
  test/grade-payload-bounded-in-the-writer.test.mjs \
  test/loop-resumed-redrive-declares-its-grade.test.mjs \
  test/loop-fix-transport-shape.test.mjs \
  test/arch/acd-grade-bounded-single-spawn.test.mjs \
  test/arch/acd-loop-probe-contract.test.mjs \
  test/arch/acd-grade-read-face-never-executes.test.mjs \
  test/arch/acd-grade-record-envelope.test.mjs \
  test/arch/acd-loop-cap-single-home.test.mjs \
  test/grade-spawn-bounded-and-single.test.mjs \
  test/grade-rubric-is-declared.test.mjs test/grade-unconfigured-no-op.test.mjs \
  test/loop-bounds.test.mjs test/loop-gate-cost-ladder.test.mjs \
  test/loop-command-resume.test.mjs test/loop-driven-row-carries-the-grade.test.mjs \
  test/loop-record-reaches-the-redrive.test.mjs \
  test/loop-cap-exhaustion-carries-the-record.test.mjs test/warm-fix-loop.test.mjs
```

**34 story-owned cases**, covering all 32 authored scenarios with two cases over — both added by the
review-findings commit for defects the contract had not anticipated.

- **`test/grade-waits-without-blocking.test.mjs`** — `81/00` ×10 against 8 authored scenarios. The
  operator interrupt observed *while the runner is still working*; a timer scheduled before the grade
  firing before the runner exits; the deadline Outline over all four `startToClose`/`heartbeat` rows
  (1800000/900000→900000, 900000/1800000→900000, 600000/900000→600000, 900000/900000→900000); the
  deadline resolving through `src/loop-bounds.mjs` with no hard-coded value, no key read behind its
  resolver and no new `work.loop.*` key; a runner that outlasts the deadline force-killed, graded
  `indeterminate`/`runner-timeout` and leaving no `running` run to be reclaimed; that timeout reaching
  the loop as a named `grade-indeterminate` halt; the guards Outline over all six rows (no shell,
  end-of-input on stdin, both streams captured, over-ceiling output discarded, the re-entrancy stamp
  in the child env, one `--run` = one launch); a child killed at the capture ceiling **not** reported
  as one killed at its deadline; exactly one module spawning the declared rubric with the pure leaf
  spawning nothing; and an unconfigured repository unchanged byte for byte.
  `verifies → tasks/00_the-grade-waits-without-blocking.feature`
- **`test/grade-payload-bounded-in-the-writer.test.mjs`** — `81/01` ×9, one per scenario. The
  re-driven run's `brief.grade` bounded and stating what it dropped with no new top-level run key; the
  cap-exhausted report line bounded and still naming `cap-exhausted` and its producer; the fix
  transport's `## REVIEW FINDINGS` within the ceiling, naming the dropped count and **not empty**; a
  single over-long message cut rather than dropped whole; the writer-refuses Outline across all four
  surfaces; the passes-through Outline at 0, 1 and 20 failures making no truncation statement;
  exactly one bounding function, in the pure leaf, importing nothing from `src/`, with the operator
  render calling it instead of slicing to its own literal; the `GradeRecord` and its `cases` counts
  unchanged on the `--json` face; and an unconfigured repository writing no payload and no statement.
  `verifies → tasks/01_the-payload-is-bounded-in-the-writer.feature`
- **`test/loop-resumed-redrive-declares-its-grade.test.mjs`** — `81/02` ×8, one per scenario. The
  resumed re-drive declaring `graded: false` / `gradeAbsence` from a **key**, not prose; no grade
  fabricated on that run's brief; the pre-interruption grade neither carried forward nor erased from
  where it was recorded; the resume launching no child process; the three-states Outline over all four
  configuration×history rows; an unconfigured repository's resumed document byte-identical to today's;
  `LoopState`'s ten top-level keys in order with the act whitelist and the stop set unchanged; and a
  build the resumed loop completes itself being graded normally.
  `verifies → tasks/02_a-resumed-redrive-declares-its-grade.feature`
- **`test/loop-fix-transport-shape.test.mjs`** — `81/03` ×7, one per scenario. The driver receiving
  exactly the transport's declared keys with no `GradeRecord` among them and the registered input
  schema unchanged; the durable record still landing on the re-driven run through the same seam that
  writes the loop declaration, with no persistence module edited; the rendered findings block carrying
  the failing cases but not the record's provenance, argv, cwd, duration or report shape; the
  every-site Outline over all four causes (gate, reset, continue, resume reconstruction); a validate
  finding told from a graded case by a key on every branch; the grade map read once, at the brief-writing
  seam, and never through `ctx.loopDrive.fix`; and an unconfigured repository's transport unchanged.
  `verifies → tasks/03_the-transport-carries-what-the-transport-needs.feature`

### Regression on the surfaces the contract named — **190 / 190 green**

Every suite the story's `files:` list declares as its blast radius was re-run rather than assumed:

- **`69/00 bounds/00` ×23** — the bounds resolver family, re-run because `gradeDeadlineFromConfig`
  was added to `src/loop-bounds.mjs`. `LOOP_BOUND_CONFIG_KEYS`, `LOOP_BOUND_VALUE_RESOLVERS` and the
  tuner's declared ranges are green **unchanged**, which is the load-bearing half of task 00's "no new
  key" claim — a new key here would have provoked `compoundStepRefusal`.
- **`70/04 task00` ×10 + `warm-fix-loop`** — the warm-resume fix transport, re-run because task 03
  returns `pendingFixes` to `70/04`'s declared shape. The resumed-fix, cold-fallback, cap-two and
  interruption-lineage cases are all green against the narrowed bag.
- **`54/03 task00/01/02` ×21** — the three suites that own the seams this story re-shapes: the
  grade-reaches-the-redrive record, the driven row carrying the verdict, and the cap-exhaustion
  record. Notably `54/03 task01` still asserts *"the ten top-level keys are exactly the ten, in the
  same order"* and *"the act whitelist is untouched"* **with** `gradeAbsence` shipping — which is the
  proof that the declaration rode the `driven` row rather than widening `LoopState`.
- **`loop gate/00` ×9** — the cost ladder, including the amended `54/ADR-007 §1` rule over a
  *configured* fixture. Green, so task 02's "resuming pays for no child process" does not disturb the
  once-per-completed-build pricing.
- **`loop command resume` ×3** — the resume probe/settle/no-prior-run path the absence declaration
  hangs off.
- **`grade/00` ×4, `grade/03` ×6** — the rubric-is-declared and unconfigured-no-op suites, which are
  what keep the "byte-identical for an unconfigured repository" promise honest at the grade face.
- **`61/00` ×33** — the tuner's door, proposal and step suites, re-run because a new `work.loop.*` key
  would have been this story's most likely accidental regression. None was declared.

**Structural gates green:** `arch/53 FF-5304` ×3 and `FF-5310` ×6 (the loop probe contract),
`arch/54 FF-5409` ×2 (`LoopState`'s frozen shape), `arch/FF-5403` ×3 (the `GradeRecord` envelope),
`arch/FF-5405` ×3, `arch/FF-5406` (the pure leaf's import boundary — still holding with
`boundGradeFailures` added to `src/work-grade.mjs`), `arch/69 FF-6901`, `arch/61 FF-6111` ×3.

**Zero new reds, and no inherited red in the selection.**

### At-source probe — the derived deadline, on this repository's real config

The headline claim is a number, so it was read from the shipped resolver against this repository's
own `.aof/aof.config.json` rather than a fixture:

```
startToClose  = 1800000
heartbeat     =  900000
gradeDeadline =  900000
```

The grade's deadline is now **half** what it resolved before the story (`startToClose`, 1,800,000 ms
— twice the window that supervises it). This is the second half of the fault, and the half that was
invisible from the 7.8× runtime margin `F-54-VERIFY-3` measured.

### Live exercise — the async spawn against this repository's declared rubric

`aof work grade 81 --run --json` was run against the working tree (bare `aof` on PATH symlinks to it,
so this exercises shipped `src/`, not a fixture), driving the real declared runner
`node scripts/test-rubric.mjs` through `spawnRubricAsync`.

**It ran, it did not block, and it returned a real record.** Elapsed **234 s**; `launched: 1`;
verdict `fail`; codes `["case-failed"]`; `cases: { total: 1718, failed: 12, skipped: 0 }`; 12
failures carried whole on the `--json` face beside `ref, ran, launched, configured, rubricKey, plan,
floor, grade, detail, reportSource, recorded, recordedAt, recordedRunId, message`. The `GradeRecord`
carries exactly its nine keys — `ref, verdict, codes, runner, report, cases, failures, gradedAt,
provenance` — unchanged.

**The margin this story was written about has halved since it was measured.** `F-54-VERIFY-3` recorded
this repository's rubric at **116 s / 118 s** against a 900,000 ms window — a 7.8× margin. It now runs
in **234 s**, a **3.8×** margin, against a deadline that is *also* now 900,000 ms rather than the
1,800,000 ms the grade used to resolve. The fault stays latent here, but the story's own premise — that
it reinstates as the tier grows — is already half-realised on this repository, two weeks after it was
priced.

**The 12 failing cases are NOT this story's, and three of them are an artifact of grading under a
grade.** Attribution was established by name and by re-measurement, not assumed — see F-81-H and
F-81-I. Story 81's four suites are imported **and spread** into the assembled array
(`scripts/test.mjs:2702-2705, 4790-4793`), so they are registered members rather than mentions, and
none of the registration gates names one of them.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-81-A | `spawnRubricAsync` decoded each chunk before counting it, making the capture ceiling UTF-16 **code units** rather than the bytes its name and `maxBuffer` claim — a multi-byte report was allowed several times its declared budget, and a character split across a chunk boundary decoded correctly only by accident of where the kernel cut. | correctness (bound not the bound it claims) | blocker | Fixed in the story. Chunks are kept as buffers and decoded once at the end. | `src/commands/grade.mjs`, commit `f42b02c4`; armed by `81/00` "output beyond the capture ceiling is discarded rather than graded" | **closed** |
| F-81-B | The overflow kill and the deadline kill both use `SIGKILL`, and the classification read the signal before it read `ENOBUFS` — so a runner that out-talked its ceiling was reported as one that outlasted its deadline. Under `spawnSync` the two were distinguishable for free (its buffer kill used `SIGTERM`), so the ordering only became load-bearing when the spawn went async, and nothing measured it. | correctness (misclassified halt) | blocker | Fixed in the story. `ENOBUFS` is classified ahead of the shared signal. | `src/commands/grade.mjs`, commit `f42b02c4`; armed by a new case, `81/00` "a child killed at the capture ceiling is not reported as a child killed at its deadline" | **closed** |
| F-81-C | `boundGradeFailures` reserved room for its truncation statement using the DEFAULT measure rather than the caller's. A surface that renders more expensively than it stores — the fix transport renders indented JSON — reserved less than its own statement costs and cleared the ceiling only by whatever slack `fitEntries` happened to leave. That is luck, not the refusal the function contracts for. | correctness (bound held by luck) | blocker | Fixed in the story. The reservation uses the caller's measure. | `src/work-grade.mjs`, commit `f42b02c4`; armed by `81/01` "the writer refuses to emit an over-ceiling payload at every surface" | **closed** |
| F-81-D | `measureRenderedFinding` did not measure the `gate` key a statement entry gains **after** the bound returns, so the payload was measured smaller than it would be written. | correctness (measured ≠ written) | blocker | Fixed in the story. The measure now includes the `gate` key. | `src/commands/loop.mjs`, commit `f42b02c4` | **closed** |
| F-81-E | Three gaps in `54/03/OUTCOME.md` § Gaps — "The resume path never walks rung 3", "The grade's failures are bounded only at the human render" and "The transport bag carries more than the transport needs" — are each discharged by this story (tasks 02, 01 and 03 respectively, on the exact discharge conditions those entries state), but all three still read `**Status:** open`. A later reader of 54/03 sees three open gaps that are closed. | record accuracy (stale upstream gap register) | non-blocker | Defer. The repair is a one-line status flip plus a discharge note on each of the three entries, but it edits **another item's** accepted record doc, which is not this gate's to take unilaterally. `54/03`'s own fourth gap sets the precedent for the wording (`**Discharged by amendment** at …`). | backlog — `wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/OUTCOME.md` | open |
| F-81-F | `aof work doctor 81` reports `numbering-gap` naming **81** — with 29, 30, 31, 42, 65, 73, 74, 79, 80, 83–87 and 102 — as missing from the top-level driver sequence. `isDriver` is milestone/uat/spike/chore, so **every parentless story reads as a gap** (`src/work-doctor-freshness.mjs:198-201`). | advisory noise | non-blocker | Defer. Pre-existing and repo-wide, identical to `79/F-79-B` and rooted in the same `isDriver` predicate as `65/F-65-C`. Not this story's to fix. | backlog — carried on `65/F-65-C` | open |
| F-81-G | `aof work doctor 81` reports `rubric-join-unchecked`, so the scenario↔case join was **never machine-checked** for this item. `.aof/aof.config.json` does declare `work.rubric.report` (`{ format: "tap", floor: 500 }`), but the resolver requires a non-empty `report.path`, so it resolves to `null` and the lane reports its honest no-op with a message that reads as "you configured nothing". | config gap + misleading message | non-blocker | Defer. Repo-wide (it fires for every item carrying `@executable` scenarios) and the lane is behaving as designed — it reports that it did not check rather than passing. Identical to `79/F-79-C`. The join was therefore done **by hand** at this gate: all 32 authored scenarios mapped to named cases above. | backlog — carried on `79/F-79-C` | open |

| F-81-H | **This repository's declared rubric cannot be validly graded by `work:grade --run`, because the tier contains the grade's own gates.** `scripts/test-rubric.mjs` is the whole fitness tier enumerated from disk, which includes `acd-grade-bounded-single-spawn` (`FF-5405`) and `acd-loop-probe-contract` (`FF-5409`). The grade sets `AOF_GRADE_RUNNING=1` in the child's environment (`src/commands/grade.mjs:165`), and its own re-entrancy guard refuses any grade whose ambient environment already carries it (`:314-324`), returning `launched: 0, outcome: "spawn-failed"`. So three fitness functions fail *only* when the tier is run as a grade: `FF-5405` "run: true launches exactly one" (`0 !== 1`), `FF-5405` "the spawn sets the re-entrancy stamp" (`0 !== 1`), and `FF-5409` producer `work:grade:runner-spawn-failed` where `work:grade:runner-timeout` was expected. Measured: all three are **green** in the focused selection and **green** in a direct `node scripts/test-rubric.mjs`, and red **only** nested under `aof work grade 81 --run`. | correctness (self-poisoning gate) | non-blocker **for this story**; operationally serious for the loop | Defer to a new item. Story 81 is required by its own contract to *preserve* the stamp ("the re-entrancy stamp is set in the child's environment" is one of its six spawn guarantees) and did; the defect is that the **declared rubric contains the grade's own gates**, which is a rubric-declaration decision made at `69/06` and amended at `54/03`, not a bound this story chose. Left inside `aof work loop <ref>`, it grades every completed build with three self-inflicted failures. | backlog — new item over `scripts/test-rubric.mjs` / `work.rubric`; candidates are excluding the grade's own gates from the declared tier, or making the guard distinguish a nested *test* from a nested *grade* | open |
| F-81-I | The declared rubric is **red on this branch for reasons that belong to other items**. A direct `node scripts/test-rubric.mjs` returns 14 failures, none naming a file story 81 touched: three registration gates (`53/FF-5311`, `58/FF-5809`, `43/ADR-014 E7`) name `test/records-follow-the-story.test.mjs`, `test/delivered-story-records-reported.test.mjs` (both **untracked**, story 85 work-in-progress present in the shared tree at this gate) and `test/arch/acd-prompt-bounds-name-their-home.test.mjs`; `68/FF-6807` and both `42 wave (d)` cycle gates name `src/commands/loop-record.mjs` and `src/loop-record-render.mjs` (story 78/79's modules, landed in the same commit as 81 but not by it); `71/FF-7106` names milestone 96's stories; `chore-dod-checklist` names chore 97; `43/ADR-005` names `promote-gap-to-chore.mjs`; and `ADR-002`, `61/FF-6109`, `59/FF-5905` and `FF-6603` ×2 name surfaces this story never reads. | pre-existing + in-flight tier debt | non-blocker | Defer. Story 81's delivered files (`src/commands/grade.mjs`, `src/commands/loop.mjs`, `src/work-grade.mjs`, `src/loop-bounds.mjs` and its four suites) are committed at `HEAD` and **unmodified in the working tree**, so its own evidence is unaffected by the concurrent story-85 change set. Clearing the tier is the milestone gate's job, not a standalone story's. | backlog — the owning items (85, 83, 96, 97, 78/79) | open |

Triage (PO, inline): **no blocker finding is open.** F-81-A through F-81-D are the four defects the
structural and behavioural review lanes found, all fixed inside the story and all now armed by a named
case — F-81-B by a case the contract did not originally authorise, which is the correct shape for a
defect a contract failed to anticipate. F-81-E through F-81-I are non-blockers routed to backlog; none is a
design-gap, and none is caused by or fixable within this story's scope. Findings live here, never in a
task folder.

**F-81-H is the one a reader should not skim past.** It is not this story's defect and does not gate
its acceptance, but it means the repository's declared rubric currently reports three failures against
itself whenever the loop grades a build — so the loop this story exists to keep alive would re-drive on
a verdict that is partly self-inflicted. It was found only because this gate exercised the real runner
through the real grade rather than trusting the suite, which is the whole point of an at-source probe.

The four review defects share one mechanism worth naming, because it is the story's real lesson: each
is a property `spawnSync` supplied for free — byte-counted buffering, a distinguishable buffer kill,
a fixed render cost — that the asynchronous spawn silently stopped supplying. A synchronous-to-async
conversion is not a refactor; it is a re-implementation of every guarantee the synchronous call was
carrying implicitly.

## Gate

- `aof work validate 81` → **PASS — 81 is well-formed.**
- `aof work doctor 81` → 2 findings, both `warn`, both deferred above (F-81-F, F-81-G). **No
  `control-unresolved` at either severity** — this item is standalone, declares no `ARCHITECTURE.md`
  and therefore declares no control for the check to resolve. No `doc-over-budget`: `STORY.md` is 107
  lines against the 150-line story budget, and `OUTCOME.md` is deliberately unbudgeted for every type
  (`src/work-doctor-budget.mjs`), so the Accept-time artifact-budget preflight had nothing to refuse.
- `aof work doctor 81` Loop-Ready: **80% (8/10) — clears L1**; blocking entries are `grounding` and
  `anchor-grounding`, which are registry-content gaps routed to 55/57 and explicitly out of this
  story's scope.
- **Declared rubric: RED, and not this story's.** `node scripts/test-rubric.mjs` → 14 failures;
  `aof work grade 81 --run` → 12. Attribution by name in F-81-H and F-81-I; no failure names a file
  story 81 touched, and the two runs disagree precisely on the three cases the grade's own
  re-entrancy stamp poisons.

### A note on the tree this gate measured

The working tree moved during verification: it was clean but for `82/SPIKE.md` when this gate opened
and, by the live probe, carried an uncommitted **story 85** change set (`scripts/test.mjs`,
`src/work-doctor.mjs`, `src/commands/doctor.mjs`, four bundle files, plus untracked
`src/work-doctor-records.mjs` and two untracked suites). That is concurrent dispatch working in the
shared tree, not a defect — but it is recorded because it is what made three of the rubric's
registration gates red, and because a later reader comparing measurements needs to know the tree was
not still.

**It does not weaken this story's evidence, and the reason is checkable rather than asserted.** None
of story 81's delivered files appears in `git status`: `src/commands/grade.mjs`, `src/commands/loop.mjs`,
`src/work-grade.mjs`, `src/loop-bounds.mjs` and its four suites are byte-identical to `HEAD`. The
focused selection reached those suites through `--only`, which imports the named files directly and
never consults the assembled array that story 85 is editing.

## Accept decision

**ACCEPTED — 2026-09-04.**

All four task contracts are green: **32 authored scenarios mechanised across 34 story-owned cases**,
**224 / 224** in the selection with zero failures and zero inherited reds, and every surface the
contract named as its own blast radius re-run rather than assumed — including `69/00 bounds` ×23,
whose unchanged `LOOP_BOUND_CONFIG_KEYS` and tuner ranges are what prove the "no new key" claim, and
`54/03 task01`, whose "exactly ten top-level keys, in the same order" assertion is green **with**
`gradeAbsence` shipping, which is what proves the declaration rode the `driven` row.

The story's four review-found defects (F-81-A … F-81-D) are all fixed and all armed by a named case,
including one — `81/00` "a child killed at the capture ceiling is not reported as a child killed at
its deadline" — that the contract had not authorised, because the defect it catches was one the
contract did not anticipate. All four share a single mechanism worth carrying forward: each was a
property `spawnSync` supplied for free that the asynchronous spawn silently stopped supplying.

What is claimed here is claimed **at the source** where a claim could be: the derived deadline was
read from the shipped resolver against this repository's real config (`1800000`, `900000` → **900000**,
half what the grade used to resolve), and the async spawn was exercised end-to-end against the real
declared runner — **234 s, `launched: 1`, a complete 1,718-case record**. It did not block, it was not
reaped, and it returned a `GradeRecord` with its nine keys unchanged.

`aof work validate 81` **PASSES**. `aof work doctor 81` reports **no `control-unresolved` at either
severity** — this standalone story declares no `ARCHITECTURE.md` and therefore no control — and no
`doc-over-budget`, so the Accept-time artifact-budget preflight had nothing to refuse. No `@uat`
scenarios exist, so no human was pestered. No UI surface, so no design lane.

**The one thing this accept does not claim.** The repository's declared rubric is **red** — 14
failures on a direct run, 12 through a grade. Not one names a file this story touched (F-81-I), and
three exist *only* because the tier contains the grade's own gates and the grade stamps the
environment that makes them refuse (F-81-H). Both are recorded as open non-blockers against the items
that own them. A standalone story is verified on its own scenarios plus the fitness functions it must
keep green — all of which are green — and clearing the tier is the milestone gate's job
(`54/ADR-004 §3`). This document says plainly that the tier was red at this gate and why, rather than
reporting a green it did not observe.

A standalone story → **status: done**, with five deferred findings and none of its own left open.
