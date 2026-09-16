---
type: spike
number: 56
slug: gate-probe-feasibility
title: "Gate-probe feasibility — can aof deliberately break itself and confirm the gate screams?"
status: done
owner: qa
created: 2026-08-13
updated: 2026-08-27
depends: []
timebox: 2d
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  SPIKE.md — the record doc for a de-risk spike. Answers ONE question:
  is the unknown resolved, and what did we find?
  A spike is a TOP-LEVEL DRIVER that groups no stories and carries no behavioural contract — no
  tasks/, no .feature. Its whole deliverable is a RECORDED FINDING; the code it produces (if any) is
  a throwaway prototype, never shipped as-is. "Done" = ## Finding is filled and the unknown is
  resolved (aof:verify checks exactly this). It gates the stream: 57 and 59 wait on it.
-->
# 56 · Gate-probe feasibility

## Question

**Can aof deliberately break an invariant and confirm its own fitness gate screams — repeatably, on
this machine, at a cost a routine loop can afford?**

This is the load-bearing unknown under both the paired-loops milestone (57) and the audit loop (59).
Both assume aof can *probe* its gates rather than trust them, and the repo has three facts that make
that assumption non-obvious:

1. **The gate has been dead before, silently.** `TECH_DEBT.md` item 5 is titled *"Part of the fitness
   gate is dead"*: 10 of 700 arch tests failing before any change, test files reading modules that no
   longer existed, and the verdict "the gate reads green-ish while not running". It was repaired by
   hand; nothing watches for the recurrence. A probe is the only thing that would have caught it.
2. **The suite cannot be run whole on the machine that matters.** The control node holds `:4182`, so
   the full suite cannot run there — the standing discipline is focused runs via test-array imports.
   A probe strategy that assumes a full-suite run is a probe strategy that never runs.
3. **Scale and isolation.** ~400 test files and ~220 arch tests, and every aof test run must be
   isolated (`AOF_GLOBAL_HOME`) or it corrupts the real `~/.aof` — hook-enforced, and for good reason.
   A mutation-style probe multiplies runs, so cost and isolation compound.

Sub-questions the finding must answer: which probe class is affordable (mutation of production code,
mutation of the invariant a fitness function asserts, or removal-detection on the gate itself)? What
does one probe cycle cost in wall-clock and tokens? Can it run under the focused-run discipline
without a full suite? What granularity is useful — per-gate, per-milestone, or a sampled subset? And
is "the test moved to fit the code" detectable cheaply enough to serve as the build loop's
counter-metric, or must 57 pair on something else entirely?

## Timebox

- Box: `2d` — stop and record the best-available finding at the boundary; a timebox extension requires
  explicit re-scoping. A partial answer ("mutation probing is affordable only at this granularity") is
  a legitimate finding and unblocks its consumers; "we need more time to be sure" is not.

## Investigation

Three lanes ran concurrently against this repo at `8291bd7` (`aof work dispatch --list` reported
`bound: 3`), followed by two independent review passes that re-measured the load-bearing claims.
Every run was isolated with `AOF_GLOBAL_HOME`; the full suite was never run. **Corrections from the
review passes are folded in below and marked where a first-pass number was wrong** — several were,
and one was wrong by the exact mechanism this spike exists to indict.

### Baseline

| | as framed in the Question | measured at HEAD |
|---|---|---|
| test files | ~400 | **864** `.test.mjs` (522 directly under `test/`) |
| arch tests | ~220 | **341 files**, 1,252 test entries |
| scenarios | — | **4,681 `@executable`**, 369 `@manual`, 143 `@uat`, 1 untagged, across 774 `.feature` files |

**862 of 864 test files export a test ARRAY; only 26 use `node:test` directly**, and the array
entries total **7,145** (test entries, not assertions — one entry may assert many times). That single
fact governs every probe design below: the focused command this repo tells everyone to use runs the
file's wrapper and none of its assertions.

### Lane C — is "the test moved to fit the code" detectable? (the counter-metric question)

Measured over 157 commits, 80–82 of which touch production, read-only git throughout.

**The naive rule is useless, and the refinement ladder shows why:**

| rule | fires | % of production commits |
|---|---|---|
| L1 — "a test changed alongside code" | 77 | **93.9%** |
| L2 — a `.feature` was touched | 21 | 25.6% |
| L3 — an already-delivered `.feature` was *modified* | 7 | 8.5% |
| L4a — `@executable` scenario count **dropped** | 1 | 1.2% |
| L4b — a **closed-set assertion was opened** on a pre-existing file | 6 | 7.3% |
| **L4a union L4b** | **7** | **8.5%** — an 11x noise reduction |

Base rates, both reproduced exactly at review: `.feature` events under `wiki/work/*/tasks/` are
**773 added / 50 modified / 0 deleted**, so post-delivery contract modification is a 6.1% event —
whereas `test/**` modification is **656 events**, 13.1x more frequent. (The two legs are measured at
different scopes — `test/**` repo-wide against `.feature` under the work stream — which is stated here
because leaving it unstated is what made a neighbouring claim read as false; see the scope note below.)
The test-LOC : prod-LOC ratio ranges 0.07–6.80 with **no separation** between firing and non-firing
commits, so that leg of the candidate is noise and is dropped.

**Nine confirmed instances, across six commits**, with one dominant shape: *a closed-set invariant
relaxed to an open lower bound, by the milestone whose own additions would otherwise have failed it.*

| # | SHA | artifact | the move | authority at parent |
|---|---|---|---|---|
| 1 | `0e5c498` | `49/06 .../00_the-pulse-stops....feature` | 3 scenarios `@executable` to `@manual` (exec 5 to 2) | **clears** — the ruling is byte-present at `69d9087` |
| 2-5 | `0a22fb1` | `acd-loop-finding-envelope`, `work-loops-coverage-ledger`, `53/07 .../05_the-gates.feature`, `53/05 .../00_registration....feature` | set-equality relaxed to a superset bound on an **accepted milestone-52 gate**; a delivered scenario deleted and replaced by one asserting the inverse; and the story contract **widened to authorise** those very edits | **fails** — see the scope note |
| 6-7 | `8aa65d3` | `acd-registry-framework-owned`, `acd-registry-single-home` | exact count 9 relaxed to a lower bound; the test's own name changed from *"nine loop records"* to *"framework registry records"*; the `all installed records are tracked` assertion deleted | **fails** — the commit edits no `ARCHITECTURE.md` at all |
| 8 | `747c0a8` | `artifact-sync-enqueue-hook` | exact count 1 relaxed to a lower bound | inline comment only |
| 9 | `cec520b` | `acd-command-namespace` | exact count 23 relaxed to *"greater than zero"* — **inside the commit that repaired item 5's dead gate** | inline comment only |

**Scope note, and it is the whole discriminator.** The first pass recorded *"`ADR-015` has 0
occurrences at `9e0f910`"*. **Repo-wide that is false** — the id appears in three milestones'
`ARCHITECTURE.md` files and nine `src/` modules at that commit. It is exactly true **scoped to the
owning item's architecture record**: `wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md` carries
**0 occurrences at `9e0f910` and 23 at `0a22fb1`**. Anyone building the discharge rule from the
unscoped sentence would get a **false CLEAR on virtually every weakening**. The rule must name the ADR
id *cited by the weakened artifact*, counted in the *owning item's* `ARCHITECTURE.md`, at the story's
base commit.

**Two instances were mis-characterised on the first pass, and the correction changes the rule 57 must
build.** Both `cec520b` and `8aa65d3` added a **compensating closed-set assertion in the same hunk**:

- `cec520b` relaxed the count of 23 to `> 0` **and added** `assert.equal(byId.size, commandIds.length,
  "every declared command member renders exactly once (derived, not hard-coded)")`. That is not
  permanently satisfiable. It also relaxed `agentIds.length === 8` in the same commit — a second
  relaxation the first pass did not count.
- `8aa65d3` deleted `assert.equal(tracked.length, 9)` **and added** a per-record `git check-ignore`
  loop; it also widened the closed set `NODE_KINDS` from two members to three — a third uncounted
  relaxation.

So `cec520b` is **not** "a permanent loss of the invariant" and is **not** mechanically identical to
instance 6 — instance 6 *deleted* its compensating assertion where instance 9 *added* one. The lesson
survives in a sharper form: the commit that repaired *"part of the fitness gate is dead"* did convert a
brittle exact count into an open bound, and the only thing that keeps it honest is a compensating
bijection assertion that a count-only counter cannot see. **Leg (b) as first drafted fires on both, and
on every legitimate count-to-bijection conversion.** The measured ~89% file-level / ~86% commit-level
precision was computed over n=8 and does not cover this shape.

**Coverage delta on changed lines was built, measured and rejected.** `NODE_V8_COVERAGE` plus a
~50-line dependency-free offset-to-line mapper works (+47% on a small suite; *below* run-to-run
variance on a 15-suite run). It is **blind here**: 298 of 341 arch tests (87%) and 521 of 864 test
files (60%) assert by reading production source as text, executing zero production code. Story 55/00's
changed-line coverage of `src/work-loops.mjs` measured **100.0% (16/16)** — all 16 lines module-level
declarations "covered" by importing the module. Node's built-in coverage flag is worse: on an
array-exporting suite it reports one pass, zero fail and a full 42.49% table over a suite that never ran.

**The detection/disposition split — the load-bearing finding.** All nine instances carry a coherent
written justification, and in six of nine it is at least partly correct. Weakening and correct repair
are mechanically indistinguishable and are frequently *the same act*. One deterministic discriminator
measured well:

> **Did the authority move in the same act as the ball?**

**15 of 80 (18.75%)** production commits also edit an `ARCHITECTURE.md`, and **0 of the 8 per-story
commits** do. It is computed by reading the ADR at the story's base commit and counting a substring —
**no model reads anything**. Critically it does not read the justification comment: that comment lives
inside the artifact being weakened and is the optimizer's own output, so a watcher that reads it is
re-coupled to the maker.

A zero-baseline tripwire fell out alongside it: a skip/only/todo marker added to a pre-existing test
occurred **0 times in 656 modification events**, and none is present in the tree today.

**Granularity limit, corrected and sharpened.** The first pass reported "150 of 157 commits are squash
merges". **That does not reproduce — the repo has 0 merge commits**; 20 subjects end in `(#N)`. The
real limit is narrower and more important: the 8 true per-story commits are `feat(55/00..05)`,
`chore(55)` and `5038d5c` — **milestone 55 alone, one week, one author-run.** So "0 of 8 per-story
commits touch an ADR" could as easily be a property of m55's authoring habit as of the failure mode.
The per-story leg is grounded in **one milestone**, and 57 operates at exactly that granularity.

**Test selection for a probe cycle is already solved and fast.** `aof graph impact src/work-loops.mjs`
returns 23 reverse dependencies of which **19 are test files** (the first pass said 15), in
**611–1,672 ms warm** and 8.2 s cold, deterministically from graph edges rather than by grep.

### Lane A — mutation probing (classes 1 and 2)

Harness validity was proved before any verdict was trusted: on `acd-no-new-silent-catch` the focused
command reported `pass 1, fail 0` while the array driver reported `total=2 pass=1 fail=1` at the same
moment. The probe driver also refuses a verdict unless `git diff --stat` shows the mutation landed —
it fired twice. **2 of 16 mutators (12.5%) failed to land on first write**, so the landed-check is
mandatory, not a nicety.

**Class 1 — mutate the production code the gate reads. 12 probes, 12 DETECTED, zero survivors.** The
sample spanned every gate shape in the repo: grep-style source detectors, shrink-only ratchets,
count/budget assertions, content-address gates, registration meta-tests, and gates asserting
behaviourally over the real seam. Mean cycle **1,611 ms** (median 1,400 ms, range 723–3,679 ms), of
which the gate run itself is **644 ms**. *(Not independently re-verified at review — reproducing it
requires mutating production `src/`, which the review passes were forbidden. The claim rests on Lane A
alone.)*

One qualified result carries a design consequence. `acd-no-new-silent-catch` is *already red*, so
pass/fail counts were **identical before and after** the mutation; it was visible only in the failure
*message*. **A pass/fail oracle is insufficient on any standing-red gate, and 9 of 341 are standing
red — the oracle must diff the message, not the count.**

**Class 2 — weaken the invariant itself. 4 probes, 2 SURVIVED.**

| # | fitness function weakened | the weakening | did anything notice? |
|---|---|---|---|
| C2-1 | `acd-ui-surface-file-budget` | a file's ceiling 1000 → 5000 | **SURVIVED** — the census was byte-identical (fail=9 → fail=9) |
| C2-2 | `acd-ui-directory-budget` | a directory's ceiling 21 → 99 | DETECTED — **by the gate itself**, via its own "no headroom above delivered" clause |
| C2-3 | `acd-console-log-confined` | add a module to the closed printer set | DETECTED — **by the gate itself**, via its own "the set may shrink, never grow" clause |
| C2-4 | `acd-no-new-silent-catch` | bank all 5 standing offenders into the baseline | **SURVIVED — and the suite got GREENER: fail=9 → 8** |

**In four probes, no gate was ever caught by a _different_ gate.** Both detections were self-detection.

**C2-4 is the most consequential result in the spike**, and it was independently reproduced at review
(widening the baseline turns the gate GREEN; no other arch gate names the offenders). Weakening a
shrink-only invariant to absorb five real violations made the arch set report *one fewer failure*. The
thing 57 wants to counter is not merely undetected — **the only available signal points the wrong
way.** The mechanism matters for 57: weakening a *red* gate to green lowers the count, while weakening
a *green* gate leaves it unchanged (C2-1: 9 → 9). So the reward-hacking incentive is concentrated on
the standing-red set — worst exactly where TECH_DEBT item 27 already lives.

**Root cause of both survivors: the gate declares shrink-only in _prose_ and never _asserts_ it** —
verified directly at review on all four subjects. `acd-no-new-silent-catch` says in a comment that its
baseline "may only SHRINK"; nothing compares the baseline to the measured tree. The single clause
separating C2-1 from C2-2 is the whole finding — `ceiling > delivered + allowance` is itself a
violation. A static scan reported 28 suites holding a relaxable allowance table and 14 with no
self-watch clause; **that scan's definition was not published and could not be re-run at review**, so
treat the two counts as indicative and the root cause as verified.

**Two scope corrections to the first pass, both from review:**

- **"Nothing watches the watchers" is over-general.** 26 arch suites read `test/arch/**` or a runner in
  code, and `acd-test-suite-registration` is one of the 9 standing reds **precisely because it caught a
  different gate**. The accurate claim: *no gate watches another gate's invariant STRENGTH (thresholds,
  closed sets); the meta-gate layer that does exist watches REGISTRATION and FILE SHAPE.* That
  changes the oracle design — a self-run oracle is right for allowance-table weakening but blind to a
  weakening that alters a gate's file shape, so the proportionate oracle is *the mutated gate plus the
  ~26 meta-watchers* (~45 s), still far under a full census.
- **The Class-2 sample is confounded by species, not merely small.** All four Class-2 probes are
  numeric-allowance/ratchet gates, while the twelve Class-1 probes deliberately spanned every shape. So
  "2 of 4 versus 0 of 12" compares a narrow homogeneous sample against a broad one. **n=4.** The
  recommendation to spend probe budget on Class 2 rests on the structural argument — Class 1 tests
  whether the gate reads its subject, Class 2 tests whether the invariant is worth reading — not on the
  arithmetic.

### The spike's premise is wrong for the gate proper — measured in three independent harnesses

The Question asserts the suite "cannot be run whole on the machine that matters". **For `test/arch/**`
that does not hold.** Runs completed `rc=0` **while both daemons held `127.0.0.1:4181` and `:4182`**,
confirmed by `netstat` during a live run, in all three harnesses. **Exactly 7 arch suites mention those
ports and all 7 assert on URL and route literals; none binds.** The `:4182` constraint governs the
*full* suite, not the fitness gate.

**Timings, labelled by harness — the first pass conflated two modes and a consumer sized on the wrong
one would be ~2x out:**

- **single process:** 103 s, 157 s (review) and a 168 s median over 5 runs (Lane A), range 109–236 s
- **sharded at concurrency 8:** 68–82 s (Lane B), 76.7 s (review)

Either way the whole fitness gate runs on the control node, today, in **under three minutes**.

### Standing reds — found while baselining, not by probing

Full census on a clean isolated tree: **341 files, 1,252 tests, pass=1,243 fail=9.** The 9-file set was
reproduced **four times across three independent harnesses**, twice at review. TECH_DEBT item 27
records three of these; **six are in no ledger at all:**

- `acd-artifact-sync-hook-derivation-free` — the offender is `guard-test-isolation.mjs`: the hook that
  enforces test isolation is **in scope for a gate and failing it** (it lacks a bundled hook descriptor)
- `acd-feature-parser-single-home` — the Gherkin grammar has more than one recogniser under `src/`
- `acd-loop-scope-guard` — the loop scope guard must not widen the god-node parser; `src/work.mjs` changed
- `acd-milestone-66-controls-resolve` — a `done` milestone's register declares an unresolved control
- `acd-progress-ledger-consumed` — the `work:grade` invocation regex no longer matches
- `acd-test-suite-registration` — **turned red by `3bd8fc7 feat(55/03)`, and `8291bd7 chore(55)` then
  closed the milestone over it**

The last was verified independently three times: **3 pass / 1 fail** on a byte-clean tree, the offender
being `acd-raw-capture-before-classification.test.mjs` — milestone 55/03's own test file, which grew a
positional source slice its ledger allows zero of. It is item 27's worst species — a red introduced by
an item that closed green over it — arriving on the newest commits in the repo while this spike ran.

**The silent-catch ratchet's offender set has grown 1 → 5 unrecorded**: `board-worker-stream.mjs`,
`bundle/hooks/run-heartbeat-enqueue.mjs`, `commands/mesh-terminal-resume.mjs`, `mesh-launcher-lock.mjs`,
`work-observe.mjs`. (A first-pass section said "three"; five is correct and was confirmed at review.)

### Lane B — gate-liveness / removal detection (probe class 3)

Measured in two independently constructed `git archive HEAD` scratch trees, EOL-normalised, with
`node_modules` junctioned, every child under its own throwaway `AOF_GLOBAL_HOME`. **43 of 43 verdicts
matched across the two trees**, and the live daemons stayed up through ~2,500 child processes.

**A method defect was found mid-flight and it changes the numbers.** `scripts/test.mjs` sets a fresh
`AOF_GLOBAL_HOME` **per test**; item 27's documented focused-run recipe sets one per *file*. Per-file
isolation produced **13 false REDs**. The repo's own written workaround manufactures phantom failures.

**Census 1 — the number item 27 says nobody has.** A `node --test` sweep over all drivable suites
reports **every one GREEN**, `# tests 883, pass 883, fail 0`. But **862 of 864 files report exactly
`# tests 1`** — the wrapper — so **none of the tree's 7,145 test entries execute.** The one honest
exception is `test/work-observe.test.mjs`, which is also a file no runner imports: *the focused command
runs honestly only on a file nothing else runs.*

> **32 suites read GREEN under `node --test` while being RED when driven by import — 61 failing
> assertions** (9 arch files, 23 elsewhere). 12 are machine-environment refusals (Windows symlink
> privilege, a SQLite file-lock); **49 are genuine code/expectation drift.** The 9 arch members were
> re-verified one-by-one at review: **9 of 9 report `# tests 1, pass 1, fail 0`, rc=0** under
> `node --test` while red by import.

**Census 2 — the unwired population, and the worst single finding in this spike.**

> **26 suites are imported by `scripts/test.mjs` and NEVER SPREAD into the assembled array — 117 test
> entries. 21 of them were spread at `5d72faf` and lost it; 5 arrived unspread.** Both review passes
> reproduced 26/117 independently.

**All spread sites vanished in ONE commit — `15e0a92` (2026-07-26, *"Mesh network development
end-2-end first draft (#7)"*).** The imports were left in place, so the files still look registered.
**Those 117 entries have not run for a month, and 2 of the suites have already rotted red while dead**
(`mesh-node-identity`, `mesh-registry-store-seam`).

**The first pass counted 22 / 95, and the undercount has the same cause this finding indicts.** The
four it missed — `meshRelayBrokerFanoutTests`, `meshRelayEnvelopeResilienceTests`,
`meshRelayControlNodeTests`, `meshPresenceDegradationLoopTests` — each occur **twice** in the runner,
once as an import and once **inside a comment**, and zero times as a spread. The census used an
occurrence test and so **reproduced the very `runners.includes(basename)` defect it condemns**. Sharper
still, the comments doing the shadowing *assert liveness*: `scripts/test.mjs:1382` says those suites
"stays green" and `:1396` that another is "TRIMMED to its cadence-loop-only scenarios" — prose that has
been false for a month. The corrected method is a **spread-site count over comment-stripped source**.

**And the gate that exists to police this cannot see it.** `acd-test-suite-registration:151` filters on
`!runners.includes(path.basename(rel))` — a basename appearing anywhere in the runner text satisfies
it, comments included. **It checks import, never spread.** Its `TEST_DIRS` at `:60` is also
non-recursive, so `test/integration/**` sits outside the gate entirely.

This is a recorded lesson recurring at scale. Milestone 35's retrospective already carries it —
*"Arch-test bindings imported but never spread are silently-dead fitness functions"* — and it surfaced
in this spike's own mandated `aof work memory recall`. One milestone later, 26 gates went dark by that
mechanism. **A lesson written down and never converted into a control is the same defect class as a
control declared and never run.**

**Census 3 — vacuity, probed rather than inferred.** Lane B **defused the blinding fuses and re-ran 353
gates**:

- **0 gates went RED → GREEN; no fail-count moved. The blinding is LATENT today, not live** — nothing
  currently passes because it cannot see the shadowed characters.
- Gates that went GREEN → RED did so on their own non-vacuity self-check. **Review measured the
  population precisely: 3 gates, not the 5 first recorded** — `acd-acceptance-horizon-single-predicate`,
  `acd-controls-never-execute` and `acd-declared-id-single-home` assert
  `blinded.length > 0` over the real tree. Every other blinding-aware gate asserts the inverse and stays
  green after defusing. **Three arch gates at HEAD assert, as a live invariant, that this repository is
  currently blinded** — their proof-of-teeth is a precondition on the defect persisting, so paying item
  24 down turns them red and needs a ruling first.
- **The fuse's size is unresolved and must not be quoted from this record.** Lane B reported 9 modules /
  97,329 characters; review's straightforward reading of the same idea gave **20 modules / 279,537
  characters**, and one arch gate's own header says four modules. The three disagree because **the
  detector was never published**. Publishing the detector is the finding; the number is not yet a fact.

Genuine vacuity was found by instrumenting `fs` and asking which GREEN gates read nothing. Of 332 green
arch gates, 9 carried a signal. Two were reported; review corrected both classifications:

1. **`acd-mesh-identity-not-committed` — partially vacuous, and the fix is one line.** It reads
   `src/aof.schema.json`, which **does not exist** (the schema is at `schemas/aof.schema.json`), inside
   a `try`/`catch` that nulls the result and guards the assertion, so **that clause has never
   executed**. But the gate is not wholly dead: its config clause does run and pass. Re-pointing the
   path changes nothing today — the real schema declares no `properties.mesh.properties` — so the
   correction is zero-risk.
2. **`acd-no-internal-project-names` — DECLARED design, not a defect.** It early-returns when the
   gitignored, untracked `.aof/private-terms.json` is absent, so the privacy sweep is skipped on every
   clean clone and CI runner. The first pass filed this as vacuity; **the gate's own header states the
   rationale** — it protects the machine where a leak is authored, the only place a leak can be
   prevented rather than discovered. One of its three tests always runs. Listing it beside an accidental
   path typo conflated a ruling with a bug.

**The apparent contradiction pair is not a contradiction, and diagnosing it as one hands 59 a false
dilemma.** `acd-loop-level-l3-gated:89` asserts `acd-loop-level-l3-locked.test.mjs` does **not** exist,
while `acd-milestone-66-controls-resolve` is red **because** `53/FF-5305` cites that same path. Both are
right about their own moment: milestone 55 deliberately deleted the file (`baaf3f7`, *"L3 is earned,
never configured"*), and milestone 53's `ARCHITECTURE.md` carries FF-5305 with an explicit *"Discharge
condition: milestone 55"*. **Neither gate is wrong — the stale artifact is 53's register row**, which
still declares a control that 55 discharged.

**Census 4 — the standing reds, reconciled against item 27.** **Five** of item 27's ten rows are
discharged (`mesh-terminal-input-path`, `bundle.test.mjs`, `mesh-worker-driver-session-id`,
`acd-bundle-manifest-hashes` already struck, and — corrected at review — `fleet-terminal-view-producer-fed`,
which now runs **4 pass / 0 fail**). Of those still red, two are materially worse:
`acd-no-new-silent-catch` names **five** offenders where item 27 recorded one, and `memory-integration`
has degraded from `600 !== 727` to **`715 !== 1224`** — m40/R3's undischarged carry is now **509
records adrift**, up from 127. Both reproduce exactly.

**Cost, per sub-check.**

| tier | what | population | wall-clock |
|---|---|---|---|
| **0** | wiring check (unwired + **unspread**) | 864 suites + 2 runners | **0.159 s** |
| **0** | stripper-order + fuse + missing-path + guard scans | 934 test + 338 src | **~1.3 s** |
| **0 total** | pure static, no `node_modules`, no ports, no isolation | — | **≈ 1.5 s** |
| **1** | drive `test/arch/**` by import + `fs` vacuity probe | 341 files | **68–82 s** @ conc 8; 103–168 s single-process |
| **2** | drive the remaining 522 by import | 522 files | **~514 s** @ conc 6 |
| **1+2** | full liveness census | 864 files, 7,145 entries | **≈ 9.7 min** sharded (57 min serial) |
| **3** | detector-blinding defuse probe | 353 gates | **78 s** |
| — | `node --test` sweep, for contrast | 864 files | 90 s — **and it yields zero information** |

**Focused-run compatibility: yes, decisively.** 863 of 864 suites drove individually in their own
process while both daemons stayed up; the single exclusion is `global-work-propagation` (policy,
`:4182`). **Tier 0 is entirely static** — no ports, no `node_modules`, no isolation — so it runs
anywhere, including a CI runner that holds none. The census shards perfectly, one file per process.
Three harness requirements produce false verdicts if missed: a fresh `AOF_GLOBAL_HOME` **per test**
(13 false reds otherwise); `ui/dist` present (6 more); and `git archive` is **not** byte-faithful under
`core.autocrlf=true` (269 of 3,299 tracked files differ by EOL) — which is the very method item 27 uses
to confirm reds against pristine HEAD.

**Stated limits.** `global-work-propagation` is unmeasured. `asset-base-seam`'s 10 assertions need
Windows symlink privilege and are "not runnable here", not red. The `fs` vacuity probe covered
`test/arch/**` only — the confirmed-vacuous gates are a **floor, not a total**. Timings carry a ±20%
band from cache state and daemon contention.

## Finding

**Yes — aof can deliberately break an invariant and confirm its own gate screams, repeatably, on this
machine, at a cost a routine loop can easily afford. But the probe that matters is not the one the
question assumed, and the affordability barrier was never compute.**

**1. The premise about cost is wrong, and generously so.** No arch suite binds a fixed port — all 7
that mention `:4181`/`:4182` assert on URL and route literals. The whole 341-file fitness gate runs on
the control node with both daemons live in **68–82 s sharded at concurrency 8, or 103–168 s in a single
process** (label the harness; a consumer sizing on the wrong one is ~2x out). A Class-1 mutation sweep
of **every** gate costs **~9 minutes**; a pure-static liveness census of all 864 suites costs **1.5
seconds**. Affordability is not the constraint and no sampling scheme is needed. **The binding cost is
authoring valid mutations — agent turns, not compute.** That claim is load-bearing for tiers 4 and 5 and
is **not instrumented**: the Question asked for token cost and this spike did not measure it, though
`aof work observe` could. Measure it before scheduling those tiers.

**2. The gates catch broken code and do not catch broken invariants.** Class 1: **12 of 12 detected,
zero survivors** — teeth against the subject (Lane A's measurement, not re-verified at review, since
reproducing it requires mutating production source). Class 2: **2 of 4 survived (n=4)**, and in all four
probes **no gate was caught by a different gate**.

The decisive result, independently reproduced: **banking five real violations into a shrink-only
ratchet's baseline made the arch set report one FEWER failure (9 → 8).** The gaming move does not evade
the signal — **it improves it.** Any loop optimising on "arch failures went down" tunes straight into
it, and the incentive concentrates on the standing-red set, because weakening a red gate lowers the
count while weakening a green one does not. **57 must treat arch-failure count as an unusable
optimisation metric.**

The root cause is uniform and cheap to fix: gates declare shrink-only in a *comment* and never assert
it. The accurate scope of the "who watches the watchers" claim, corrected at review: **no gate watches
another gate's invariant STRENGTH; the meta-gate layer that exists watches REGISTRATION and FILE
SHAPE** — which is why the oracle for Class 2 should be *the mutated gate plus the ~26 meta-watchers*
(~45 s), not a full census (181 s) and not the gate alone.

**3. Liveness detection is the affordable probe class, and it catches a different failure class.**
Mutation asks *"does the gate fire when its subject breaks?"* — presuming the gate runs at all.
Liveness asks *"is this gate wired, non-vacuous and un-blinded?"* and answers it for **all 864 suites in
1.5 seconds**.

**The single worst instance: 26 fitness suites carrying 117 test entries were de-armed in one commit,
`15e0a92`, with the imports left behind so the files still look registered. They have not run for a
month, two have rotted red while dead, and the gate policing registration validates _import_ and never
_spread_ — so it cannot see any of it.** No mutation campaign could: each of those gates is *correct*
and would fire happily if anyone ran it. Milestone 35's retrospective recorded this exact near-miss
before it happened at scale, and it was never converted into a control.

Scope this honestly, per review: **the tier-0-discoverable dead population is 26**, not the 56 the first
pass implied. The 32 silent-false-passes are not dead — the sanctioned runner runs them and they are
red, and 9 overlap the standing-red set counted separately. Genuinely unwired is **1**, already
ledgered with a written reason.

**4. The build loop's counter-metric exists, is deterministic and costs ~1 second — but it detects
movement, not guilt, and it has one measured hole.** "A test changed alongside code" fires on **93.9%**
of production commits. Two narrow legs cut that to **8.5%** (11x reduction): the `@executable` scenario
count may not drop, and closed-set assertions may not be relaxed to open bounds on pre-existing files. A
third leg is free: a skip/only/todo marker added to a pre-existing test has fired **0 times in 656
modification events**. Coverage-delta was built, measured and **rejected** — 87% of arch tests execute
zero production code, and the one story measured scored **100% changed-line coverage over 16 lines of
frozen constants**.

Three corrections the review forced, all of which 57 must carry:

- **Leg (a) has a hole where the cases live.** `parseFeature` returns scenarios as
  `{name, outline, lane, verification, line}` — **no Examples rows**, with `Examples:` recognised only
  as a structural header. **1,044 of 5,194 scenarios (20%) are Outlines**, so deleting rows from an
  Examples table does **not** decrease the `@executable` count. That is the cheapest way to shrink an
  acceptance criterion in this repo and it is exactly the QA-owned surface. Leg (a) needs a rows-level
  leg or a parser extension.
- **Leg (b) needs a fourth, deterministic leg:** *was a closed-set assertion ADDED to the same file in
  the same commit?* Both sharpest instances added a compensating assertion in the same hunk, so leg (b)
  as drafted fires on every legitimate count-to-bijection conversion. The leg is computable from the
  diff the counter already reads, with no model and without reading any justification comment.
- **The discharge rule's scope is the whole discriminator** and must be stated: the ADR id *cited by
  the weakened artifact*, counted in the **owning item's** `ARCHITECTURE.md`, at the story's base
  commit. Unscoped, the rule reads false repo-wide and would clear virtually every weakening.

**The honest scope statement.** The counter separates *"an acceptance criterion or a closed invariant
got smaller"* from *"a test changed"* deterministically and cheaply. It cannot separate legitimate
repair from gaming, and no cheap signal can — that is settled by whether an independently-authored
authority **pre-existed** the change. So 57 pairs on the ratchet and routes disposition to the architect
node, never to a judge; the comment explaining each weakening lives *inside the weakened artifact* and
is the optimizer's own output, so a watcher reading it is re-coupled to the maker. Precision was
measured at ~89% file-level over **n=8 commits from a single milestone**, and does not cover the
compensating-assertion shape. Treat it as indicative, not as a rate.

**The recommended probe programme, by measured cost:**

| tier | probe | cost | cadence |
|---|---|---|---|
| **0** | static liveness: wiring (import **and spread**, comment-stripped), stripper order, fuse scan, absence-sweep inventory | **1.5 s** | **every build.** This alone would have caught the 26-gate de-arming on the day it happened |
| **1** | drive `test/arch/**` by import + `fs` vacuity probe (same run) | **~75 s** sharded | **every build / every merge** — this is the gate proper |
| **2** | drive the remaining 522 suites by import | **~9 min** | per work-item accept, and nightly |
| **3** | **detector-blinding** mutation (mutate the detector's *view*, not the subject) | **78 s** | per milestone, and on any diff touching a stripper or adding a shadowing comment |
| **4** | subject mutation (Class 1) | ~10 s compute per milestone's gates — **but turn-bound, not wall-clock-bound** | reserved for gates where liveness is proven and the question is genuinely "has it teeth" |
| **5** | invariant mutation (Class 2), oracle = mutated gate + the ~26 meta-watchers | ~45 s compute — **also turn-bound** | the higher-value mutation class on the structural argument; **n=4** |

Tiers 4 and 5 are priced in wall-clock but **gated on agent turns**, which are unmeasured. Do not
schedule them as if the compute figure were the cost.

Two design constraints bind anything built on this:

- **The oracle must diff the failure MESSAGE, not the pass/fail count.** On a standing-red gate a real
  break is invisible to a count oracle, and 9 of 341 gates are standing red.
- **Class 2's oracle is the mutated gate plus the meta-watcher set** — not a full census (which bought
  nothing in 4 of 4 probes) and not the gate alone (blind to file-shape weakenings).

## Outcome / Next

The unknown is **resolved**, and both consumers are unblocked with a concrete answer.

**57 (paired loops) — the build loop's counter-metric is settled.** Pair on a **contract-integrity
ratchet**, not on coverage and not on a judge: (a) the item's `@executable` scenario count may not
decrease — **extended to Examples rows, which the shipped parser does not expose**; (b) on files present
at the story's base commit, closed-set assertions may not be relaxed to open bounds, **unless a
closed-set assertion was added to the same file in the same commit**; (c) a skip/only/todo marker added
to a pre-existing test is a fire, from a measured baseline of zero. Reuse `parseFeature` and 54/04's
`executableScenariosOf`, extending the former for Examples rows. **Discharge is by pre-existing
authority — the ADR id cited by the weakened artifact, counted in the owning item's `ARCHITECTURE.md`
at the base commit — not by a model reading the justification.** Two things 57 must define that this
repo does not currently supply: **what "the story's base commit" is** (there are no merge commits, so
there is no natural base; the commit at which the item reached `in-progress` is one candidate), and
what counts as "closed-set". And 57 must treat **arch-failure count as an unusable optimisation
metric**, per C2-4.

**59 (audit loops) — the cadence is settled by the tier table**, and the audit's charter is sharper than
"check the instruments still work": at HEAD it must catch **import-without-spread**, which no mutation
probe can see and which de-armed 26 suites for a month. Tier 0 at 1.5 s makes a run-every-build audit
unarguable. 59 should size on the corrected premise — the fitness gate runs whole here in ~75 s sharded
— so the audit needs neither a full-suite run nor CI to exist first. It also inherits one ruling: three
gates assert as a live invariant that this tree is currently blinded, so paying item 24 down turns them
red.

**Remediation this spike surfaced but does not itself take** (a spike's deliverable is the finding):

- **Re-spread the 26 de-armed bindings**, and fix the registration gate — **but not by adding a spread
  check**, which is still a source-text test that a commented `// ...someTests,` would satisfy exactly
  as a comment satisfied the import check. The right instrument already ships:
  `acd-roundtrip-registration` imports the **assembled** `tests` array and asserts runtime membership.
  **Widen that mechanism to the whole tree, retire the substring lane, and recurse into
  `test/integration/**`.** Highest value, smallest diff in this spike.
- **Nine standing arch reds, six in no ledger**, including `acd-test-suite-registration` turned red by
  `3bd8fc7 feat(55/03)` with `8291bd7 chore(55)` closing the milestone over it. Item 27's count needs
  raising (never lowering, per its own rule); its documented focused-run recipe needs correcting —
  **isolation is per test, not per file**, and the per-file form manufactures 13 phantom reds; and its
  `git archive` confirmation method is not byte-faithful under `core.autocrlf=true`.
- **Not to be ledgered — these are owned, not debt.** (i) Milestone 53's **FF-5305 register row** still
  declares a control milestone 55 discharged: a `done` item declaring an unresolved control is an
  accept-transition defect, and it is one row. (ii) `acd-mesh-identity-not-committed`'s **wrong schema
  path** is a one-token, zero-risk correction that currently leaves an ADR-004 clause *never executed
  while ledgered as a live control* — the same "declared but never run" species this spike exists to
  condemn.
- **Publish item 24's blinding detector before quoting its size.** Three measurements of the same idea
  disagree (4, 9 and 20 modules); the detector, not the number, is the artifact.
- **`acd-no-internal-project-names` is NOT a defect** — its clean-clone vacuity is declared design with
  the rationale in the gate's own header. Recorded here so a later sweep does not "fix" a ruling.

These are findings, routed; they are not this spike's to fix.
