---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Four sections: the evidence, the fitness register (the red probe per declared control), the
  findings, and the accept decision. Write only the sections that have content — the absence of a
  section is information, and an empty "None" placeholder is not.
-->
# 54 · Verification as a feedback loop — Verification

<!--
  OPENED AT REFINE (2026-08-22), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept decision
  to write — and an empty "None" placeholder is not information. Those three sections are authored by
  `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES ten controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 54` reports as
  `verification-register-missing`.
-->

## Verification evidence

<!-- Procedure + result + a `verifies →` pointer, per story as it lands. Never a restatement of what
     the scenario already asserts. -->

### 54/00 — the `@executable` suite, scoped to the story (2026-08-22; re-run after the fixes)

**Procedure, and why the obvious one is not it.** The five suites this story ships were run by
importing each module's exported test ARRAY and invoking every `{ name, run }` under a per-test
hermetic `AOF_GLOBAL_HOME`, mirroring `scripts/test.mjs`'s own loop. `node --test` over these files
is **not** the procedure and would not be evidence: it enters no exported array, reports the FILE as
a single passing case, and exits 0 — the exact false green quoted in
`01_green-is-positive-evidence.feature`'s own prose. Running this story's verification the way the
story says not to would have been the milestone's own defect shape.

**Result — 77 cases, 0 failures** (66 at the first pass, plus task 03's ten and FF-5402's new lane,
which the fixes below added). Re-run after every red probe, against bytes verified identical to the
pre-probe copy each time.

| lane | cases | verifies → |
|---|---|---|
| `test/grade-record-vocabularies.test.mjs` | 15 | `tasks/00_the-frozen-vocabularies.feature` |
| `test/grade-green-is-evidence.test.mjs` | 17 | `tasks/01_green-is-positive-evidence.feature` |
| `test/grade-report-normalisers.test.mjs` | 20 | `tasks/02_the-report-normalisers.feature` |
| `test/grade-skipped-is-not-evidence.test.mjs` | 10 | `tasks/03_a-skipped-case-is-not-evidence.feature` |
| `test/arch/acd-grade-green-needs-evidence.test.mjs` | 9 | FF-5402 |
| `test/arch/acd-grade-record-envelope.test.mjs` | 6 | FF-5403 |

### 54/00 — the registration lane, checked because a suite nobody runs is the same lie

**Procedure.** `acd-test-suite-registration`, `acd-roundtrip-registration` and
`acd-loop-suite-registration` were run against the working tree. ARCHITECTURE's harness note asks
for the import AND the spread to be checked by eye (TECH_DEBT item 50); both were, and the machine
leg was run beside it.

**Result at the first pass.** *"every test suite on disk is imported by a runner"* was green —
this story's suites are wired, not merely written — and `acd-roundtrip-registration` was green, but
**`acd-loop-suite-registration` REG-MUT-11 was RED and this story's change was the cause**, bisected
rather than assumed: the same case passed against `git show HEAD:scripts/test.mjs` and failed against
the working copy (F-54-00-1).

**Result after the fix.** `acd-loop-suite-registration` **0 failures**, `acd-roundtrip-registration`
**0 failures**, `acd-test-suite-registration` 1 failure — the pre-existing positional-slice red,
re-read after the change and still naming only the two milestone-69/70 files, neither of which this
story touches (F-54-00-3).

### 54/00 — `work.rubric` verdict probe over the shipped compiler

**Procedure.** `compileGrade` was driven directly with a four-case TAP report in which **every case
carries `# SKIP`**, a clean exit and a declared `floor: 4`, to test the open contract question 54/00's
review raised rather than inherit its answer.

**Result before the fix.** `verdict: "pass"`, `codes: []`, `cases: {total: 4, failed: 0, skipped: 4}`
— independently reproduced, and raised as F-54-00-2.

**Result after the fix.** The same observation through the same entry point now reads
`verdict: "indeterminate"`, `codes: ["report-vacuous"]`, `cases: {total: 4, failed: 0, skipped: 4}` —
refused as evidence while still reported as observed (ADR-005 §4).


### 54/01 — the `@executable` suite, scoped to the story (2026-08-23) — **one red**

**Procedure.** 54/00's harness unchanged: each suite's exported test ARRAY imported and every
`{ name, run }` invoked under a per-test hermetic `AOF_GLOBAL_HOME`, mirroring the unit loop of this
repo's own runner. `node --test` over these files remains not-the-procedure — it enters no exported
array and reports each FILE as one passing case.

**Result — 57 cases, 1 failure.**

| lane | cases | verifies → |
|---|---|---|
| `test/grade-rubric-is-declared.test.mjs` | 9 | `tasks/00_the-rubric-is-declared.feature` |
| `test/grade-unconfigured-no-op.test.mjs` | 6 | `tasks/01_unconfigured-is-an-honest-no-op.feature` |
| `test/grade-read-face-never-executes.test.mjs` | 9 | `tasks/02_the-read-face-never-executes.feature` |
| `test/grade-spawn-bounded-and-single.test.mjs` | 10 — **1 red** | `tasks/03_the-spawn-is-bounded-and-single.feature` |
| `test/arch/acd-grade-never-imports-the-suite.test.mjs` | 2 | FF-5401 |
| `test/arch/acd-grade-unconfigured-is-additive.test.mjs` | 3 | FF-5404 |
| `test/arch/acd-grade-read-face-never-executes.test.mjs` | 4 | FF-5405 |
| `test/arch/acd-grade-bounded-single-spawn.test.mjs` | 4 | FF-5406 |
| `test/arch/acd-controls-never-execute.test.mjs` | 10 | FF-5407 |

**The red is the step definition's own premise-guard, and it is INTERMITTENT** — see F-54-01-1,
which records the observed frequency rather than a single run. The five product assertions of that
case all held (`indeterminate`, `runner-timeout`, the deadline reported, a duration that reached it,
the kill reported in words); what failed is the guard *"the runner really was alive and really did
write"*. Re-running the lane after this pass returns it green, which is a property of the flake and
not evidence of a fix.

### 54/01 — the re-verify after the blocker fix (2026-08-23, second pass) — **57/57**

**Procedure.** The same harness, unchanged, over the same nine lanes: each suite's exported test
ARRAY imported and every `{ name, run }` invoked under a per-test hermetic `AOF_GLOBAL_HOME`.

**Result — 57 cases, 0 failures.** Every lane of the table above, at the same case counts, with
`grade-spawn-bounded-and-single`'s tenth case now green.

**And a green run is NOT what closes F-54-01-1, because the finding is intermittent.** The record
of the first pass says so in its own words — *"a re-run is not evidence that it is fixed"* — so the
lane was re-probed **under the load that produced the finding**, not on a quiet machine:

| probe | condition | result |
|---|---|---|
| story-scoped suite, once | quiet machine | 57 cases, 0 failures |
| `grade-spawn-bounded-and-single` ×8 concurrent | the 8-way load that was **4/8 red** before the fix | **8/8 green, 80 cases, 0 failures** |
| `grade-spawn-bounded-and-single` ×12 concurrent | heavier than the load that produced the finding | **12/12 green, 120 cases, 0 failures** |

Twenty loaded runs of the previously-flaky lane, zero red, against four-of-eight red at the same
concurrency before. *(verifies → `tasks/03_the-spawn-is-bounded-and-single.feature`.)*

**The fix is in the test's declaration and no product byte moved**, which was read off the tree
rather than taken on trust: the deadline is still **resolved** through `69/ADR-001`'s home — the
fixture declares `work.loop.startToCloseMs` and the case asserts `result.plan.deadlineMs` **equals
the declared value** — so *"54 enforces a bound and chooses none"* (`53/ADR-009` §1) is intact, and
FF-5406's *"the deadline is RESOLVED through 69's single home, and the grade path declares none of
its own"* is green beside it. What changed is that the declared number is **measured** on the machine
about to run the case (spawn the same runner unbounded, time its first byte, take 6× with a 400ms
floor) instead of being a literal that a loaded machine can outrun.

### 54/01 — the registration lane, and the shipped loop suites

**Procedure.** The eight suites this story adds were checked for the import **and** the spread
(TECH_DEBT item 50 — an imported-but-never-spread suite is invisible to the gate), then
`acd-test-suite-registration`, `acd-loop-suite-registration` and `acd-roundtrip-registration` were run
against the working tree. `test/loop-command-{gate,sequencing,stops}.test.mjs` were run beside them,
because `01_unconfigured-is-an-honest-no-op.feature` names those three by file as the evidence that
the shipped loop is unchanged.

**Result.** All eight suites imported **and** spread, 1:1. Registration lane **17 cases, 0 failures**.
The three loop suites **10 cases, 0 failures**. *(verifies →
`tasks/01_unconfigured-is-an-honest-no-op.feature`'s "the shipped loop behaves as it did".)*

### 54/01 — the read face run against THIS repo, not only against its fixtures

**Procedure.** `aof work grade 54/01 --json` — the bare verb, no `--run` — against the working tree,
which declares a real `work.rubric` (`command: ["node","scripts/test.mjs"]`, `report.format: "tap"`,
`report.floor: 1`, and **no** `args.ref`). One invocation, read as a machine document.

**Result.** One parseable JSON document at exit 0, `ran: false`, `launched: 0`, and every clause of
the plan legible in it: the declared argv element for element, `cwd` the workspace root,
`report {format:"tap", path:null, floor:1}`, `floor: 1`, and `deadlineMs: 1800000` — 69's 30-minute
`startToClose` **default**, resolved rather than chosen here. The absent `args.ref` surfaces as
`scope: null` **beside `whole: true`**, so the whole-suite run reads as the declaration's choice and
not as aof's. The never-recorded grade reads `recorded: null` with *"No grade has been recorded for
54/01 yet. The plan below is what `--run` would execute; it is not a result."* — not a `pass`, and
not the plan dressed as a result. *(verifies → `tasks/00_the-rubric-is-declared.feature`'s scope and
report clauses and `tasks/02_the-read-face-never-executes.feature`, observed outside the fixture.)*

### 54/02 — the `@executable` suite, scoped to the story (2026-08-23)

**Result — 27 cases, 0 failures.**

| lane | cases | verifies → |
|---|---|---|
| `test/loop-gate-cost-ladder.test.mjs` | 9 | `tasks/00_the-cost-ladder.feature` |
| `test/loop-doctor-gate-scope-and-severity.test.mjs` | 9 | `tasks/01_the-doctor-gate-scope-and-severity.feature` |
| `test/arch/acd-doctor-gate-scope-and-severity.test.mjs` | 5 | FF-5410 |
| `test/arch/acd-loop-probe-contract.test.mjs` | 4 | FF-5409 (GATE_ORDER clause) + 53's FF-5304 |

### 54/04 — the `@executable` suite, scoped to the story (2026-08-23)

**Result — 27 cases, 0 failures.**

| lane | cases | verifies → |
|---|---|---|
| `test/rubric-join-is-declared.test.mjs` | 8 | `tasks/00_the-join-is-declared.feature` |
| `test/rubric-miss-is-reported-unjoined.test.mjs` | 7 | `tasks/01_a-miss-is-reported-unjoined.feature` |
| `test/rubric-lane-reads-and-never-runs.test.mjs` | 8 | `tasks/02_the-lane-reads-and-never-runs.feature` |
| `test/arch/acd-grade-subject-is-emitted.test.mjs` | 4 | FF-5408 |

### 54/04 — the lane run against THIS repo, not only against its fixtures

**Procedure.** `aof work doctor 54` and `aof work doctor 54/{01,02,04}` on the working tree, which
declares no `work.rubric.report`.

**Result.** The honest no-op fires as designed and nothing else does: one `rubric-join-unchecked` at
`warn` per story that declares `@executable` scenarios — five under `54`, one under each story scope
— each naming `work.rubric.report` as the key that would activate the join. No `case-unjoined` and
no `scenario-unjoined` were emitted, which is the correct reading of a report nobody read: the lane
never claims a join it did not check. *(verifies → `tasks/02_the-lane-reads-and-never-runs.feature`,
observed outside the fixture.)*

### The registration lane, re-run for all three stories (2026-08-23)

**Procedure.** The fifteen suites these three stories add were checked for the import **and** the
spread (TECH_DEBT item 50 — an imported-but-never-spread suite is invisible to the gate), then
`acd-test-suite-registration`, `acd-loop-suite-registration` and `acd-roundtrip-registration` were
run against the working tree.

**Result — 17 cases, 0 failures.** All fifteen new suites are imported and spread.
`acd-test-suite-registration` is **now green**, which retires F-54-00-3: the positional-slice red
this branch carried at 54/00's verify has been cleared by 69, and neither of the two files it named
was 54's.

### 54/03 — the `@executable` suite, scoped to the story (2026-08-23)

**Result — 28 cases, 0 failures**, taken three consecutive times at the Review gate and twice more
in the milestone sweep below, each run under `scripts/test.mjs`'s own per-test `AOF_GLOBAL_HOME`
rotation (`:3995-4009`) rather than a single shared home — the method matters, because the flake
this story carried at review reproduced ONLY under that registration and rotation.

| lane | cases | verifies → |
|---|---|---|
| `test/loop-record-reaches-the-redrive.test.mjs` | 7 | `tasks/00_the-record-reaches-the-redrive.feature` |
| `test/loop-driven-row-carries-the-grade.test.mjs` | 7 | `tasks/01_the-driven-row-carries-the-grade.feature` |
| `test/loop-cap-exhaustion-carries-the-record.test.mjs` | 7 | `tasks/02_cap-exhaustion-carries-the-record.feature` |
| `test/loop-only-fail-redrives.test.mjs` | 7 | `tasks/03_only-fail-redrives.feature` |

### The milestone gate — the integrated regression sweep (2026-08-23)

**Procedure, and the departure from the process stated rather than hidden.** The milestone gate asks
for the FULL suite, run once, where per-story commits make bisecting a cross-story poisoner
mechanical. **It was not run, and cannot be run on this machine**: `scripts/test.mjs` includes
`global-work-propagation.test.mjs`, which binds `:4182` — the port the live control daemon holds — so
the full suite is unavailable here rather than merely expensive. The narrowest lane containing every
one of milestone 54's `@executable` scenarios was run instead: all seventeen behavioural suites the
five stories add, plus the whole fitness tier. **The honest cost is stated rather than absorbed:** a
poisoner living outside those seventeen suites and outside `test/arch/**` would not be caught here.

**Result — 165 cases, 0 failures. Taken twice** (the milestone's own standing rule: a baseline is not
evidence until somebody has taken it a second time).

| story | cases | run 1 | run 2 |
|---|---|---|---|
| 54/00 | 62 | 62 / 0 | 62 / 0 |
| 54/01 | 34 | 34 / 0 | 34 / 0 |
| 54/02 | 18 | 18 / 0 | 18 / 0 |
| 54/03 | 28 | 28 / 0 | 28 / 0 |
| 54/04 | 23 | 23 / 0 | 23 / 0 |

**The fitness tier — 1,210 cases, 7 failures, and NONE of the seven is 54's. Also taken twice, and
the two samples are IDENTICAL** — same 1,210, same 7, same seven subjects (1 m 56 s and 1 m 58 s).
That second sample was not ceremony: 54/03's structural review reported the tier answering
1,229-pass once and 1,230-pass once on the same tree, with the differing case being this story's own
new control, which made the recorded baseline one sample of a distribution. Two identical samples
here retire that reading. The seven are
`53/FF-5301`, `53/FF-5308`, `34/ADR-004`'s publisher seam, `m42-item-3`'s silent-catch baseline,
`66/FF-6601`, and the two memory-backend-selection cases. **All ten of this milestone's declared
controls (FF-5401 … FF-5410) are green**, and `grep "^not ok" | grep FF-54` returns **zero**.

### The declared rubric measured against the heartbeat window (2026-08-23)

**Why this was measured at all.** `src/commands/grade.mjs` spawns the rubric with `spawnSync`, which
blocks the event loop for the whole run, and 54/02 put `work:grade` into `GATE_ORDER` — so from this
milestone onward a loop shell is blocked, and emitting no heartbeat, for as long as the declared
rubric takes. `69/ADR-002`'s `DEFAULT_HEARTBEAT_MS` is **15 minutes** and its stated consequence is
*"kill the attempt and retry it"*. Whether that is a live defect or a latent one is a measurement
nobody had taken; it is taken here.

**Procedure.** `node scripts/test-rubric.mjs` — this repo's declared rubric command — timed end to
end on the control node.

**Result.** **1 min 56 s** (116 s) against a 900 s heartbeat window — a margin of **7.8×**, with the
grade occupying ~13% of the window.

**Reading.** The blocking spawn is **LATENT on this repository, not live**: a healthy grade cannot
strand its own loop at the current rubric. The condition under which it becomes live is stated so it
can be watched rather than rediscovered — a declared rubric whose runtime approaches 15 minutes, on
this or any consumer repository, reinstates the fault in full. Recorded as **F-54-VERIFY-3**.

## Fitness functions

<!-- THE RED-PROBE REGISTER. This block CITES: every row resolves to a declaration in the sibling
     `ARCHITECTURE.md` `## Fitness functions` register and declares nothing of its own.

     The `red probe` cell records what was changed to make the control fail, and the message
     observed. A control must fail when the invariant it guards is broken, so the probe is that
     assertion's positive control. A guard whose passing state is "found nothing" is
     indistinguishable from a broken one by every signal except a red probe.

     EVERY CELL BELOW CARRIES THE FROZEN PLACEHOLDER VERBATIM, AND THAT IS DELIBERATE. It reads as a
     MISSING probe — which is the honest state at refine, and the state each row leaves the moment
     its arch-test lands and is observed failing. `recordsARedProbe` (`work-doctor-controls.mjs:311`)
     tests SHAPE, not content: any cell that is neither empty nor the placeholder reads as "probe
     recorded". So a placeholder-substitute like `_not yet observed_` would report this register as
     complete on the day it was authored — a wrongly-green control, which is the one failure mode 66
     exists to catch and the one a summary line cannot distinguish from a working one. This register
     declines that shortcut and accepts the findings instead. See § Findings, F-54-REFINE-1.

     ALL TEN CONTROLS WERE `pending` IN `ARCHITECTURE.md` AT REFINE, AND THE `landed` COLUMN
     MIRRORS THAT REGISTER AS EACH LANDS. Each lands with its subject story —
     54/00 carries FF-5402 + FF-5403; 54/01 carries FF-5401 + FF-5405 + FF-5406; 54/02 carries
     FF-5409 + FF-5410; 54/03 carries FF-5404; 54/04 carries FF-5407 + FF-5408 — and its row here is
     filled at that moment, not before.

     TWO OF THE TEN EXTEND A GUARD ALREADY IN SERVICE (FF-5407 extends
     `acd-controls-never-execute`, FF-5409 extends `acd-loop-probe-contract`). Their `enforced by`
     file already exists and already passes, so `control-unresolved` never fires for them — which
     makes the red probe the ONLY evidence that the *extension* is armed. An extension that was never
     observed failing is indistinguishable from one that was never written.

     FF-5401 AND FF-5407 ARE NEGATIVE CONTROLS OVER UNCHANGED CODE. Their subject is what 54 does
     NOT do — aof never importing a runner script or any module under `test/**`, and the
     deterministic engines never acquiring a spawn. Their red probes are therefore the interesting
     ones: adding such an import must trip them, and a guard that passes because it inspects nothing
     would look identical on every other signal.

     **Do not accept this milestone while any row still reads as a missing probe** — marker or no
     marker. A standing `pending` downgrades `control-unresolved` to `warn`, and a warn-only doctor
     result does not fail `aof:validate`. Nothing refuses the transition for you. What clears a row is
     landing the file and observing it red, never re-marking it `pending`. -->

| id | control | landed | red probe (what was broken, and the message observed) |
|---|---|---|---|
| FF-5401 | aof never becomes the test runner; no `src/**` import of a runner script or of `test/**` | **54/01** | **Two probes, both cut into the shipped bytes and reverted after (sha256 verified identical each time).** **(a) The static import:** gave `src/commands/grade.mjs` an `import { makeGradeRepo } from "../../test/support/grade-fixture.mjs"`. **1 red:** *"src/** reaches a test suite by import in: commands/grade.mjs (static import)"*. **(b) The named runner:** replaced `const [program, ...args] = plan.command` with a literal naming this repo's own runner script — aof choosing the runner, which is what ADR-004 §2 forbids. **1 red:** *"the grade path names no runner script of its own"*. The negative-control worry this register's own block records is answered: the guard inspects something, and adding the forbidden import trips it. |
| FF-5402 | Green is positive evidence, never an exit code; `GRADE_VERDICTS` a frozen triple | **54/00** | **Two probes, both cut into the shipped bytes of `src/work-grade.mjs` and reverted after (bytes verified identical).** **(a) The headline:** let a clean exit buy a pass on its own — inserted `if (runner != null && runner.exit === 0) return record({ … verdict: "pass" … })` ahead of every evidence check. **2 red:** *"a missing piece can never buy a pass (exists / parses / at the floor / one case has none)"* and *"exit 0 with {present:true, text:'TAP version 13 / 1..0 / '} is not a pass"*. **(b) The floor:** dropped the a-case-that-ran-ALWAYS clause, `evidenceFloor`'s `Math.max(1, …)` → `Math.max(0, …)`. **1 red:** *"an undeclared floor is still a case that ran — 0 !== 1"*. **(c) The amended clause** (lane added 2026-08-22 with ADR-005 §2(c)'s amendment): reverted the floor to count everything enumerated — `casesThatRan(cases) < floor` back to `cases.total < floor`. **1 red** on the control, over the first cell of its 30-cell cross product — *"1 case(s), all skipped, floor null — nothing ran, so nothing is proven"* — and **5 red** in task 03's behavioural lane beside it. |
| FF-5403 | The grade record is frozen, producer-backed and non-vacuous; every code fixture-reachable | **54/00** | **Two probes, same method and same revert.** **(a) The vocabulary:** coined a tenth code — appended `"report-suspicious"` to `GRADE_CODES`. **1 red:** *"exactly nine — 10 !== 9"*. **(b) The envelope:** dropped `failures` from `record()`, the key carrying the runner's verbatim red, so a `fail` would arrive with nothing to act on. **2 red:** *"unconfigured: the record's key set is exact and ordered"* and *"unconfigured: the key set survives JSON"*. |
| FF-5404 | The GRADE LEG is additive; an unconfigured repo's gate sequence and `LoopState` are unchanged | **54/01** | **Two probes, same method and same revert.** **(a) The silence read as a pass:** flipped the unconfigured branch of `src/work-grade.mjs` from `verdict: "indeterminate"` to `verdict: "pass"`. **2 red** — the behavioural leg *"the verdict is indeterminate — 'pass' !== 'indeterminate'"* and the structural scan *"rubric-unconfigured is mapped to a pass or a halt in: work-grade.mjs"*, so both halves of the no-regression rule are armed. **(b) The shell reading the declaration:** added `const declaredRubric = (ws) => ws?.config?.work?.rubric` to `src/work-loop.mjs`. **1 red:** *"…and the shell reads the declaration nowhere; the command is the only reader"*. |
| FF-5405 | The read face never executes, and a grade never re-enters itself | **54/01** | **Three probes, all reverted (bytes verified identical).** **(a) The bare face executing:** `if (input.run !== true)` → `if (false)` in `src/commands/grade.mjs`. **1 red:** *"{ref:03} launches nothing — 1 !== 0"*. **(b) The carve-out lost:** deleted `"grade",` from `BOARD_DEFERRED` in `acd-work-command-route-coverage.test.mjs`. **1 red:** *"work:grade is a member of the board-deferred carve-out"*. **(c) The stamp dropped:** `rubricChildEnv` returned `{ ...ambient, ...declared }` without `[GRADE_REENTRANCY_ENV]: "1"`. **1 red:** *"the spawn sets the re-entrancy stamp in the child's environment — undefined !== '1'"*. |
| FF-5406 | The compiler is a pure leaf; exactly one bounded, shell-free, stdin-closed spawn site | **54/01** | **Three probes, all reverted.** **(a) The leaf made impure:** gave `src/work-grade.mjs` an `import { readFileSync } from "node:fs"`. **1 red:** *"the pure leaf imports nothing at all (found: node:fs)"*. **(b) A shell in the spawn:** `shell: false` → `shell: true` in `rubricSpawnOptions`. **1 red:** *"no shell — the argv array is passed element for element — true !== false"*. **(c) The stamp dropped** (the FF-5405(c) probe, observed on this control too). **1 red:** *"exactly one variable is aof's own — [] !== ['AOF_GRADE_RUNNING']"*. **RE-PROBED AT ACCEPT ON THE BYTES THAT SHIPPED (2026-08-23).** This register's own boundary paragraph states that the probe cell does not record whether the probe was performed on the shipped bytes; probe (b) was therefore cut again into the accepted copy of `src/commands/grade.mjs` — `shell: false` → `shell: true` at `:141` — and observed **1 red**: *"no shell — the argv array is passed element for element"*. Reverted, and the file's sha256 verified byte-identical to the pre-probe copy (`e823b784…`). |
| FF-5407 | The deterministic engines stay pure and gain no runner; the controls lane's forbidden set extended | **54/01** *(family scope corrected at 54/04)* | **Two probes, and they prove the EXTENSION armed rather than the guard it extends.** **(a) The controls lane reaching the compiler:** added `import { normaliseReport } from "./work-grade.mjs"` to `src/work-doctor-controls.mjs`. **1 red** on 66's own allowlist leg: *"the lane imports only node:path, ./acceptance-horizon.mjs, ./declared-id.mjs"*. **(b) A FAMILY lane acquiring the runner:** added `import { gradeCommand } from "./commands/grade.mjs"` to `src/work-doctor-rubric.mjs` — 54/04's new lane, which is in the scanned family precisely because the family scope was corrected there. **1 red on the FF-5407 case by name:** *"a deterministic engine acquired a runner: src/work-doctor-rubric.mjs imports the RUNNER ./commands/grade.mjs; …names the runner module in code"*. |
| FF-5408 | The subject is emitted, never inferred; no identity derived from a runner's free text | **54/04** | **Two probes, both into `src/work-doctor-rubric.mjs`, reverted after.** **(a) A prose classifier:** added `const statusOf = (name) => name.includes("fail") ? "failed" : "passed"` — the instrument 68/03 retired. **1 red:** *"a status is derived from free text in: src/work-doctor-rubric.mjs matches /(?:name|message|text|line|title)…(?:includes|match|test)…(?:fail|pass|skip|error|ok)/"*. **(b) A fuzzy fallback:** added `const similarity = (a, b) => a.length - b.length`. **1 red:** *"src/work-doctor-rubric.mjs carries no fuzzy fallback (found similarity)"* — so the no-guess rule is enforced across the whole grade path by name-shape, not only where a join is computed. |
| FF-5409 | `LOOP_STOPS` frozen and carrying `grade-indeterminate`, `GATE_ORDER` exactly five rows, `LoopState`'s ten keys unchanged *(the stop-set COUNT is deliberately not restated — see ARCHITECTURE's `**Amended:** 2026-08-23` block and F-54-VERIFY-2)* | **BOTH clauses landed: GATE_ORDER (54/02), `grade-indeterminate` (54/03)** | **COMPLETED AT 54's VERIFY, 2026-08-23 — this cell discharges the accept gate F-54-VERIFY-1 named, and the doctor did NOT ask for it (the earlier pass silenced the row, exactly as that finding warned).** **The `grade-indeterminate` clause — two probes, both reverted, bytes verified identical.** **(c) The producer inferred from prose:** planted a `gradeStopCode` that attributes the stop by matching the record's *rendered message* instead of reading its code. **1 red** at `indeterminate/runner-spawn-failed` — so the no-prose-match rule is armed on the grade path, not merely asserted. **(d) The clause's own vacuity, found at review and fixed before this probe was trusted:** the clause originally took its state from `invoke("work:loop")` — the READ-ONLY probe, which drives nothing and therefore reaches no stop at all, so it was guarding a shape that could never carry the stop it names. It now drives `runLoopBody` and asserts `state.act.stop === "grade-indeterminate"` and the producer BEFORE the key-set shape. **1 red** on the planted revert: *"guard: the loop halted on the stop this clause is about"*. **This is the register's own boundary paragraph earning its keep**: the cell records a probe, never whether the assertion under it was reachable — and here it was not, until review measured it. **The GATE_ORDER clause — two probes into `src/work-loop.mjs`, both reverted.** **(a) The rung removed:** deleted the `{ act: "gate", command: "work:doctor" }` row. **1 red:** *"the ladder is five rows, in strictly increasing cost order"*. **(b) The ladder re-ordered** so the runner is paid for before the doctor — `work:grade` swapped ahead of `work:doctor`. **1 red on the control**, and **1 red beside it** in the behavioural lane (`loop gate/00`), which is the cost-ladder property itself failing rather than a second spelling of the same assertion. |
| FF-5410 | The doctor gate's admitted scope and severity are exactly the ruled ones | **54/02** | **Two probes into `src/commands/loop.mjs`, both reverted (bytes verified identical).** **(a) The set restated:** replaced the `CONTROL_FINDING_CODES.filter(…)` derivation with a hand-written literal array that quietly re-admitted `verification-register-missing`. **2 red:** the set-equality case, and *"verification-register-missing @ error never gates"* — so the circularity ADR-007 §2c rules out cannot be re-introduced by an edit. **(b) The scope widened:** `invokeRegistered("work:doctor", { scope: ref }, ctx)` → `{}`. **2 red:** *"work:doctor is invoked with the driven item's own scope"* and the NON-VACUITY case *"…and the real ladder carries neither — streamWide: true"*, which is the guard proving it can tell a planted widening from the real ladder. |

## Findings

<!-- Findings raised before any build. Reviewers report UNNUMBERED; the single writer allocates ids
     at the moment of landing them here. -->

| id | raised | severity | finding | routing |
|---|---|---|---|---|
| F-54-REFINE-1 | refine, 2026-08-22 | blocker (for 54/02) | **The doctor gate 54/02 lands and 66's red-probe check collide at refine time, and the collision was masked by a false green.** `verification-missing-red-probe` is emitted at `severityFor(status)` — `error` while an item is OPEN — and, unlike leg A's `control-unresolved`, it has **no `pending` downgrade** (`work-doctor-controls.mjs:489-536`). So an honestly-authored register makes every open milestone carry one `error` per declared control from refine until its last control lands. `ARCHITECTURE.md` ADR-007 §2a originally measured the gate's blast radius as **zero open items**, but that measurement was taken against registers using a placeholder-substitute (`69`'s `_not yet observed_`, `70`'s `_(lands with NN/NN)_`), which `recordsARedProbe`'s shape test reads as "probe recorded". Authoring this register honestly moved 54 from 1 `error` to **10**; the honest number across the three open milestones with registers is **26**, not 0. | **RULED at refine — ADR-007 §2c.** The decisive fact is ordering, not severity: `verify.md:130-132` makes the red-probe register an artefact the **verify phase itself authors**, and this gate sits at the entry to verify — so gating on it is **circular**, unsatisfiable for every milestone forever, however honest the register. The gate admits a subset **derived by filter** from `CONTROL_FINDING_CODES` (minus the two `verification-*` members, minus `control-runner-unchecked`), leaving five codes that are each a fact about the item's **code**. The obligation is **moved, not weakened** — from "before verify", where it could never be met, to "before accept", where it always can. `severityFor` is untouched, and `pending` stays inadmissible at `done`. Carried by FF-5410. |
| F-54-REFINE-2 | refine, 2026-08-22 | defect (routed OUT) | **Sixteen controls across milestones 69 and 70 report as red-probed when none has been observed.** Both registers fill every red-probe cell with a placeholder-substitute, which `recordsARedProbe`'s deliberate shape-not-content test reads as recorded; `69/VERIFICATION.md:23` then asserts the opposite in prose (*"Every row's red-probe cell holds the frozen placeholder"*), so the register both lies and documents itself as honest. `aof work doctor 69` and `aof work doctor 70` each return **0 errors**. This is a control green for the wrong reason inside a record document — the exact shape milestone 66 exists to catch. | **Not 54's to fix** — no file under 69 or 70 was touched. Routed to those milestones. The root cause routes with it as a **66** defect: the red-probe leg ignoring the `pending` marker its sibling leg honours is the missing half of `66/ADR-004` §3. ADR-007 §2c stands whether or not that is ever fixed. 54's own register deliberately declines the substitute — see the register block above. |
| F-54-00-1 | verify 54/00, 2026-08-22 | **blocker** | **This story's registration append turns a SHIPPED control red — `acd-loop-suite-registration` REG-MUT-11 (FF-5311, milestone 53).** Bisected, not inferred: the case is green against `git show HEAD:scripts/test.mjs` and red against the working copy — *"a line of runner LOGIC outside every labelled registration block changed — residue bcaaab2d… ≠ 18fd3c1e…"*. Measured cause: REG-MUT-11 drops a spread from its residue only via `REGISTRATION_SPREAD = /^\s*\.\.\.[A-Za-z_$][\w$]*,$/`, which **requires a trailing comma** — so the array's terminal, comma-less element is residue. Appending necessarily commas the old terminal line and mints a new one, swapping exactly one residue line (71 lines before, 71 after: `...acdVerificationTemplateShapeTests` out, `...acdGradeRecordEnvelopeTests` in). The control IS registered (`scripts/test.mjs:2749,:2825`), so this is a real CI red, not a latent one. | **Back to `aof:continue` (54/00).** The remediation is proven against the pin, not guessed: keep `...acdVerificationTemplateShapeTests` the terminal comma-less element and insert 54/00's labelled block **above** it with every new spread comma-terminated — measured residue `18fd3c1e…`, **equal to the pin**. Comma-terminating 54/00's last spread and leaving the order as built does NOT clear it (`8cd5945f…`). Root cause routes out as F-54-00-4. **RESOLVED 2026-08-22** — the block was moved above the terminal row and the comma-less row left terminal; `acd-loop-suite-registration` now reports **0 failures**, REG-MUT-11 included. The reason is recorded as a comment AT the block (`scripts/test.mjs`), because the next appender will otherwise "tidy" it back and re-break CI. |
| F-54-00-2 | verify 54/00, 2026-08-22 | **blocker** | **A suite in which every case SKIPPED is graded `pass`** — the story's own user story names this shape verbatim (*"an exit code that a suite which ran nothing at all also returns"*). Reproduced independently at verify through the real `compileGrade`: four `# SKIP` cases, exit 0, declared `floor: 4` → `verdict: "pass"`, `codes: []`, `cases: {total: 4, failed: 0, skipped: 4}`. The ratchet does not catch it either — a prior 4-case pass sets a bar four skips clear. The code conforms EXACTLY to ADR-005 §2(c) as written (`total > 0 && total >= floor`, where `total` counts skips), so this is a rule defect, not a deviation — and `02_the-report-normalisers.feature` already says in its own delivered words that a skipped case *"is not counted toward the passing cases"*. Raised at 54/00's review by the architect and deliberately left undecided by the builder; **decided here.** | **PO triage: blocker, back to `aof:continue` (54/00).** A grader whose whole thesis is *green is positive evidence* must not mint a `pass` from zero executed cases, and 54/01–54/04 all build on this compiler — fixing after they land means re-verifying them. Two acts, in order: **(1) architect** amends ADR-005 §2(c) so the floor is measured against cases that actually RAN (`total - skipped`), `cases` still reported as observed; **(2) developer** adds the `@bug @finding-F-54-00-2` task scenario under 54/00 and the one clause. Delivered `.feature` files are immutable — the new rule goes in a NEW task scenario, never as an edit to the three that shipped. **RESOLVED 2026-08-22**, in that order: ADR-005 carries an **Amended** block superseding §2(c)'s measure (the original clause left unedited, per the house rule); `tasks/03_a-skipped-case-is-not-evidence.feature` is the new contract; `casesThatRan` is the one expression both the floor and the ratchet's bar read, so the two cannot drift apart; FF-5402's declared invariant is re-aimed and gained a 30-cell exhaustive lane, red-probed above. The measured shape now reads `indeterminate` / `report-vacuous`, and the other 66 cases were unaffected. |
| F-54-00-3 | verify 54/00, 2026-08-22 | defect (routed OUT) | **`acd-test-suite-registration`'s positional-slice case is red on this branch, and 54 did not cause it.** It names `test/arch/acd-no-lease-store-run-record-untouched.test.mjs` and `test/arch/acd-review-never-resumed.test.mjs`, each cutting one `indexOf`-sentinel slice against a ledger of 0. Both files are committed and untouched by this story (`0b89baf`, `4f67551` — 69/70 work on this branch); neither of 54/00's two new arch-tests appears in the finding. | **Not 54's to fix.** Routed to milestone 69 as a branch red to clear before merge — either move the two cuts to `test/support/source-slice.mjs`'s named helpers, or ledger them with a reason. Recorded here because it was met while verifying 54/00 and a reader of this record would otherwise re-discover it. **RESOLVED 2026-08-23, by 69 rather than by 54** — re-read at this pass and `acd-test-suite-registration` is now **0 failures**; neither named file is 54's, and the branch red it recorded is gone. |
| F-54-00-4 | verify 54/00, 2026-08-22 | defect (routed OUT) | **REG-MUT-11's stated "by construction" guarantee is false for exactly one line, and F-54-00-1 is the first item to pay for it.** Its own message promises *"appending a labelled block of imports and spreads leaves this digest alone by construction"*, and `acd-loop-suite-registration.test.mjs:243-256` records that promise as the reason an absolute digest was rejected — naming **milestone 54** as the append it was built to tolerate. It does not tolerate it: because `REGISTRATION_SPREAD` requires a trailing comma, the array's last element is always residue, so EVERY append trips the digest and the workaround is to append second-from-last. | **Routed to milestone 53** (the control's owner). The one-line fix is to make the comma optional in `REGISTRATION_SPREAD`, which drops the terminal spread from residue and requires `RUNNER_RESIDUE` re-baselined once (71 → 70 lines) — a deliberate re-pin, which is what a frozen digest is for. Until then F-54-00-1's remediation stands as the way through. **This is the third instance in one milestone of a control that reads green for a reason nobody measured** (F-54-REFINE-2's sixteen, this one, and the run in `01_green-is-positive-evidence.feature`'s prose). |
| F-54-01-1 | verify 54/01, 2026-08-23 | **blocker** | **A delivered step definition's own premise-guard races node's process creation against the 400ms bound it declares, and loses INTERMITTENTLY under machine load.** `grade/03 the deadline force-kills, and the kill is reported as a timeout` fails at *"guard: the runner really was alive and really did write"* — `alive.log` is empty. Every PRODUCT assertion in that case passes first: `verdict: "indeterminate"`, `codes` containing `runner-timeout`, `plan.deadlineMs === 400`, a `durationMs` that reached it, and a `detail` matching `/deadline/`. **Observed frequency, stated because the first characterisation of this finding overstated it:** RED 4 times — once in the 57-case story run and three times in consecutive lane-alone runs, all while other node processes were active — and GREEN in six consecutive lane-alone runs and in a 111-case batch once the machine was quiet. It is FLAKY and load-sensitive, not deterministic; a re-run is not evidence that it is fixed. **Mechanism, measured:** the runner's only write is a `setInterval(…, 25)`, so it emits nothing until node has finished booting, and `spawnSync`'s `timeout` starts at the CALL — process creation is spent out of the same 400ms. When creation eats the budget the child dies having ticked zero times. **Decisive: the same lane with the bound raised 400ms → 2500ms is 10/10 green, with no product byte touched.** | **PO triage: blocker DESPITE being intermittent, back to `aof:continue` (54/01) — a step-definition fix, and NO new task scenario.** A suite that is green only when the machine is quiet is a green nobody can depend on, which is the one thing this milestone exists to refuse; and a CI runner is the loaded case, not the quiet one. The contract is right and is already delivered (`03_the-spawn-is-bounded-and-single.feature`); what is wrong is the test's own premise-guard, and tests are code. **The fix is NOT to raise the number** — that only moves the race onto a slower machine. Have the runner write ONE byte at startup, before the interval, so *"was alive and did write"* is proven independent of how much of the bound survives process creation, while the interval keeps proving *"nothing from that run is still alive afterwards"*. Re-run 54/01's scoped suite to 57/57 and re-verify. **RESOLVED 2026-08-23, and the prescribed fix was measured INSUFFICIENT on the way** — the startup byte alone was still **4 of 8 red** under an 8-way load, because it is written *after* node boots and boot is exactly what the deadline was being spent on. The landed fix keeps the triage's other half (a larger literal only moves the race onto a slower machine) and removes the race instead of outrunning it: the fixture **measures** this machine's boot cost under the load it is actually under — spawn the same runner unbounded, time its first byte, reap it — and declares `work.loop.startToCloseMs` as 6× that with a 400ms floor. **No product byte moved**: the value is still resolved through 69's home and the case asserts `plan.deadlineMs` against the declared number, so `53/ADR-009` §1 holds. **Re-probed at verify under the condition that produced the finding — 8/8 and 12/12 green, twenty loaded runs, zero red.** |
| F-54-04-1 | verify 54/04, 2026-08-23 | non-blocker (deferred) | **`validate`'s six-milestone-old traceability note now under-reports, and 54/04's own STORY.md reads as though it were retired.** `src/commands/validate.mjs:115` still prints *"Note: test-traceability … is not yet checked here."* The sentence is not FALSE — it says *here*, and the join genuinely is not checked in `validate` — but a reader of validate's output is given no reason to look in `work:doctor`, where 54/04 put it. `STORY.md`'s notes say the note is *"discharged OUTSIDE the god-node"*, which is true of the GAP and not of the SENTENCE. | **Defer to backlog.** Out of 54/04's contract: no task scenario binds the note's text, so this is neither a deviation nor an unmet criterion, and `src/commands/validate.mjs` is on the story's Must-NOT-touch list by way of the god-node rule. The one-line change (point the note at the `work:doctor` rubric lane) belongs to whoever next opens that file with a reason to. |
| F-54-VERIFY-1 | verify 54, 2026-08-23 | defect (routed OUT) | **The red-probe register is one row per `FF-NN`, and FF-5409 is a control that lands in TWO halves — so the register cannot say what is true.** ARCHITECTURE's own `landed` column already records the split (*GATE_ORDER clause landed 54/02; the `grade-indeterminate` clause still pending, 54/03*), but `recordsARedProbe` is a SHAPE test over one cell: the row is either "placeholder" or "recorded", with no third reading. Filling the cell at 54/02 makes `aof work doctor 54` stop reporting FF-5409 while half the control has never been observed failing — the same wrongly-green shape as F-54-REFINE-2, arriving from the opposite direction; leaving it placeholder would deny two probes that WERE observed. | **Cell filled, and the partiality written INTO the cell in bold** — the more informative of the two wrong answers, with the deficiency logged here rather than silently absorbed. **Routed to milestone 66** as the same root cause F-54-REFINE-2 already carries: the red-probe leg needs a per-clause or partially-landed reading, exactly as leg A honours `pending`. **And it is a named 54/03 accept gate:** FF-5409's `grade-indeterminate` clause must be red-probed at 54/03's verify and this cell completed — the doctor check will NOT ask for it, because this pass silenced it. | **DISCHARGED 2026-08-23 at 54's verify** — both probes recorded in the register cell above, and the doctor did not ask, exactly as warned. The routing-out to milestone 66 stands. |
| F-54-VERIFY-2 | verify 54, 2026-08-23 | non-blocker (routed OUT) | **FF-5304's set-exactness rests on a hand-written literal, and it has already been hand-edited once.** The only assertion in the tree that pins `LOOP_STOPS`' exact membership is `53/FF-5304`'s clause at `test/arch/acd-loop-probe-contract.test.mjs:97` — `assert.deepEqual([...LOOP_STOPS], [...STOPS])` — where `STOPS` is a literal array typed out at line 17 of the same file. `git diff` on this working tree shows that literal was edited from the pre-54 eight (`uat-gate`, `dependency-blocked`, `cap-exhausted`, `session-needs-input`, `run-not-retryable`, `retry-parked`, `unmapped-item-type`, `operator-interrupt`) to the current twelve, absorbing milestone 69's `deadline-exhausted` / `progress-exhausted` / `no-progress` and 54's `grade-indeterminate`; the control therefore did not detect the vocabulary change, it was told the new answer, which is the same shelf-life shape this milestone has now recorded three times. The cosmetic residue of the un-updated original is still in place at line 99, `assert.throws(() => LOOP_STOPS.push("ninth"), TypeError)`, whose label says "ninth" of a twelve-member set. The ratchet proposed instead: replace the single literal with declared provenance sets — the eight pre-54 ids, the three from 69, the one from 54 — and assert (a) every pre-54 id is present and unrenamed, (b) the difference between `LOOP_STOPS` and the union of those declared sets is empty, so a newcomer fails until its provenance is named rather than passing once a count is adjusted, and (c) the set stays frozen and is reported verbatim on every `LoopState`. That is the shape 54/03's contract test already uses at `test/loop-only-fail-redrives.test.mjs:365-384`, so the control and the contract would then agree; the change lands in `53/FF-5304`'s own clause and belongs to milestone 53 as that control's owner. | **Routed to milestone 53** (the control's owner). Not 54's to fix, and deliberately not fixed from here: 54 already amended its OWN declaration to stop claiming a count (`ARCHITECTURE.md`, `**Amended:** 2026-08-23`), which is the whole of 54's obligation. Editing a neighbouring milestone's frozen literal from inside an accept pass is the act 54/02's own standing rule refuses by name — *extending another milestone's gate is fine; discharging its debt while you are in there is not.* **This is the SEVENTH instance in this milestone of a control that reads green for a reason nobody measured** (F-54-REFINE-2's sixteen, F-54-00-4, the cost-ladder guard's no-rubric fixture, FF-5409's read-only-probe clause, 69's `F-69-V7` command pin, and this). Seven is a class, not a run of bad luck — carried to the retrospective as the case for a mechanical detector rather than a further prose rule. |
| F-54-VERIFY-3 | verify 54, 2026-08-23 | non-blocker (watch condition) | **The blocking rubric spawn is latent, not absent, and the margin is now a number.** `commands/grade.mjs` spawns with `spawnSync`, which blocks the event loop for the whole run, and 54/02 put `work:grade` into `GATE_ORDER` — so from this milestone on, a loop shell emits no heartbeat for as long as the declared rubric takes, against `69/ADR-002`'s `DEFAULT_HEARTBEAT_MS` of 15 minutes whose stated consequence is *"kill the attempt and retry it"*. This was routed 54/01 → 54/02 and never landed, because `ADR-009 §1` forbids 54 choosing a bound at all. **Measured at this pass rather than inherited a third time: 1 m 56 s and 1 m 58 s against a 900 s window — a 7.8× margin, ~13% of the window.** | **Accepted as LATENT, with the watch condition stated.** No bound is chosen here (ADR-009 §1 stands). The fault reinstates in full for any declared rubric approaching 15 minutes — on this repository as its tier grows, or on any consumer repository whose suite is slower — and the fix is an ADR-level choice between an async spawn that can heartbeat while it waits and a grade deadline resolved under the heartbeat window. **Carried forward as the headline of the follow-on driver**, which is where it can be decided; a milestone barred from choosing the bound was never going to close it. |
| F-54-VERIFY-4 | verify 54, 2026-08-23 | non-blocker (deferred) | **54/04's traceability join is still inert on the repository that built it — and it is inert for a NEW reason.** At 54/04's verify the repo declared no `work.rubric` at all. It now declares one (`scripts/test-rubric.mjs`, `format: tap`, `floor: 500`), yet `aof work doctor 54` still reports `rubric-join-unchecked` at `warn` for all five stories. Measured cause: `declaredReportFrom` (`src/work-doctor-rubric.mjs:86-90`) requires `work.rubric.report.path` to be a non-empty string, and the declaration carries `format` and `floor` only — the runner writes TAP to its streams and no file. So the lane's honest no-op is firing correctly, and 54's own scenario-traceability capability has still never run against 54's own scenarios. | **Defer to backlog, and record that the lane is RIGHT.** This is not a defect in 54/04 — the no-op is its designed behaviour and it names the exact key that would activate it, which is what `tasks/02_the-lane-reads-and-never-runs.feature` contracted. The one-line change is to have `scripts/test-rubric.mjs` also write its TAP to a declared path and to add `report.path` beside `format`; it is left to whoever next has a reason to open that declaration, because doing it here would change what the loop's grade reads on the same pass that accepts the milestone. |

## Accept decision

**54/00 — ACCEPTED 2026-08-22**, on the second pass of `aof:verify`, after both blockers raised at
the first pass were fixed and re-verified.

**The first pass refused it, and the record of that refusal is kept above rather than tidied away.**
The story's own suite was green then too — the two blockers were invisible from it, which is the
argument this milestone is making, arriving early and against itself.

| gate | result |
|---|---|
| `@executable` suite, scoped to the story | **77 cases, 0 failures** (tasks 00–03 + FF-5402 + FF-5403) |
| Fitness functions | **FF-5402, FF-5403 green and red-probed** — three planted defects each, every one observed failing |
| Registration lane | `acd-loop-suite-registration` **0 failures** (REG-MUT-11 was the blocker), `acd-roundtrip-registration` **0 failures** |
| `aof work validate 54/00` | **PASS** |
| `aof work doctor 54/00` | no `control-unresolved` at either severity |
| `@manual` / `@uat` | none in scope — this story is a pure leaf with no command, no route and no UI |

**Findings.** Both blockers **resolved** (F-54-00-1, F-54-00-2). Two defects stay **open and routed
out**, neither of them 54/00's code: F-54-00-3 to milestone 69 (a pre-existing positional-slice red
this branch carries), F-54-00-4 to milestone 53 (REG-MUT-11's "by construction" promise, which is
false for the array's terminal row and is the root cause of F-54-00-1). Neither blocks this story:
one is another milestone's file, the other is a control whose workaround is landed, commented at the
site and measured against the pin.

**What the acceptance does NOT claim.** The two controls this story landed are proven armed; the
other eight of milestone 54's ten are still `pending` with the frozen placeholder in their probe
cell, and the milestone cannot be accepted until each lands and is observed red. That is the register
above doing its job, not an omission here.

---

**54/02 — ACCEPTED 2026-08-23.** **54/04 — ACCEPTED 2026-08-23.** **54/01 — REFUSED**, one blocker
open. **Milestone 54 is NOT accepted**, and could not be at this pass — see below.

| gate | 54/02 | 54/04 |
|---|---|---|
| `@executable` suite, scoped to the story | **27 cases, 0 failures** | **27 cases, 0 failures** |
| Fitness functions | **FF-5410 armed and probed; FF-5409's GATE_ORDER clause probed** (F-54-VERIFY-1) | **FF-5408 armed and probed** |
| Registration lane | `acd-test-suite-registration`, `acd-loop-suite-registration`, `acd-roundtrip-registration` — **17 cases, 0 failures** | same run, same result |
| `aof work validate <ref>` | **PASS** | **PASS** |
| `aof work doctor <ref>` | no `control-unresolved` at either severity | no `control-unresolved` at either severity |
| `@manual` / `@uat` | none tagged in scope | none tagged; the lane was additionally run against THIS tree (evidence above) |

**No `@uat` scenario exists anywhere in milestone 54**, so no human acceptance step was brokered and
the user was not asked to perform one. Neither story has a UI surface and the milestone carries no
`DESIGN.md`, so no design-conformance review applies.

**54/01 — REFUSED, and the refusal is narrow.** All five of its controls (FF-5401, FF-5404,
FF-5405, FF-5406, FF-5407) are armed and red-probed, `aof work validate 54/01` is PASS, and its
product behaviour is proven — including the timeout behaviour whose own guard is the problem. What
refuses it is F-54-01-1: an INTERMITTENT red in its own scoped suite, seen four times under load and
green on a quiet machine. A story is not done while its suite is unreliable, whichever side of the
contract the unreliability sits on, and a green that depends on how busy the machine was is the
exact shape this milestone exists to refuse. The remediation is one step definition and no new
contract.

**Milestone 54 — NOT ACCEPTED.** **Three of its five stories are now `done`** — 54/00 (2026-08-22),
and 54/02 + 54/04 at this pass; **54/01 is refused** and **54/03 is
`in-progress`** with its contract authored and nothing built. A milestone is accepted only when ALL
its stories are, so no full-suite milestone-gate run, no `STATE.md` compaction, no
`RETROSPECTIVE.md`, no `memory ingest` and no milestone `OUTCOME.md` were performed at this pass —
each belongs at the milestone gate, which this pass does not reach.

**What this acceptance does NOT claim.** Nine of the ten declared controls are now armed and
observed failing; **FF-5409 is armed only in half** — its `grade-indeterminate` clause lands with
54/03 and has never been observed red, and `aof work doctor 54` will no longer say so
(F-54-VERIFY-1). `GATE_ORDER` declares `work:grade` as its fourth rung and **nothing invokes it** —
`invokeGateLadder` runs `work:validate` and `work:doctor` only, which is 54/02's contract exactly and
is recorded as a gap in its `OUTCOME.md` rather than left to be discovered.

**Findings.** One blocker **open**: F-54-01-1 (54/01). Two defects **open and routed out**:
F-54-04-1 (deferred to backlog), F-54-VERIFY-1 (to milestone 66, and a named 54/03 accept gate).
One earlier defect **closed by another milestone**: F-54-00-3, cleared by 69. F-54-00-4 remains open
against milestone 53.

---

**54/01 — ACCEPTED 2026-08-23**, on the second pass of `aof:verify`, after the one blocker raised at
the first pass was fixed and **re-probed under the condition that produced it**.

**The first pass refused it, and the record of that refusal is kept above rather than tidied away.**
Its product behaviour was already proven then; what refused it was a step definition whose own
premise-guard raced node's process creation. A story is not done while its suite is unreliable,
whichever side of the contract the unreliability sits on.

| gate | result |
|---|---|
| `@executable` suite, scoped to the story | **57 cases, 0 failures** (tasks 00–03 + FF-5401, FF-5404, FF-5405, FF-5406, FF-5407) |
| The previously-flaky lane, under load | **8/8 and 12/12 concurrent runs green** — 20 loaded runs, 0 red, against 4/8 red at the same concurrency before the fix |
| Fitness functions | **FF-5401, FF-5404, FF-5405, FF-5406, FF-5407 green and red-probed** — eleven planted defects across the five, every one observed failing; FF-5406 **re-probed at accept on the accepted bytes**, sha256-verified reverted |
| Registration lane | `acd-test-suite-registration`, `acd-loop-suite-registration`, `acd-roundtrip-registration` — **17 cases, 0 failures**; all eight new suites imported **and** spread |
| Shipped loop suites, unedited | `loop-command-{gate,sequencing,stops}` — **10 cases, 0 failures** |
| The lane run against THIS repo | bare `aof work grade 54/01 --json` — one document, exit 0, `launched: 0`, the plan legible, `deadlineMs` resolved from 69's home |
| `aof work validate 54/01` | **PASS** |
| `aof work doctor 54/01` | no `control-unresolved` at either severity |
| `@manual` / `@uat` | no `@manual` and no `@uat` scenario is tagged in this story; the two agent-run probes above were performed anyway, because a command that spawns is worth reading on a real tree |

**Findings.** The one blocker, F-54-01-1, is **resolved** — and the resolution carries a correction
worth keeping: the fix the first pass PRESCRIBED was measured insufficient, and the finding's own
cell now records that rather than the tidier story. No finding raised at this pass. F-54-04-1 stays
deferred and F-54-VERIFY-1 stays routed out; neither is 54/01's.

**What the acceptance does NOT claim.** `work.rubric` is now declared, planned, spawned and graded —
and **nothing in the loop invokes it**. `GATE_ORDER`'s fourth rung names `work:grade` and
`invokeGateLadder` still runs `work:validate` and `work:doctor` only; the grade's record has no
writer onto the run, so every repo reads *no grade recorded yet*, exactly as this story's own
contract says it should. Both are 54/03's, and both are recorded as gaps in this story's `OUTCOME.md`
rather than left to be discovered. FF-5409 remains armed in half.

**Milestone 54 — STILL NOT ACCEPTED.** **Four of its five stories are now `done`** — 54/00, 54/02,
54/04 and 54/01 at this pass; **54/03 is `in-progress`** with its contract authored and nothing
built. A milestone is accepted only when ALL its stories are, so no full-suite milestone-gate run, no
`STATE.md` compaction, no `RETROSPECTIVE.md`, no `memory ingest` and no milestone `OUTCOME.md` were
performed at this pass — each belongs at the milestone gate, which this pass does not reach.

**A register correction made at this pass.** The `landed` column of § Fitness functions still read
`pending` for eight of the ten controls, including FF-5408 and FF-5410, whose stories were accepted
at the previous pass. `ARCHITECTURE.md`'s own register records each landing, so the column was
brought into line with it — the citing register may not contradict the declaration it cites. No
probe cell was touched.

---

**54/03 — ACCEPTED 2026-08-23**, and **MILESTONE 54 — ACCEPTED 2026-08-23**, at the same pass: the
story was the milestone's last, so its acceptance is what made the milestone gate reachable.

| gate | result |
|---|---|
| 54/03's `@executable` suite | **28 cases, 0 failures** — three consecutive runs at the Review gate, twice more in the milestone sweep, under `scripts/test.mjs`'s own per-test global-home rotation |
| Milestone regression sweep | **165 cases, 0 failures, taken twice** — all seventeen behavioural suites the five stories add |
| Fitness tier | **1,210 cases, 7 failures, taken twice, identical samples** — none of the seven is 54's; all ten of FF-5401…FF-5410 green |
| Full repository suite | **NOT RUN, and it cannot be run here** — `global-work-propagation.test.mjs` binds `:4182`, the port the live control daemon holds. The narrowest lane containing every 54 scenario was run instead; the residual risk is stated in § the milestone gate rather than absorbed |
| Rubric vs heartbeat window | **116 s / 118 s against 900 s** — a 7.8× margin; the blocking spawn is latent, not live (F-54-VERIFY-3) |
| `aof work validate 54` | **PASS** |
| `aof work doctor 54` | **8 warns, 0 errors**; zero `control-unresolved`, zero `verification-missing-red-probe`, zero `register-duplicate-id`, zero `register-dangling-citation` — read at BOTH severities |
| Red-probe register | **complete, 10 of 10** — FF-5409's `grade-indeterminate` cell filled at this pass, discharging the accept gate F-54-VERIFY-1 named |
| `@manual` / `@uat` | **none tagged anywhere in milestone 54** — all 17 features are `@executable`, so no human acceptance step was brokered and the operator was not asked for a sign-off that no scenario requires |

**Findings.** Three raised at this pass, none a blocker: **F-54-VERIFY-2** (`FF-5304`'s set-exactness
rests on a hand-edited literal) routed to milestone 53 as that control's owner; **F-54-VERIFY-3** (the
blocking rubric spawn, accepted as latent with its watch condition stated) carried forward;
**F-54-VERIFY-4** (the traceability join still un-run on this repository) deferred. **F-54-VERIFY-1 is
discharged.** F-54-04-1 stays deferred; F-54-REFINE-2 stays routed to 66.

**What this acceptance does NOT claim, stated because the milestone's own thesis makes it the
interesting half.** Two production defects — a verdict routed from the grade's DETAIL rather than its
VERDICT, and a swallowed error that made a thrown grade indistinguishable from an undeclared rubric —
were **shipped by a build that reported 28/28 green and complete**, and were found only because the
review lanes red-probed by mutation instead of reading the code. Both are fixed and each is now
guarded by an assertion observed failing. But the green signal itself lied twice, in the milestone
about green signals, and no gate in this repository would have caught either. That is recorded as
`RETROSPECTIVE.md` R1 and R3, and it is the case for the follow-on driver rather than a further prose
rule.

**Accepted with four open gaps, each carrying a discharge condition** in `OUTCOME.md` — the grade
cannot heartbeat while it waits; the failure payload is bounded only where a human reads it; the
traceability join has never run against this repository's own scenarios; and nothing detects a
vacuous control mechanically. The first of those was routed 54/01 → 54/02 → 54/03 and landed nowhere,
because `ADR-009 §1` forbids 54 choosing a bound at all — it is measured here rather than inherited a
fourth time, and it is the headline of the work that follows.
