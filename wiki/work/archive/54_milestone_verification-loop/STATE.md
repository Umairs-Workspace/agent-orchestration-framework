---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 54 · Verification as a feedback loop — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

Broken down 2026-08-22. Five stories; the partition and its graph rationale are in
[ARCHITECTURE.md](ARCHITECTURE.md) § Story partition.

| story | status | wave |
|---|---|---|
| `00_story_the-grade-record` | **done** | 1 — built, reviewed, **refused once and accepted 2026-08-22** on the second verify pass; 77/77 green, FF-5402 + FF-5403 armed and probed |
| `01_story_the-declared-rubric` | **done — ACCEPTED 2026-08-23** (second verify pass) | 2 — behind 00; built + reviewed 2026-08-23, **REFUSED at verify** on one blocker (F-54-01-1), a step definition's premise-guard racing process creation against its own 400ms bound — **intermittent**, red 4× under load and green on a quiet machine, so a re-run proves nothing. **Fix round 2026-08-23: F-54-01-1 CLOSED** — the fixture now measures this machine's node-boot cost and declares the bound as a multiple of it, so the guard cannot race process creation on any machine; re-probed under the load that produced the finding (4/8 red before → 16/16 then 12/12 green after) and the scoped suite is back to **57/57**. **Re-verified and ACCEPTED 2026-08-23**: 57/57 scoped, and the flake re-probed at verify under the load that produced it — 8-way and 12-way concurrent, twenty loaded runs, **0 red** (4/8 red before the fix); FF-5406 additionally re-probed on the accepted bytes and sha256-verified reverted. All five of its controls are armed and red-probed. Originally recorded as 34/34 scenarios green over `work:grade`; FF-5401/5404/5405/5406 landed and FF-5407 extended; the deadline CONSUMES 69's `src/loop-bounds.mjs` (which landed first) rather than creating it |
| `02_story_fitness-in-the-gate` | **done** | 1 — built + reviewed **and ACCEPTED 2026-08-23** (27/27 cases over its 18 scenarios, FF-5410 + FF-5409's GATE_ORDER clause red-probed); `GATE_ORDER` is the five-row cost ladder and the doctor rung is wired at the driven item's own scope; FF-5410 landed, FF-5409's GATE_ORDER clause landed (its `grade-indeterminate` clause stays 54/03's) |
| `03_story_feedback-rides-the-redrive` | in-progress | 3 — behind 01, 02; **contract authored** 2026-08-22 |
| `04_story_scenario-traceability` | **done** | 1 — built + reviewed **and ACCEPTED 2026-08-23** (27/27 cases over its 23 scenarios, FF-5408 red-probed); new lane leaf `src/work-doctor-rubric.mjs` + one `CHECK_GROUPS` entry + one snapshot field; the m15 traceability GAP is discharged OUTSIDE the god-node — ~~and the note with it~~ **the note's own sentence still stands unedited at `validate.mjs:115`, deferred as F-54-04-1**; FF-5408 landed |

**The milestone is fully refined as of 2026-08-22.** The break-down ran without `--autonomous` and
stopped at the break-down gate; 54/00's and 54/01's contracts were then authored story by story, and
`aof:refine 54 --autonomous` cascaded the remaining three in one pass. **Sixteen task `.feature`
files across five stories.** Nothing is left to refine — the next act is a build.

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken
  together as one arc.

- **Operator ruling, 2026-08-22 (refine, Decide stage) — aof EXECUTES the rubric; QA AUTHORS it.**
  The milestone's central open question was whether 54 may run a project's test suite, given
  milestone 66's "ACD never executes the suite". `RESEARCH.md` §Q4 measured that prohibition and
  found it **scoped to the deterministic engine** (`work-doctor.mjs`, `work-doctor-controls.mjs`,
  guarded by `FF-6605`/`acd-controls-never-execute`) — it does **not** reach `aof work loop`, which
  already spawns whole agent sessions. The operator ruled the runner **IN SCOPE**: *"the QA should be
  deciding what to test and how, and aof should most definitely be testing as part of its process."*
  The split this sets, and which the ADRs must hold: **QA authors the rubric** (which scenarios, which
  cases, what "correct" means — the `.feature` contracts and the fitness functions); **aof runs it**
  and turns the result into a structured record. That is 53/ADR-005's line unbroken — running a
  declared rubric is deterministic control, not product judgment.
- **Why it matters:** `RESEARCH.md` §Q4 found the only producer of "which scenario failed, and the
  delta" today is **the model's own prose in `VERIFICATION.md`**, written during `verify` — the exact
  artefact this milestone exists to replace. Without a runner, "deterministic grading before model
  grading" holds only over *malformed* rubrics; the *failing* rubric would still be reported by the
  model the reorder was meant to stop paying for.
- **Sequencing default taken (non-blocking):** `depends:` stays `[53]`. 69 and 70 are `in-progress`
  with every story still `not-started`, and 54 needs neither to exist first — the overlaps are named
  in `ARCHITECTURE.md` § Story partition in the same house idiom 69 and 70 already use, so whichever
  story lands second rebases rather than re-derives.

- **Refine found a false green in two shipped registers, 2026-08-22.** Authoring this milestone's
  own `VERIFICATION.md` surfaced that `verification-missing-red-probe` carries **no `pending`
  downgrade** (unlike leg A's `control-unresolved`), and that `recordsARedProbe` is shape-not-content
  by design — so 69's `_not yet observed_` and 70's `_(lands with NN/NN)_` read as *probe recorded*
  when nothing has been observed. The gate ADR-007 §2a had measured as costing **zero open items**
  was measured against exactly those registers; the honest number is **26** across the three open
  milestones that carry one. Logged as **F-54-REFINE-1** (ruled, ADR-007 §2c) and **F-54-REFINE-2**
  (routed out to 69/70, root cause routed to 66). This milestone's register uses the frozen
  placeholder verbatim and accepts the ten findings rather than take the shortcut — a milestone about
  green-for-the-wrong-reason must not ship one in its own record doc.
- **The ruling that closed it is ORDERING, not tolerance.** `verify.md:130-132` makes the red-probe
  register something the **verify phase itself authors**, and the gate sits at the entry to verify —
  so gating on it is circular and unsatisfiable for every milestone, forever. The gate reads a
  filtered subset of 66's frozen code array instead, and the red-probe obligation moves from "before
  verify" (never meetable) to "before accept" (always meetable), with `severityFor` untouched.

- **Contract ruling taken at 54/00's refine, 2026-08-22 — two evidence gaps, no tenth code.**
  ADR-005 §2 leaves two shapes undecided: a report that parses but whose cases carry **no status**
  (evidence (d) fails, yet the report is neither absent, unparseable nor below its floor), and a
  report showing **no red beside a non-zero exit** (all four pieces hold, yet §2's exit-first check
  must veto). Both are ruled **`report-vacuous` → `indeterminate`** — the report is vacuous *as
  evidence* — rather than inventing a tenth code, which would break FF-5403's set-equality on the
  frozen nine. The second shape is not hypothetical on this tree: `scripts/test.mjs` writes
  `ok - <name>` to **stdout** and `not ok - <name>` to **stderr** (`:3730`, `:3733`), so a
  stdout-only capture of a failing run *is* an all-green report beside a non-zero exit. Recorded in
  `tasks/01_green-is-positive-evidence.feature`'s own prose; **ADR-005 is not amended** — if a
  reviewer wants the rule in the ADR rather than the contract, that is an architect act, not a
  refine one.
- **Two contract rulings taken at 54/01's refine, 2026-08-22 — both on shapes ADR-004 leaves open,
  and neither amends the ADR** (54/00's precedent above, applied again).
  **(1) A `work.rubric` that is PRESENT but unusable is `runner-spawn-failed`, not
  `rubric-unconfigured`.** ADR-007 §3 makes `rubric-unconfigured` the one `indeterminate` that
  *proceeds exactly as today*, so routing a mis-typed declaration there would silently swallow it —
  a project that tried to declare a rubric and got the shape wrong would meet the same behaviour as
  one that never tried. `runner-spawn-failed` is that code's own stated meaning (*a runner aof could
  not launch*), and it **halts**. No tenth code, so FF-5403's set-equality on the frozen nine holds.
  **(2) The child INHERITS the ambient environment; `work.rubric.env` is overlaid on it; aof
  contributes exactly one variable of its own — ADR-003 §5's stamp.** ADR-004 §2's *"declared, never
  inferred"* governs what **aof** supplies, not whether `PATH` exists: a child with an emptied
  environment cannot resolve `node`, and `graphifySpawnOptions` — the envelope ADR-005 §5 names as
  this spawn's shape — overrides `env` nowhere. Both are recorded in
  `stories/01_story_the-declared-rubric/tasks/00_the-rubric-is-declared.feature`'s own prose.
- **Two line citations in the bullet below have drifted, and the fact has not.** `scripts/test.mjs`
  writes `ok - <name>` to stdout and `not ok - <name>` to stderr at **`:3764`/`:3767`** measured
  today, not `:3730`/`:3733` — the file grew between 54/00's refine and 54/01's. 54/01's task 03
  cites the current lines. Worth carrying forward: a line citation is a measurement with a
  half-life; the claim beside it is what a later reader must be able to re-derive.
- **Two real TAP dialects were measured for 54/00's normalisers, and they disagree.** The node test
  runner emits ordinals, a plan line and a summary (`ok 1 - <name>` / `1..1` / `# tests 1`); this
  repo's own runner emits **none** of them — bare `ok - <name>`, `#` section headers, no plan, no
  count. Both are capturable today, so `m38/ADR-008`'s real-payload rule is satisfiable without
  inventing a producer, and `tasks/02_the-report-normalisers.feature` binds both.

- **A break-down premise expired between the break-down and the contracts, 2026-08-22 — and it
  expired in 54's favour.** `ARCHITECTURE.md` § Story partition declared exception (2) — 54/03 and
  **70/04** both editing `src/commands/loop.mjs` — as *the* live overlap, on the measurement that
  "70 is `in-progress` with every story `not-started`". By the time 54/03's contract was authored the
  same day, **70/04's code had landed on this branch** (`54ff074`, *"Warm the review fix loop"*). The
  break-down's own rule (*whichever lands second rebases rather than re-derives*) therefore binds
  54/03, and one of the three drops RESEARCH §Q2 measured is **already closed**: `loop.mjs:614-623`
  no longer bare-`continue`s past the gate payload — it sets `pendingFixes`, `drivePhase` hands it
  over as `ctx.loopDrive.fix`, and `drive.mjs`'s `composeFixInput` renders it under
  `## REVIEW FINDINGS`. ADR-008 §5's *"54 supplies the records, 70 carries them"* is now literal
  rather than anticipatory, and 54/03 is the same story with its riskiest half already paid for.
  Corrected in `ARCHITECTURE.md` § Story partition and in 54/03's own `STORY.md`. **Worth carrying
  forward:** a declared cross-milestone overlap is a measurement with a half-life, exactly like a
  line citation — re-measure it at contract time, because the answer to *"who lands second"* is the
  whole content of the rule.
- **Every line citation in 54/03's contract was re-measured**, since `commands/loop.mjs` grew by
  ~40 lines under 70/04 on the same day. Measured at HEAD: the gate's validate invocation is `:597`
  (ARCHITECTURE says `:558`), `drivenRow` is `:373-382` (says `:337-346`), the hardcoded
  `findings: []` is `:494` (says `:454-459`), and the three `brief: { loop: declaration }` sites are
  `:330`, `:513`, `:560` (says `:304`, `:474`, `:521`). Every ADR *claim* re-derives; only the
  addresses moved. This is the second time in one milestone — STATE already records it for the
  repo's own runner script — which is enough to call it the house rule it is.
- **Three contract rulings taken at 54/02–54/04's refine, 2026-08-22 — none amends an ADR** (54/00's
  precedent, applied a third, fourth and fifth time).
  **(1) The doctor rung mints no stop of its own.** ADR-007 §4 grants exactly one new stop id
  (`grade-indeterminate`, 54/03's), so an admitted doctor error rides the gate-findings path that
  already exists: it re-drives `continue` carrying the findings and exhausts at the cap on the
  existing `cap-exhausted`. That is what "a gate that can halt" means here — the halt arrives at the
  cap, not on the first red — and it keeps `LOOP_STOPS` at nine rather than ten.
  **(2) 54/02 declares the five-row ladder but wires only the doctor rung.** `GATE_ORDER` is a frozen
  declaration, so the `work:grade` row is declarable before the command exists; its **invocation** is
  54/03's, which depends on this story. `00_the-cost-ladder.feature` therefore asserts the runner
  rung's *position* and that a red doctor never reaches it, and states in its own prose that the
  runner's own short-circuit is `54/03/tasks/03_only-fail-redrives.feature` — a half-asserted ladder
  that did not say so would be this milestone's own defect shape.
  **(3) The scenario join invents no minimum name length, and containment is many-to-many.** ADR-006
  §3 says only *contains*; the 25-character figure beside it was a measurement filter, not a rule,
  and promoting it would make the join depend on a constant nobody declared. A case containing two
  scenario names joins **both** — neither an ambiguity nor a miss, and no tenth code coined.
  Recorded in `stories/04_story_scenario-traceability/tasks/00_the-join-is-declared.feature`.
- **54/04's lane departs from `severityFor` deliberately, and the contract says so.** The horizon
  would render an open item's finding at `error`; both traceability legs are fixed at `warn` on open
  and `done` items alike, because ~75% of this tree's 4,290 `@executable` scenarios would report
  `scenario-unjoined` on arrival. The contract also pins the structural reason they can never gate:
  the loop's doctor rung admits a set **derived by filter from `CONTROL_FINDING_CODES`**, a different
  frozen array from this lane's codes — so no later severity change here can leak into the gate.

- **Verify refused 54/00 on 2026-08-22, and neither blocker was visible from a green suite.** The
  story's own contract passed whole — 66 cases over its three task features and its two fitness
  functions, and FF-5402 + FF-5403 each red-probed twice on the shipped bytes. It was refused on two
  findings the suite cannot see. **(1) F-54-00-1:** appending the story's labelled registration block
  to `scripts/test.mjs` turns `acd-loop-suite-registration` REG-MUT-11 red — bisected against
  `HEAD:scripts/test.mjs`, and caused by that control requiring a trailing comma to drop a spread
  from its residue, so the array's terminal element is always residue and every append trips it. The
  remediation was measured against the pin rather than proposed: insert the block ABOVE the terminal
  comma-less spread. The control's own defect routes to 53 as F-54-00-4. **(2) F-54-00-2:** the open
  contract question 54/00's review left for the architect was decided here — a suite in which every
  case SKIPPED grades `pass` (reproduced: four `# SKIP`, exit 0, floor 4 → `pass`, no codes). Ruled a
  blocker, because a compiler whose thesis is *green is positive evidence* must not mint a pass from
  zero executed cases, and 54/01–54/04 all build on it. **Worth carrying forward:** this milestone's
  own thesis held against itself on its first story — both blockers were greens for a reason nobody
  had measured, and both were found only by probing rather than by reading a result.

- **Both blockers were fixed and 54/00 accepted the same day, on a second verify pass.**
  **F-54-00-1** — the labelled registration block now sits ABOVE the tests array's terminal,
  comma-less row, with the reason commented at the site so the next appender does not tidy it back
  and re-break CI; `acd-loop-suite-registration` returns 0 failures. **F-54-00-2** — ADR-005 carries
  an **Amended** block superseding §2(c)'s measure (original clause left unedited, per the house
  rule), `tasks/03_a-skipped-case-is-not-evidence.feature` is the new `@bug` contract, and
  `casesThatRan` is the ONE expression both the floor and the ratchet's bar read — drawing them
  differently was the second bug available here, since a suite legitimately skipping ten of forty
  would otherwise set a bar of forty and refuse its own healthy re-run. FF-5402's declared invariant
  was re-aimed at the amended measure and gained a 30-cell exhaustive lane, red-probed by reverting
  the clause. **Worth carrying forward:** amending the ADR *before* writing the scenario, and the
  scenario before the code, is what kept this from becoming a silent verdict change — the rule 54/00
  built on is the same rule 54/01–54/04 will build on, and the amendment is where a later reader
  will look for why.

### 54/03 review fixes, 2026-08-23 — decisions, cross-lane edits and contract flags

- **Cross-lane edit into 54/02's `test/loop-gate-cost-ladder.test.mjs`, with 54/02's own standing
  rule cited.** 54/02's rule is *extending another milestone's gate is fine; discharging its debt
  while you are in there is not — say so instead.* This edit is neither: it is a re-aim of the guard
  that ADR-007 §1's **own amendment** (2026-08-23, finding D4) makes wrong. The clause the guard
  asserted — *"no runner is spawned"* — was measured over a fixture declaring **no** `work.rubric`,
  so it could not observe a spawn at all; both reviewers flagged it independently as the m45/R5 shape
  (*a fitness function must check what its name claims*) and the architect calls it this milestone's
  fifth instance. Re-aimed at `spawn.calls.length` over a **configured** fixture with a red validate.
  The `.feature` is untouched. Tests are code and may change; the record is here because 54/02 is
  `done`.
- **CONTRACT DISCREPANCY, flagged not fixed — 54/02's `00_the-cost-ladder.feature` says *"And no
  runner is spawned"*, and under ADR-007 §1 as amended that is false for a repository that declares
  a rubric.** Measured (configured fixture, one red validate finding, cap 2): gates
  `["work:validate", "work:grade", "work:validate", "work:grade"]`, **2 rubric spawns over 2
  completed builds**. The clause is unsatisfiable *together with* 54/03's own delivered task 00
  scenario 2 (*"one validate finding **and** one failing case … the payload carries both"*), which
  requires the grade to have been taken on a cycle whose validate was red. Both are delivered, and a
  delivered acceptance criterion is immutable — so the conflict is ruled in ADR-007 §1's amendment
  and recorded here rather than resolved by editing either `.feature`.
- **CONTRACT GAP, flagged — ADR-007 §3's routing table has no row for a grade that could not be
  TAKEN.** It rules `pass` / `fail` / `indeterminate` / `indeterminate`+`rubric-unconfigured`, all of
  which presuppose an ANSWER. Review finding D3 measured what the shell did without one: it read the
  absence as `rubric-unconfigured` and proceeded exactly as today. The shell now halts
  `grade-indeterminate` for a DECLARED rubric whose grade threw (see the retro entry below); the
  table should gain that row at accept.
- **The stop-set widening across three milestones (finding D7) — the authority.** 54/03 widened
  `test/arch/acd-loop-probe-contract.test.mjs:14` and `test/work-loop-stop-set.test.mjs:32` with 69's
  three stop ids (`deadline-exhausted`, `progress-exhausted`, `no-progress`) alongside 54's one
  (`grade-indeterminate`). The authority is **69/06's own STORY note — *"whoever builds this
  reconciles all three, not one"*** — not 54's discretion, and it is cited here because nothing in
  54's record cited it. It is an EXTENSION of another milestone's gate (admitted by 54/02's standing
  rule), not a discharge of its debt: no 69 file is touched, and 69's `.feature`s and register are
  untouched. No code change accompanies this entry.
- **The `work.rubric` declaration was a live hazard on this machine, and is re-declared (finding
  D5).** `.aof/aof.config.json` declared `["node", "scripts/test.mjs"]` with no `env` and no ref
  scoping (69/06's declaration; 69 is `done`). `rubricChildEnv` (`src/commands/grade.mjs`) inherits
  the ambient environment and adds only the re-entrancy stamp — **exactly as ADR-004 §2 rules, and
  that rule is kept intact**: the hazards are the project's to declare, and this project declared
  neither of the two its own `CLAUDE.md` writes down. So `aof work loop <ref>` would, after every
  completed build, have spawned the whole suite with **no `AOF_GLOBAL_HOME`** (fixtures into the real
  `~/.aof`, which this repo's own PreToolUse hook exists to block) and with the `:4182` bind that the
  live control daemon holds — confirmed at source: `global-work-propagation.test.mjs` calls
  `startLauncher`, whose `DEFAULT_CONTROL_SERVICE_PORT` is 4182, and **fifteen** registered suites
  start the launcher, so a name deny-list would drift the moment a sixteenth arrives.
  - **Re-declared as `["node", "scripts/test-rubric.mjs"]`, `report.floor` 1 → 500.** The runner is
    the **fitness tier**, enumerated FROM DISK (every module under `test/arch/`) rather than from a
    curated list, and it mints its own throwaway `AOF_GLOBAL_HOME` under `~/.aof-test` **before any
    aof module is imported** — structurally stronger than a literal path in JSON, which cannot be
    interpolated and would collide between concurrent grades. Measured end to end: **1,210 cases,
    valid TAP, one bounded child process, no port bound**, the same 7 pre-existing failures the tier
    reports when run directly.
  - **Why the fitness tier and not the whole suite:** ADR-004 §3 (`verify.md:85-92`) — *"a story runs
    its own scenarios plus the fitness functions; the full suite runs ONCE at the milestone gate;
    never silently widen to everything."* The old declaration silently widened to everything. The
    integration lane is deliberately absent: it is the one lane `scripts/test.mjs` runs on the
    **ambient** global home rather than its per-test rotation.
  - **The floor is raised because 1 is not evidence.** The tier is 1,210 cases; a floor of 1 would let
    a truncated or filtered report grade `pass`. 500 is comfortably below the tier and far above any
    truncation.
  - **SECOND CROSS-LANE EDIT, and it is the same shape as D4's: `arch/69 F-69-V7 this repository
    declares a runnable grade rubric` PINNED THE HAZARD.** It asserted
    `deepEqual(config.work.rubric.command, ["node", "scripts/test.mjs"])` — the literal declaration
    above, frozen — so making the declaration safe turned 69's own control red (caught by running
    the loop/grade blast radius, not by inspection). The control's **name** claims *runnable*; its
    assertion claimed *this exact command*, and on this control node that command is precisely what
    a runnable rubric is not. Re-aimed at what the name claims: a rubric is declared, its command is
    a usable argv array **through `work:grade`'s own `usableCommand` predicate** rather than a second
    copy of it, the runner it names **exists on disk**, and its report declares `tap` with a positive
    floor. Strictly stronger than a literal, and it no longer contradicts its own name. 69 is `done`;
    the edit is recorded here under 54/02's standing rule, and no other 69 file is touched.

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`

## Feedback (for retro) — ARCHIVED 2026-08-23 at accept

<!-- COMPACTED at `aof:verify 54`. This section carried 25 entries raised across 54/00–54/04 by the
     architect, the developer and QA. They have GRADUATED and are not restated here, because a lesson
     living in two places drifts in one of them:

       * the LESSONS      → `RETROSPECTIVE.md`, R1–R12, each stated as a carryable rule rather than
                            as an account of the diff that produced it. R1 (seven vacuous controls in
                            one milestone), R2 (a quoted figure has a shelf life), R3 (a swallowed
                            error that changes a routing decision) and R4 (a baseline taken twice)
                            are the four this milestone paid the most for.
       * the OPEN WORK    → `OUTCOME.md` `## Gaps` (the blocking spawn's heartbeat window, the
                            unbounded failure payload, the un-run traceability join, and the absence
                            of any mechanical vacuity detector) and `VERIFICATION.md` `## Findings`
                            (F-54-VERIFY-2/3/4), each with a stated discharge condition.
       * the DECISIONS    → `ARCHITECTURE.md`, as dated `**Amended:**` blocks on ADR-005 §2(c),
                            ADR-007 §1 and FF-5409's declaration.

     The load-bearing MEASUREMENTS are carried into whichever of the three documents now owns them.
     They are RESTATED there, not copied verbatim — so this compaction is lossy by construction, and
     the four entries below are the ones that graduated into NO other document. They are kept here in
     full rather than summarised away, because a compaction that silently drops what it could not
     place is the same defect shape this milestone spent itself refusing. -->

Archived. See `RETROSPECTIVE.md` (R1–R12), `OUTCOME.md` `## Gaps`, and `VERIFICATION.md`
`## Findings` — the three homes this section's contents graduated into at accept.

### Kept here, because nothing else owns them

- **A false edge in `aof graph impact`, disproved at source — `FF-5401` is NOT breached.** The graph
  answers `src/loop-progress.mjs -> test/arch/acd-migrate-command-cli-bijection.test.mjs`. Measured
  against the file itself, `src/loop-progress.mjs` imports only `node:*`, `./degrade.mjs`,
  `./loop-bounds.mjs` and `./work-dispatch.mjs` — no test module, static or dynamic. Recorded
  because the next reader of that impact set will see the same edge and has no other way to know it
  was already chased. — Raised by: architect (review)
- **Design ruling taken at 54/03's build: the producer tag on a payload entry is CONDITIONAL on the
  payload being a union.** Task 00 asks both that each entry names which gate produced it and that an
  unconfigured repository's payload stay byte-identical to today's. Tagging unconditionally breaks
  the second; never tagging breaks the first. Tagging only when the payload actually merges more than
  one producer's findings is the one shape that satisfies both, and it is why `mergeGateFindings`
  reads the way it does. — Raised by: developer
- **A second home for one routing rule, left in place deliberately.** 54/01's `grade-unconfigured-no-op`
  declares the `rubric-unconfigured`-proceeds-as-today rule, and 54/03's `gradeRoute` names it again
  as its one exception. Both are armed (removing 54/03's clause reddens FF-5409's sweep), so this is
  redundancy rather than drift — named here so that a later reader changing one knows to look for the
  other. — Raised by: developer
- **Two reds routed OUT and left red, both milestone 69's.** (a) `work-loop-determinism` — *"the
  module copied alone decides with every source dependency absent"* — fails because the working tree
  adds `import { decideBuildProgress, evaluateProgressPolicy } from "./loop-progress.mjs"` at
  `src/work-loop.mjs:3`; `git show HEAD:src/work-loop.mjs` has no imports at all, and 54/03 never
  opens that file. (b) `migrate-core/01 the same source diverges` fails in a whole-suite run and
  passes 33/33 standalone; the import-graph hypothesis was disproved by measurement at review
  (importing the full suite's module graph first, then running migrate alone: 33/33). Neither is
  54's, and neither was fixed from here — R11. — Raised by: developer
