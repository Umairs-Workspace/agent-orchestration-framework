---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — the structural record. Answers ONE question: what was decided,
  and what must stay true? Owner: architect. ADRs + the fitness register.
  Behavioural acceptance lives in task .feature files, never here.
-->
# 54 · Verification as a feedback loop — Architecture

> **Measured on this tree at refine (2026-08-22).** Every claim this milestone FREEZES was re-measured
> at HEAD first (`66/ADR-009/A`); where a measurement contradicted the SPEC, it won (§ Corrections).

## Grounding — the coupling this partition follows

Drawn from `aof graph build .` (code-only, `egress: none`, `builtAt: 2026-08-22T09:47:47.248Z`, 11,720
nodes / 28,275 edges) plus `aof graph impact` per boundary; bold = the `src/`-only dependent count.

| Module | deps | dependents (src-only) | Read |
|---|---|---|---|
| `src/work.mjs` | 6 | 256 (**33**) | **The stream's god-node.** m37's rule: at most one story per milestone may edit it. **54 edits it ZERO times** (ADR-006). |
| `src/command-core.mjs` | 79 | 116 (**6**) | The registration hub. **At most one story registers** (ADR-003). |
| `src/work-loop.mjs` / `src/commands/loop.mjs` | **0** / 9 | 12 (**1** each: the shell / `command-core.mjs`) | The loop pair: a pure leaf owning `GATE_ORDER` and `LOOP_STOPS`, and the shell where the findings are dropped today (also 70/04's home). |
| `src/work-doctor.mjs` / `src/work-doctor-freshness.mjs` | 8 / 1 | 17 (**4**) / **1** | The check spine — one seam: a fourth `CHECK_GROUPS` entry + one snapshot field — and beside it the one-lane shape 54/04 copies (a leaf with one dependent). |
| **Read, never edited** | — | — | `commands/{validate,doctor}.mjs` (3 / 2 dependents — the gate faces); `work-doctor-controls.mjs` (9 — `66/FF-6605` guards it; the lane SHAPE is copied, the file is not); `feature-parse.mjs` (**0 deps** — the ONE parser, `66/ADR-003`); `effects/run-transitions.mjs` (17 — `brief` passes **through**, `68/ADR-009`); `run-store.mjs` (46 — no key, state or transition). |
| `src/graphify.mjs` | — | — | **The shipped precedent for spawning a foreign tool**: bounded, stdin-closed, success proven by an ARTIFACT and never by an exit code. ADR-004/005 copy its shape. |

Four measured facts drew it: the loop leaves are cheap and the god-nodes are not, so everything here is
reachable without touching `work.mjs`; the fitness lane already knows how to name a fitness function but
is **not in the gate** (`grep -ci` for `doctor|controls|fitness` over both loop modules returns **0**,
while six of the controls lane's eight codes carry an `FF-NNNN`); `graphify.mjs` is the one family
already spawning a foreign program safely; `work-doctor-freshness.mjs` is the cheapest cut.

---

## Corrections to the SPEC's premises

Refine is the last honest place to check a SPEC's factual claims: two did not survive, one is a
behaviour change accepted deliberately, one was resolved by the operator.

1. **"`validate` and the fitness functions grade before any review turn is spent"** (`SPEC.md:50-51`)
   — **only the first half was wired**: `GATE_ORDER` (`src/work-loop.mjs:39-43`) named `work:validate`
   alone, and neither loop module mentioned the doctor, the controls lane or a fitness function.
   ADR-007 lands the missing half; 54/02 is the story.
2. **"deterministic grading runs before any model grading"** (`SPEC.md:32-33`) — **true then only of
   MALFORMED rubrics**: no deterministic aof command could say *which scenario failed and by how
   much* (RESEARCH §Q4; the only producer was the model's prose in `VERIFICATION.md`,
   `verify.md:80-114`), so the SPEC asked to reorder two graders of which **one did not exist**.
   ADR-001 through ADR-005 build it.
3. **Putting the fitness half in the gate is a BEHAVIOUR CHANGE, not a wiring fix** — after 54/02 a
   repo with a standing `error` doctor finding meets a halt where today its loop runs on. **Accepted
   deliberately** (the SPEC's own scope bullet), measured and ruled in ADR-007 §2a/§2c.
4. **The runner's admissibility.** STATE's operator ruling (2026-08-22) settles the one open
   question: **aof executes the rubric; QA authors it** — ADR-001 records it, and no ADR re-opens it.

---

## ADR-001 — aof EXECUTES the rubric; QA AUTHORS it. The line is AUTHORSHIP, not execution

**Status.** Accepted. *(Records the operator's ruling of 2026-08-22, STATE § Notes.)*

**Context.** Two shipped rules look like they forbid this milestone, and neither does.
**`66/ADR-004` §2 — "ACD never executes anything"** is scoped, at source, to two named modules —
`acd-controls-never-execute.test.mjs:51-52` pins the lane and the spine and checks their **direct
imports** — and nothing in it reaches `aof work loop`, which already spawns whole interactive
`claude` sessions: running a declared test command is a strictly smaller act than spawning an agent that
will run it anyway. And **`53/ADR-005`'s "the shell NEVER encodes product judgment"** is a rule about
*deciding*, not *doing*: every `LOOP_STOPS` id names a producing code precisely so the shell reports what
a store or driver returned rather than forming an opinion.

**Decision.** The line is **authorship**, and it is stated as a pair.

1. **QA AUTHORS the rubric.** Which scenarios exist, what each asserts, which fitness functions are
   declared, what "correct" means, and **which command runs them** — all of it is authored outside this
   shell, in `.feature` contracts, in the `## Fitness functions` register and in ADR-004's `work.rubric`
   declaration. aof proposes none of it and edits none of it.
2. **aof EXECUTES what was declared and reports what came back.** Spawning a declared argv, bounding
   it, reading a machine-readable report and structuring the result is deterministic control of the
   kind `53/ADR-005` describes. **aof never decides whether a rubric is right, whether a scenario is
   fair, or whether a failure is acceptable** — those stay model judgments, reaching the shell
   unchanged as `session-needs-input`.

**The consequence that makes the pair enforceable:** aof must never *infer* a result — every fact in
the grade record is either something QA declared or something the runner emitted (ADR-006), because
the moment aof classifies a runner's prose it has begun forming an opinion about a rubric, which is
QA's half of the pair. `68/03` retired exactly that instrument (commit `4eabc74`), at full force here.

**Consequences.** `66/FF-6605` stays green and unweakened — 54 edits neither file it guards (the gate
*invokes* `work:doctor`, never imports its lane) — and is **extended, not relaxed**: FF-5407 adds the
grade modules to the set the controls lane may not reach.

---

## ADR-002 — Testing is OBSERVED, never rewired: 54 is strictly additive, and an unconfigured repo loops exactly as it does today

**Status.** Accepted. *(Holds the operator's no-regression constraint, 2026-08-22.)*

**Context.** Testing is not a feature this milestone builds — it is a live system it is wiring into a
**termination decision**: `continue.md:134-135` already terminates the build lane on *"every task's
`@executable` scenarios/rows are green and fitness functions pass"*. Measured at HEAD: **719 `.feature`
files, 4,772 scenarios, 4,290 of them `@executable`**; **316 files under `test/arch/`**; one runner
script of 3,804 lines assembling an in-process `{ name, run }` array. A design that touches how any of
that is written, named, registered or discovered is the wrong design.

**Decision.** Three rules, and every ADR below is subject to all three.

1. **Strictly additive, to `53/ADR-001`'s standard** — that ADR left all 49 dependents
   **byte-unchanged**; 54 adds a reader and changes no writer. The two runner scripts, the
   `{ name, run }` harness shape, the import-and-spread idiom, the per-test `AOF_GLOBAL_HOME` rotation
   and every suite's exported names are **not edited by any story here** (FF-5401).
2. **aof never becomes the test runner.** No module in `src/**` imports a runner script or anything
   under `test/**`, and none dynamically `import()`s a project test file; the one route to a suite is
   ADR-004's declared argv, in a child process. This also honours the m04/R3 near-miss surfaced at
   recall — *"importing the runner from a meta-test created an import cycle"* — by never importing it.
3. **An unconfigured repo's GRADE LEG is a no-op** — `m26/ADR-001`'s rule (*"an unconfigured-mesh install
   is byte-identical to today"*) and `66/ADR-004`'s honest no-op: the leg does not run **and says so**,
   never a silent pass. Its evidence is the three shipped loop suites
   (`test/loop-command-{gate,sequencing,stops}.test.mjs`) staying green **unedited** — `m08/R2` warns that
   "green verbatim" and "guarantee preserved" are different claims, and here they coincide. **This
   guarantee covers the grade leg and NOT the gate**: 54/02's doctor leg is a deliberate behaviour change,
   ruled in ADR-007 §2a. FF-5404 and FF-5410 split accordingly.

**Consequences.** The blast radius on the test system is one config key and one child process. Cost
named: aof cannot improve a project's runner, select its cases, or make a badly-scoped suite cheap — only refuse to believe it (ADR-005).

---

## ADR-003 — The runner lives behind ONE registered command whose BARE face is a READ; execution is opt-in, re-entrant-safe, and never on the board

**Status.** Accepted.

**Context.** Three homes were considered and two are closed. `validateWork` sits inside the
**256-dependent** god-node, is gated by m37's one-story rule, and must stay pure, fast and offline;
`work-doctor-controls.mjs` is closed by `66/FF-6605`. That leaves a new command, itself a hub act:
`src/command-core.mjs` has **116 dependents**. Registering a `work:*` command trips a family of
registry-derived gates, and `m19/R1` (surfaced at recall) is explicit that an ADR must **enumerate every
one**, not just the CLI bijection. Measured at HEAD, the five are: `acd-work-command-cli-bijection` needs
one `argsFor` case (its `default:` throws at `:273`) — `["work","grade","03","--json"]`, the READ face;
`acd-work-command-route-coverage` needs one documented `BOARD_DEFERRED` member (`:66`);
`acd-test-suite-registration` needs each new arch suite imported **and spread** (TECH_DEBT item 50: an
imported-but-never-spread suite is invisible to it); `acd-command-route-derived` and `acd-launcher-seam`
need **nothing** (52/ADR-012 §1 generalised the route leg; `work:grade` declares no `cli.launch`) — but
both are **verified at build, never assumed**.

**Decision.**

1. **One pure leaf, `src/work-grade.mjs`** — nothing from `src/`, no `node:child_process`, no `node:fs`,
   no clock — holding ADR-005's frozen vocabularies, the verdict rules, the report normalisers and the
   pure, injectable spawn-options builder: `70/ADR-002`'s shape and `graphify.mjs`'s
   `graphifySpawnOptions`, exported and pure *so a unit test asserts the guards without a live binary*.
2. **One registered command, `work:grade`, route `["work","grade"]`** — the sole impure edge, holding
   the one spawn call, exactly as `commands/drive.mjs` holds the one PTY call.
3. **The BARE face is a READ; `--run` executes.** `aof work grade <ref>` reports the **plan** (argv,
   cwd, report path, floor) and the **last recorded grade** from the run store, and executes nothing;
   `--run` is the only door to a spawn. This is not stylistic: the bijection gate **spawns
   `aof work grade 03 --json` as a real subprocess from inside the suite**, so an executing bare face
   would make this repo's test suite spawn itself — that gate's own comment already states the house
   rule, and `work:resume`'s bare-sweep-is-the-read is the shipped precedent.
4. **No board route, and no board change.** `work:grade` joins `BOARD_DEFERRED` with a documented
   reason: a `GET /api/work/grade` that executed a suite would let a page load spawn a test run, and
   the route-coverage gate stands the server up and hits every served route. The grade still reaches the
   board on the run record via `work:run-status` (`53/ADR-004` §5); `board-ui.mjs`/`ui/` are not edited.
5. **Re-entrancy is refused structurally.** The spawn sets a stamp in the child's environment; a
   `work:grade --run` that finds it already set refuses with `runner-spawn-failed` rather than
   recursing — a rubric command that invokes aof must not be able to fork a grader tree.
6. **No new `/aof:*` wrapper.** `53/ADR-008`'s ruling, unchanged: `/aof:continue` and `/aof:verify`
   are the wrappers, and the prompt-layer wording is **71's**.

**Consequences.** 62 and 63 get a face — a named command with a frozen `--json` document — and
`commands/loop.mjs` stays thin, invoking a registered command exactly as it invokes `work:validate`
at `:558`. **The alternative Context does not already close** — *no command, a helper called only from
`commands/loop.mjs`* — is **rejected**: it gives 62/63 nothing to call, hides the plan from an operator,
and puts a spawn inside the shell `acd-loop-probe-contract` holds to a probe discipline.

---

## ADR-004 — The rubric is DECLARED as an argv, in its own `work.rubric` home; `work.controls.runners` keeps its meaning exactly

**Status.** Accepted.

**Context.** `work.controls.runners` (`RUNNERS_CONFIG_KEY`, `src/work-doctor-controls.mjs:93`) exists
and answers a **different question**: *which files register controls*, read as text and substring-
matched for a control's basename (`work-doctor.mjs:439-450`, leg B). Overloading it with commands would
break leg B, which opens each entry as a file. Measured at HEAD: this repo's own `.aof/aof.config.json`
sets **no `work.controls` key at all**, so `aof work doctor 70` reports `control-runner-unchecked`
today — the honest no-op, live.

**Decision.** A sibling **subtree**, not a sibling meaning. `m48/ADR-003`'s rule (cited by
`70/ADR-005`): two facts, two homes, no join.

```jsonc
work.rubric = {
  command: ["node", "scripts/test.mjs"],  // ARGV ARRAY, never a shell string: no shell, no
  args:    { ref: "--scope" },            //   interpolation, no word splitting. OPTIONAL `args`;
                                          //   absent ⇒ the runner runs whole, knowingly.
  env:     { "AOF_GLOBAL_HOME": "..." },  // What the runner NEEDS. aof adds nothing but ADR-003 §5's stamp.
  report:  { format: "tap", path: "…", floor: 1 },  // WHERE the report lands, in WHICH format, and the FLOOR.
}
```

Four rules on that shape, each measured into existence:

1. **`command` is an argv array, never passed to a shell.** The house already plans argv arrays
   (`frameworks.mjs`'s plan/execute split; `graphify.mjs`'s arg builders; the bijection gate's own
   `argsFor`); a shell string would make the declaration environment-dependent, which a grade must not be.
2. **The environment is DECLARED, never inferred.** aof does not know that this repo's suite must run
   under `AOF_GLOBAL_HOME`, or that the full suite is unsafe on the control node — and must not guess.
   **The hazards are the project's to declare; aof's job is to run precisely what was declared.**
3. **Scope is the project's too, and the doctrine already exists.** `verify.md:85-92` rules it: a
   **story** runs its own scenarios plus the fitness functions, the full suite runs **once at the
   milestone gate**, and *"never silently widen to everything."* `work.rubric.args.ref` makes that
   machine-readable; absent, the runner runs whole — chosen knowingly rather than chosen for you.
4. **Unconfigured is an honest no-op.** No `work.rubric` ⇒ `verdict: "indeterminate"`, code
   `rubric-unconfigured`, naming the key to set (`roadmap-folder-mismatch`'s idiom verbatim,
   `work-doctor-freshness.mjs:9-11`); the loop proceeds exactly as today (ADR-002 §3, ADR-007 §3), and
   **it is never read as `pass`.**

**Consequences.** `work.controls.runners`' meaning, its readers and `66`'s leg B are untouched — the
no-regression rule applied to configuration. A project gets a rubric in four lines. This repo's own
declaration is a **focused, isolated** command because its measured hazards require it; nothing in aof
forces that, and nothing in aof would have known to.

---

## ADR-005 — GREEN IS POSITIVE EVIDENCE. The verdict is a closed triple, the codes are a frozen contract, and an exit code proves nothing

**Status.** Accepted. *(This is the milestone's own worst failure mode, ruled.)*

**Amended:** 2026-08-22, at 54/00's verify (finding **F-54-00-2**) — **§2(c)'s MEASURE is superseded.
The clause's original text below is left unedited.** `total > 0` **and** `total >= report.floor`
counts SKIPPED cases toward the evidence floor, so a suite in which every case skipped grades `pass`.
Measured through the shipped compiler: four cases each carrying `# SKIP`, a clean exit and a declared
`floor: 4` → `verdict: "pass"`, `codes: []`, `cases: {total: 4, failed: 0, skipped: 4}`. The ratchet
does not catch it either — a prior four-case pass sets a bar four skips clear.

**The measure is now the cases that RAN — `total - skipped`.** Both halves of §2(c) read against it
(`ran > 0`, `ran >= report.floor`), and the ratchet's bar is drawn the SAME way from the last
recorded `pass`. Drawing them differently is the actual bug available here: a suite that legitimately
skips ten of forty would set a bar of forty and then refuse its own healthy re-run. §4 is untouched —
`cases` is still reported exactly as observed, because a skip is evidence about the RUN and belongs
in the record; it is simply not evidence that anything was verified.

**This is an amendment, not a defect fix.** The compiler conformed to (c) exactly as written; what
was wrong was the clause. The rule being restored is §2's own heading — `pass` requires POSITIVE
evidence — and a case that did not execute evidences nothing. No tenth code is coined and no verdict
added: the refusal is `report-vacuous` at `indeterminate`, the shape §2 already uses for a report
that is vacuous *as evidence*, so FF-5403's set-equality on the frozen nine is untouched. Carried by
`tasks/03_a-skipped-case-is-not-evidence.feature` and by FF-5402, re-aimed in the register below.

**Context, re-measured at HEAD today** rather than inherited, because this is the claim the milestone
freezes. `node --test test/arch/acd-controls-never-execute.test.mjs` prints `# tests 1 # suites 0
# pass 1 # fail 0` and exits **0** — while the file declares four real arch-tests and **none of them
ran**: the "test" is the file itself and the suite count is zero. A grader reading that as green would
ship a lie into the loop's termination decision, and § Codebase health counts three more instances of
the same class on this tree. `m47/R8` states the rule — *a gate's non-vacuity proof must be
self-contained, and reachable* — and `m11/R2`, a bug rather than a preference, the other half: *a
command that wraps a subprocess must check its exit status before reading its expected output.*

**Decision.**

**1 — The verdict is a CLOSED triple** — `GRADE_VERDICTS = Object.freeze(["pass", "fail",
"indeterminate"])` — and the third member is not invented: `verify.md:104` already rules a third
verdict for design conformance (*"`INCONCLUSIVE` when no base URL / screenshot is available … Name
the missing baseline as the gap rather than inferring"*). This is that vocabulary, one level over.

**2 — `pass` requires FOUR pieces of positive evidence, all of them, and an exit code is none of
them.** The exit status is checked **first** (`m11/R2`), then discarded as insufficient: **(a)** the
declared report **exists** on disk after the run; **(b)** it **parses** in its declared format;
**(c)** it enumerates **named cases**, `total > 0` **and** `total >= report.floor` — the `assertRead`
instrument (`acd-loop-probe-contract.test.mjs:25`) moved from an arch-test into the grader; **(d)**
every case carries a status from that format's own vocabulary — a case with no status is not passing.

**The declared floor is the primary; a ratchet is the backstop.** A grade observing fewer cases than
the last **`pass`** recorded for the same ref (run store, ADR-008) is `report-vacuous` with no
configuration at all — `69/ADR-004`'s idiom, and what catches the `node --test` shape above.

**3 — The code set is FROZEN and every member has a named producer** (`66`'s `CONTROL_FINDING_CODES`
idiom; `m20/R2`: *a frozen and classified key with no writer is a contract hole*).

```js
export const GRADE_CODES = Object.freeze([
  // → INDETERMINATE. "rubric-unconfigured" is the honest no-op; the rest are a runner aof could
  //   not launch, could not outlast, or whose report is absent/unparseable/below the floor.
  "rubric-unconfigured", "runner-spawn-failed", "runner-timeout",
  "report-missing", "report-unreadable", "report-vacuous",
  "case-failed",        // → FAIL. ≥1 enumerated case reported a failing status.
  "case-unjoined", "scenario-unjoined",   // → ADVISORY (ADR-006); never move the verdict.
]);
```

The last two are **advisory and never change the verdict** — a second question asked of the same
data, stated apart so neither is mistaken for the other (`m47/ADR-009`'s shape).

**4 — The record's JSON is the contract; the human render is a projection** (`m05/ADR-004`), and each
of the nine codes must be **reachable by a fixture** (`66`'s non-vacuity rule) or it is frozen and dead.

```js
GradeRecord = {
  ref, verdict, codes,                    // codes in GRADE_CODES' own frozen order
  runner: { command, cwd, exit, durationMs } | null,  // what was ACTUALLY run; null when unconfigured
  report: { format, path, floor } | null,
  cases:  { total, failed, skipped },     // the OBSERVED counts — the evidence, always reported
  failures: [ { case, message, scenario } ],  // EMITTED verbatim; scenario null when unjoined
  gradedAt,
}
```

**5 — The spawn is BOUNDED, and 54 does not choose the bound.** stdin closed, stdout/stderr captured, the
deadline force-kills, a timeout is `runner-timeout` — `graphify.mjs:195-217`'s envelope in shape, not in
code. The **value** is `69/ADR-002`'s `startToClose` through `69/ADR-001`'s home `src/loop-bounds.mjs`:
`53/ADR-009` §1 unchanged, 54 enforces a bound, invents none, and **opens no rival home** (overlap 3).

**Consequences.** The grader can report `indeterminate` on a healthy repo whose runner it could not
read — the intended trade: an indeterminate that halts costs an operator a minute; one read as `pass`
costs a milestone.

---

## ADR-006 — The subject is what the runner EMITS; a scenario join is DECLARED, never inferred, and an unjoined case is reported unjoined

**Status.** Accepted.

**Context — measured at HEAD today, and the measurement is the decision.** Across 719 `.feature` files
there are **4,744 distinct scenario names**; across `test/` and `test/arch/`, **5,725 declared test
names**. Of those, **0** equal a scenario name and **1,203** *contain* one of more than 25 characters — so
an exact-name join would resolve **nothing** and a containment join roughly a quarter. The
`.feature`-to-test references that do exist (178 files mention a `test/…` path) are all in **comments**:
prose, not a join. And the id namespace that could carry a scenario id is **closed and frozen**:
`ID_FORMS` (`src/declared-id.mjs`) is five members pinned by set-equality on a module with 10 dependents,
and `validateWork`'s tag check would reject a new scenario tag. There is therefore **no join key both
sides already carry** — `68/ADR-005`'s situation: join on a key both sides hold, and *"an unattributable
run is reported as unattributed"*.

**Decision.**

1. **The grade's subject is the case identity the runner EMITTED, verbatim.** aof does not own the
   producer, and `m38/ADR-008` is unambiguous: *"Wherever we do not own the PRODUCER … the contract test
   MUST be fed a REAL CAPTURED payload."* The report normalisers are proven against **captured real
   output**, never a hand-written fixture of the believed format.
2. **The loop needs no scenario identity to re-drive** — what re-drives a maker is *which cases failed
   and what they said*, strictly more actionable than a scenario name, so `SPEC §Scope`'s rubric
   feedback is complete without the join.
3. **The scenario join is a DECLARED pairing: a case names its scenario.** aof asserts one thing — an
   enumerated case's name **contains** an `@executable` scenario name from the item in scope — and QA
   makes it true by naming the case after the scenario (`66/ADR-004`'s leg B one level down, already
   CI-pinned). It never decides what a result *means*; the meaning is the status the runner emitted.
4. **A miss is REPORTED, never guessed** — a case naming no scenario is `case-unjoined`, an
   `@executable` scenario named by no case is `scenario-unjoined`, and both are **advisory**
   (ADR-005 §3).
5. **The join lane is deterministic, horizon-scoped, and at `warn`.** It is a new `work:doctor` lane
   reading the **last report as snapshot text**, exactly as leg B reads `runnerTexts`
   (`work-doctor.mjs:439-450`) — a read, never a run, so the doctor stays pure. Both legs report at
   `warn` and therefore **never gate** (ADR-007 §2): measured, ~75% of `@executable` scenarios would
   report `scenario-unjoined` on arrival, and an error would be a wall of inherited red (chore 64's).

**Consequences.** This fills the hole `validate` has announced since m15 — *"test-traceability
(@executable → green test …) is not yet checked here"* (`commands/validate.mjs:57`) — **outside**
`validateWork`, so the 256-dependent god-node is untouched (ADR-003).

**Alternatives considered.** *A regex classifier over runner stdout* — **rejected, and it is the
ruling this milestone most needed:** `68/03` retired that instrument, and `acd-loop-probe-contract`
already forbids its shape in the loop shell. *A scenario-id namespace (`@case:` tags, or a sixth
`ID_FORM`)* — **rejected on measurement:** a set-equality-pinned namespace with 10 dependents and a
closed tag vocabulary that would refuse the tag, in exchange for making 4,290 scenarios retroactively
wrong. *Infer the join from the 1,203 containment hits* — **rejected:** `68/ADR-005`'s named defect.

---

## ADR-007 — The gate is a monotone COST LADDER, and it gains exactly ONE new stop id

**Status.** Accepted.

**Amended:** 2026-08-23, at 54/03's review (finding **D4**, confirmed independently by both
reviewers) — **§1's SHORT-CIRCUIT sentence is qualified. The clause's original text below is left
unedited.** *"Each gate short-circuits the ones after it … a red doctor never pays for the runner"*
was written as a **cost** property, and the shipped loop does not hold it: `commands/loop.mjs:1287`
invokes `work:grade --run` unconditionally after every completed build, ~95 lines before rung 1 is
consulted at `:1381`. Measured on this tree (a fixture declaring `work.rubric`, one red validate
finding, cap 2): gates announced `["work:validate", "work:grade", "work:validate", "work:grade"]`,
**2 rubric spawns over 2 completed builds**, and the payload carried `["work:validate",
"work:grade"]`.

**The short-circuit governs the DECISION order, not the cost.** Rung 3's answer is taken **once per
completed build**, before the ladder is walked; the ladder then decides in cost order and the
cheapest red rung still decides first. The measurement above shows the decision half intact — with a
red validate, `work:doctor` was **never invoked** and **no verify session was driven** — and the cost
half broken only at rung 3, which is where 69/06's ledger needs the answer.

**Two accepted facts force this reading, and neither is negotiable here.**

- **54/03's own task 00 scenario 2 is UNSATISFIABLE under a cost short-circuit.** *"a story whose
  gate produced one validate finding **and** one failing case … the payload carries both"* requires
  the grade to have been taken on a cycle whose validate was red. It is delivered, and a delivered
  acceptance criterion is immutable.
- **69/06's per-build ledger needs the answer on every completed build**, which is the call site at
  `:1287`. That call site is 69/06's, not 54/03's.

**What this costs, stated rather than hidden.** A red validate now pays for one bounded child
process a cost short-circuit would have saved. That price is bounded by ADR-003's
one-spawn-per-`--run` rule and 69/ADR-002's deadline — it is never a second spawn for the same
answer, and rung 3 at the gate **reads** the answer already taken rather than launching again
(`commands/loop.mjs`, the rung-3 block). What the ladder still buys is the expensive rungs it
skips: rung 2's snapshot and rung 4's whole agent session.

**The alternative was re-contracting 54/03 task 00 scenario 2, and it is refused** — editing a
delivered `.feature` is forbidden. **A consequence is flagged rather than papered over:** 54/02's own
delivered `00_the-cost-ladder.feature` says *"And no runner is spawned"* under both the red-validate
and red-doctor scenarios, and under this ruling that clause is false for a repository that declares a
rubric. It was never measured — its guard ran over a fixture with **no rubric**, so it could not
observe a spawn at all — and the guard is re-aimed to this ruling in
`test/loop-gate-cost-ladder.test.mjs`. The contract discrepancy is recorded in STATE.md's
`## Feedback (for retro)`; the `.feature` is untouched.

**Context.** `GATE_ORDER` (`src/work-loop.mjs:39-43`) is three frozen rows and names one gate
command. `53/ADR-005` §6 declared the order *"because 54 depends on it"*, and `53/ADR-009` §2 hands
54 the rubric. `LOOP_STOPS` is a **closed** eight-member set, and `53/ADR-005` explicitly rejected
an open one because 54 and 63 both read it.

**Decision.**

**1 — Four gates, ordered by strictly increasing cost, each able to answer alone.**

| # | Gate | Cost | Answers |
|---|---|---|---|
| 1 | `work:validate` | in-process, pure, no configuration | is the item well-formed |
| 2 | `work:doctor` | in-process; one snapshot of item + report texts | which **fitness function** is unresolved, unregistered or missing its red probe |
| 3 | `work:grade --run` | one bounded child process, seconds to minutes | which **case** failed, and what it said |
| 4 | `drive verify` | a whole agent session — minutes and tokens | everything a model must judge |

**Each gate short-circuits the ones after it** — a red `work:validate` never pays for the doctor, a red
doctor never pays for the runner, a red runner never pays for a review turn: "deterministic before model"
generalised from a boundary into a ladder, and what makes step 2 worth landing alone (**the SPEC's own
missing half, needing no runner at all**).

**2 — The doctor gate reads `severity === "error"` only, and never `loopReady`.** Measured today: `aof
work doctor 70` emits `warn: numbering-gap` on this very tree, so a gate that read warns would block every
loop in this repo on a stream-wide numbering artefact; `53/ADR-007` already rules that the Loop-Ready
score never gates below L3, and this gate does not consult it. `66/ADR-002`'s horizon supplies the
severity — `severityFor` (`src/acceptance-horizon.mjs`) answers **`error` inside the horizon** (the item
is open, exactly the items a loop drives) and **`warn` outside it** (`done`, un-actionable), and a
`pending` control is already `warn`. The gate inherits that model.

**2a — The doctor gate IS a behaviour change, and its first measurement was an ARTEFACT.** ADR-002 §3's
guarantee is scoped to the **grade** leg: with no `work.rubric` the grade is a no-op, but the doctor gate
runs regardless. This section first reported *"zero open items halt"*; **that figure was wrong**, and the
correction in full — mechanism included — is **F-54-REFINE-1** in `VERIFICATION.md`. Half stands:
stream-wide, `aof work doctor --json` returns **397 findings, 396 `warn`**, dominated by
`mtime-ahead-of-updated` (243) and `doc-over-budget` (69) on `done` items, held at `warn` by the horizon
and gating nothing, ever. The other half does not: with 54's own register authored **honestly**, `aof work
doctor 54` returns **10 `error`s, all `verification-missing-red-probe`** — the gate as first designed
would have halted 54's own loop from refine until its tenth control landed — and **the honest stream-wide
number is 26 errors across three open milestones**, because `verificationGroup` consults the `pending`
marker nowhere and `recordsARedProbe` tests shape, not content (§2d). Zero is the number you get when the
registers do not say what they mean.

**2b — The gate is scoped to the item under loop.** It invokes `work:doctor` with the driven item's own
scope, exactly as `commands/loop.mjs:558` already invokes `work:validate` with `{scope: act.ref}`, so
**a sibling's debt can never halt your loop** — verified: 54's errors appear only under `aof work doctor
54`, never in a scoped run of `69`, `70` or `69/00`. Without it, one register anywhere in `wiki/work`
would stop every loop in the repo.

**2c — The gate admits a NAMED, DERIVED subset of codes, and the principle is ORDERING.** The decisive
fact is neither severity nor `pending`: `verify.md:130-132` makes the red-probe register an artefact the
**verify phase itself authors**, and this gate sits at the entry to verify. **Gating entry to verify on
verify's own output is circular** — unsatisfiable for every milestone, forever, however honest its
register. So the gate never reads a finding about an artefact a later phase produces, and its admitted
set is **derived from 66's frozen array rather than restated**:

```js
// = CONTROL_FINDING_CODES minus its two verification-document members (verify's own output)
//   minus control-runner-unchecked (warn by construction). FIVE codes, each a fact about the
//   item's CODE. A ninth control code cannot silently join or leave the gate, because this is
//   a FILTER over the frozen eight rather than a copy of five.
GATE_DOCTOR_CODES = register-duplicate-id · register-dangling-citation · control-unresolved
                    · control-unregistered · staged-control
```

**Both required properties survive.** `66/ADR-002`'s horizon is **untouched** — `severityFor` is neither
modified nor re-derived, and every code keeps its severity on every other surface. The obligation is not
weakened but **moved**: from "before verify", where it could never be met, to "before accept", where it
always could — a `done` item is never driven by a loop, and the accepting item's own gate (`70/ADR-007`)
still reads the full error set, so a red probe is still demanded before acceptance and a `pending` marker
is still inadmissible at `done`. Re-measured: **0 of the 30 open items halt**, for a reason that survives
an honest register.

**2d — 69's and 70's substitute tokens ARE a defect, and it is not 54's to fix.** Sixteen controls across
two in-progress milestones report as probed when none has been observed, while `69/VERIFICATION.md:23`
asserts the opposite in prose — that register both lies and documents itself as honest. **A
placeholder-substitute is not legitimate**: it is a control green for the wrong reason in a record
document, the exact shape this milestone exists to catch, and 66 made `recordsARedProbe`
shape-not-content *deliberately*, which puts content honesty on the author rather than the checker. 54's
register stays honest. **Routed, not fixed here — no file under 69 or 70 is touched** (F-54-REFINE-2).
The root cause routes with it as a **66** defect: `verificationGroup` ignores the `pending` marker its
sibling leg honours, asking a control that has not landed for evidence of an event that cannot have
happened (`66/ADR-004` §3's missing half). **§2c stands whether or not it is ever fixed**, because the
circularity argument does not depend on `pending`.

**3 — Only `fail` re-drives; only `pass` advances; `indeterminate` HALTS — with one named
exception.**

| verdict | loop act |
|---|---|
| `pass` | cross to `drive verify` — the existing clean-gate path |
| `fail` | re-`drive continue` carrying the record, up to `cap`; at cap, the existing `cap-exhausted` |
| `indeterminate` | `halt grade-indeterminate` |
| `indeterminate` / `rubric-unconfigured` | **proceed exactly as today** — validate and doctor decide (ADR-002 §3, ADR-004 §4) |

That last row is the whole no-regression rule: a repo that never configured a runner meets no new refusal.
It is not "indeterminate read as pass" — **no path ever records a `pass`**; the record says `indeterminate`
while the loop behaves byte-for-byte as before.

**4 — ONE new stop id, in `53/ADR-005` §4's existing table form, with its producer.**

| stop id | produced by | source |
|---|---|---|
| `grade-indeterminate` | `work:grade` returned `verdict: "indeterminate"` with a code other than `rubric-unconfigured` | `src/work-grade.mjs` — `GRADE_CODES` (ADR-005 §3) |

The set stays **CLOSED** — `53/ADR-005`'s rejection of an open set is honoured, not weakened; it gains
one producer-backed member and `acd-loop-probe-contract`'s `STOPS` literal widens by **exactly one
line**, `53/ADR-014` §4's own idiom. **The cost to 62, 63 and 78 is named:** `stops` is returned in full
on every `LoopState`, so all three see a ninth member; none pattern-matches a stop string (that is
precisely why the set is closed), so the cost is an enumeration widening. `LOOP_REFUSALS` is untouched.

**Consequences.** `GATE_ORDER` grows from three rows to five and stays frozen; the fitness lane that has
never graded anything in the loop starts grading; and the cheapest thing that can say "this is wrong"
says it first.

---

## ADR-008 — The record rides the run the grade RE-DROVE; `LoopState` keeps its TEN keys; and 54 builds NO transport

**Status.** Accepted.

**Context.** RESEARCH §Q2 measured three separate places the loop drops its findings, and the
constraint that makes a naive fix illegal: `test/arch/acd-loop-probe-contract.test.mjs:13,41` asserts
`Object.keys(state)` **deep-equals** ten frozen keys, order included, and `actShape()`
(`commands/loop.mjs:64-71`) strips anything outside `["ref","phase","stop","producer"]` from `state.act`
— while **no test pins a `driven` row's key set** (re-measured at HEAD: every assertion on
`state.driven` is `deepEqual(driven, [])` or a `.map()` projection). `m20/ADR-001` (surfaced at recall)
rules against the opaque `brief` for *"resilience control fields the store READS and BRANCHES on"*; the
grade is not one — the run store never reads it, never branches on it, and gains no key — and
`53/ADR-004` already put a loop fact on that bag for this reason (`commands/loop.mjs:396` reads it back).

**Decision.**

1. **`LoopState`'s TOP-level key set stays TEN and `act`'s whitelist is untouched** — no eleventh key,
   no `findings` on `act`; 62, 63 and 78 renegotiate nothing.
2. **The grade rides the `driven` row that already exists per drive** — the one place in the frozen
   document that is per-drive, additive and pinned by nobody. `drivenRow()`
   (`commands/loop.mjs:337-346`) gains the verdict, the code list and the observed counts.
3. **The DURABLE record is `brief.grade` on the run the grade RE-DROVE**, written through the seam that
   already writes `brief.loop` — `transitionRunStart`'s `edge.brief`, at `commands/loop.mjs:304`, `:474`
   and `:521`. `run-transitions.mjs` and `run-store.mjs` are **not edited**: `68/ADR-009`'s rule (*the run
   fact goes through the transition seam*) and `53/ADR-004`'s "no new persistence code at all", both kept.
   The bag already carries sibling keys from independent producers (`brief.assignmentId` beside `brief.loop`).
4. **"Accumulated" means the union over the loop's own runs, keyed by `loopRunId`** — RESEARCH's one
   genuinely open question, ruled. `53/ADR-004` already says a loop's aggregate history *"is a query over
   run records rather than a single document"* and that `loopRunId` makes it *"a one-key filter"*; 54
   adds no store and no document, only a grade on that filter. The cap-exhausting cycle has no successor
   run to ride, so **the halt carries the final record itself** — the `driven` account plus the report line
   (`53/ADR-016`), and `loop.mjs:454-459`'s hardcoded `findings: []` becomes the SPEC's *"stop-and-flag"*.
5. **54 supplies the records. 70 carries them.** `70/04` owns the fix respawn *"carrying the findings as
   its message"*; `70/00` owns `drive.mjs`'s payload seam and `brief.context`. **54 builds no second
   transport**, widens no driver input schema, and coins no third meaning for `brief`.

**Consequences.** The grade is visible on the board with zero board change (ADR-003 §4), survives a
machine-off, and is queryable per loop with the key 53 already minted. Cost named: a grade computed on
a cycle that never re-drives lives in the loop's report and `driven` account rather than on a run
record — correct, because there is no run for it to belong to.

---

## ADR-009 — The lines 54 does not cross

**Status.** Accepted.

1. **The cap's VALUE is 69's.** `53/ADR-009` §1, unchanged. 54 enforces a bound — the gate-retry cap
   and the runner deadline — and chooses neither. Both resolve through `69/ADR-001`'s single home.
2. **The PROSE is 71's.** `continue.md`, `verify.md`, the "validate before review" wording and the
   review-round cap are 71's. **54 is the runtime half — the gate between phases; 71 makes the
   prompts agree with it.** No story here edits `src/bundle/commands/**`, and a reviewer can refuse a
   prompt-layer edit on that sentence alone.
3. **The TRANSPORT is 70's.** ADR-008 §5. No second payload, no widened driver input schema.
4. **The DOCUMENT is 78's.** 54's "record" is the grader's accumulated feedback on the run records
   (ADR-008), not a viewable, signed artefact. 78 reads `brief.loop` from 53 and nothing 54 produces
   — `54/SPEC.md:61-64` and 78's SPEC already agree.
5. **Whether the rubric is HONEST is 57's** — "did the scenario move to fit the code" is the
   counter-metric question; 54 tightens the loop around the rubric it is given. **Auditing the gates
   themselves is 59's**, and `@uat` is unchanged — a human gate still halts.
6. **No second feature parser and no second scope parser** — `src/feature-parse.mjs` is the one
   (`66/ADR-003`), TECH_DEBT item 49's three are not merged here, and 54 adds no fourth. And
   **`src/work.mjs` is edited ZERO times**: 52, 53 and 54 all achieve zero.

**Consequences.** Five adjacent milestones can be contracted against this document without reading
54's code. The cost named: 54's grade is only as good as the rubric QA wrote, and it will faithfully
report a green suite that tests the wrong thing — 57's subject, and saying so is the point.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI. The
     arch-test lands with its subject story, so `pending` clears story by story; it reports at warn
     while 54 is open and is NOT admitted at accept (`aof work doctor 54` reports each unresolved
     control as `control-unresolved`). Each declared control also owes a RED PROBE in VERIFICATION.md
     once it lands — what was changed to make it fail, and the message observed; per ADR-007 §2d a
     substitute token in that cell is a control green for the wrong reason, not a filled row.
     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     imported AND spread in the suite registry inside its own labelled story block (TECH_DEBT item 50: the
     registration guard cannot see an imported-but-never-spread suite, so the spread is checked by eye at
     review). TWO OF THE TEN EXTEND A GUARD ALREADY IN SERVICE (FF-5407, FF-5409) — the file named already
     passes, so for those two the red probe is the ONLY evidence the extension is armed. Observable
     behaviour over the real seam is task `.feature` material, never a row here. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-5401 | **aof never becomes the test runner.** No module in `src/**` imports `scripts/test.mjs`, `scripts/test-unit.mjs` or any module under `test/**`, and none performs a dynamic `import()` of a project test file; the only route from `src/**` to a suite is the declared argv of ADR-004, in a child process. | `test/arch/acd-grade-never-imports-the-suite.test.mjs` — **landed (54/01)** | ADR-002 |
| FF-5402 | **Green is positive evidence, never an exit code.** No path in `src/**` yields `verdict: "pass"` without a parsed report, and the evidence measured against the floor is the cases that **RAN** — `total - skipped > 0` and `>= floor` (ADR-005 §2(c) **as amended**; a report of nothing but skips can never pass, with or without configuration). The exit status is checked before the report is read; `GRADE_VERDICTS` is a frozen exported triple. | `test/arch/acd-grade-green-needs-evidence.test.mjs` — **landed (54/00)** | ADR-005 |
| FF-5403 | **The grade record is a frozen, producer-backed, non-vacuous contract.** `GRADE_CODES` is frozen and set-equal to the nine of ADR-005 §3; every one of the nine is reachable by a fixture; the record's key set is exact; and the two advisory codes never move the verdict. | `test/arch/acd-grade-record-envelope.test.mjs` — **landed (54/00)** | ADR-005, ADR-006 |
| FF-5404 | **The GRADE LEG is additive** — this proves the grade leg only, never that the gate is unchanged (the doctor leg changes it; FF-5410). Over a fixture with no `work.rubric`, the grade contributes no gate act: it reports `rubric-unconfigured` at `indeterminate`, and no code path maps that code to `pass` or to a halt. | `test/arch/acd-grade-unconfigured-is-additive.test.mjs` — **landed (54/01)** | ADR-002, ADR-004, ADR-007 |
| FF-5405 | **The read face never executes, and a grade never re-enters itself.** `work:grade`'s registered `run()` spawns nothing unless `run === true`; `work:grade` is a documented `BOARD_DEFERRED` member and no `/api/work/grade` route exists; the spawn sets the re-entrancy stamp and an already-stamped environment is refused. | `test/arch/acd-grade-read-face-never-executes.test.mjs` — **landed (54/01)** | ADR-003 |
| FF-5406 | **The compiler is a pure leaf and the spawn is bounded in one place.** `src/work-grade.mjs` imports nothing from `src/`, no `node:child_process`, no `node:fs` and reads no clock; exactly one module in `src/**` spawns the declared rubric argv; that spawn passes no shell, closes stdin, and carries a resolved deadline with a kill signal. | `test/arch/acd-grade-bounded-single-spawn.test.mjs` — **landed (54/01)** | ADR-003, ADR-005 |
| FF-5407 | **The deterministic engines stay pure and gain no runner.** `src/work.mjs`'s `validateWork` and the `work-doctor*` family perform no spawn and no dynamic `import()`; the controls lane's forbidden-import set is **EXTENDED** to name `src/work-grade.mjs` and `src/commands/grade.mjs`, so the lane can never acquire a runner by a later accident. | `test/arch/acd-controls-never-execute.test.mjs` *(extended)* — **landed (54/01, family scope corrected at 54/04)** | ADR-001, ADR-006 |
| FF-5408 | **The subject is emitted, never inferred.** No module in `src/**` derives a case identity, a status or a scenario identity from a runner's free text: identity comes from the parsed report's own fields, and the scenario pairing is a name containment over parsed `.feature` scenarios with an `unjoined` result reported rather than guessed. The loop shell's existing no-prose-match property holds over the grade path. | `test/arch/acd-grade-subject-is-emitted.test.mjs` — **landed (54/04)** | ADR-006 |
| FF-5409 | **The stop set stays closed and the gate order stays frozen.** ~~`LOOP_STOPS` is exactly nine, frozen~~ (**amended below, 2026-08-23**) — `LOOP_STOPS` is frozen and unextendable, carries `grade-indeterminate` as a declared member, and is reported in full and verbatim on a `LoopState` that really halted on it; the count is deliberately not restated (it was nine at refine and is twelve today; 69 added three), and exact membership is pinned in the same file by `53/FF-5304`'s sibling entry (the `STOPS` literal at `acd-loop-probe-contract.test.mjs:17`). `grade-indeterminate` carries a producer drawn from a `GRADE_CODES` member and never from a message match; `GATE_ORDER` is exactly the five frozen rows of ADR-007 §1, naming `work:validate`, `work:doctor` and `work:grade` in that order; `LOOP_REFUSALS` and `LoopState`'s ten top-level keys are unchanged. | `test/arch/acd-loop-probe-contract.test.mjs` *(extended)* — **both clauses landed: GATE_ORDER (54/02), `grade-indeterminate` (54/03)** | ADR-007, ADR-008 |
| FF-5410 | **The doctor gate's admitted scope, severity and CODE SET are exactly the ruled ones.** It is invoked with the driven item's own scope and never stream-wide; it admits `severity === "error"` only; it never reads `loopReady`; and its admitted codes are **derived by filter from `CONTROL_FINDING_CODES`**, never restated as a literal — so neither `verification-*` code can enter the gate and a ninth control code cannot silently join it. `severityFor` is neither re-derived nor modified. | `test/arch/acd-doctor-gate-scope-and-severity.test.mjs` — **landed (54/02)** | ADR-007 |

**Amended:** 2026-08-23, at 54's verify (finding **D6**) — **FF-5409's STOP-SET clause is superseded.
The struck wording in the row above is left in place.** *"`LOOP_STOPS` is exactly nine, frozen"* was a
correct measurement when this register was written at refine and is false now: measured at
`src/work-loop.mjs:21-34`, `LOOP_STOPS` holds **twelve** — the pre-54 eight, `grade-indeterminate`
(54's one), and `deadline-exhausted` / `progress-exhausted` / `no-progress`, which milestone 69 added
between 54's refine and this accept. **The replacement states no count**, because a figure a declaration
quotes from a live vocabulary is a MEASUREMENT with a shelf life — cite it so the control can re-take it,
never so the control has to be told the answer (this milestone's own standing rule, recorded twice in
STATE.md's `## Feedback`). It also states **only what the named arch-test enforces**: membership,
frozenness, and the set reported in full on a `LoopState` that really halted on this stop. The stronger
property — *54 contributes exactly one member, and the pre-54 eight are unrenamed* — is asserted by
54/03's contract test (`test/loop-only-fail-redrives.test.mjs:365-384`), **not** by this control, so the
register does not claim it. **Also at this amendment:** the `landed` cell now records both clauses as
landed — `GATE_ORDER` at 54/02, the `grade-indeterminate` clause at 54/03, red-probed twice (see
VERIFICATION.md).

## Story partition

Drawn from § Grounding's `graph impact` measurements, not from the SPEC's bullet order. Its defining
property: **no two stories edit the same file**, with the three declared exceptions below.

| Story | Subject | Graph rationale | Depends |
|---|---|---|---|
| **54/00** `the-grade-record` | The frozen vocabularies, the verdict rules and the evidence floor — with no command and no loop | New pure leaf `src/work-grade.mjs` (**0 deps, 0 dependents on arrival**), the shape `70/ADR-002` and `68`'s `otel-attribution.mjs` both prove. Touches nothing another story touches. | — |
| **54/01** `the-declared-rubric` | The rubric declared, spawned safely once, and reported | New `src/commands/grade.mjs` + the ONE registration in `src/command-core.mjs` (**116 dependents** — the hub, so **this is the only story in the milestone that registers**) + the five registry-derived gates of ADR-003. | 54/00 |
| **54/02** `fitness-in-the-gate` | The SPEC's missing half — the fitness lane grades before a review turn | `src/work-loop.mjs` (**0 deps, 1 src dependent**) for `GATE_ORDER`, and `commands/loop.mjs`'s gate block to invoke `work:doctor`. Needs no runner, so it is blocked on nothing. | — |
| **54/03** `feedback-rides-the-redrive` | The findings stop being dropped, and cap-exhaustion carries the record | `work-loop.mjs`'s gate branch (`:258-274`, already computing the right decision), `commands/loop.mjs`'s bare `continue` (`:576`), `drivenRow` (`:337`) and the three `brief:` call sites. Writes **no** persistence code: `run-transitions.mjs` (17 dependents) and `run-store.mjs` (46) are passed through, not edited. | 54/01, 54/02 |
| **54/04** `scenario-traceability` | The join `validate` has announced since m15, filled outside the god-node | New lane leaf `src/work-doctor-rubric.mjs` — `work-doctor-freshness.mjs`'s shape (**1 dep, 1 dependent**) — plus one `CHECK_GROUPS` entry and one snapshot field in `src/work-doctor.mjs` (17 dependents, edited at that seam only). Reads `feature-parse.mjs` (**0 deps**) and edits it not at all. | — |

**Sequencing.** 54/00, 54/02 and 54/04 started together — three disjoint seams (a new pure leaf; the
gate order; a new doctor lane), none reading another's code, and 54/04 consumes ADR-004's
`work.rubric.report` shape as a **contract, not as code**, which is what let it start early. 54/01
followed 54/00, and 54/03 followed 54/01 and 54/02, threading 54/01's record through the gate 54/02
reorders: 3-wide, then 1, then 1.

**The three declared exceptions to "no two stories edit the same file"** — STATE records what this repo
already paid for two stories partitioned as independent editing one file. **(1)** 54/02 and 54/03 both
edit `src/commands/loop.mjs`'s continue-gate block (`:557-597`) — 02 inserts the doctor gate, 03 makes
the gate's record reach the re-drive; sequenced, not concurrent, so 54/03 rebases onto 54/02 by
construction. **(2)** 54/03 and milestone 70/04 both edit `src/commands/loop.mjs` — 70/04's code LANDED
first on this branch (`54ff074`), so the rule binds 54/03, which **rebases onto it**: 70 owns the payload
seam, **54 supplies the findings; 70 carries them**. **(3)** A dependency, not a collision: ADR-005 §5
resolves the runner deadline through `69/ADR-001`'s home `src/loop-bounds.mjs`, not yet on disk at refine
— 54/01 creates that leaf at 69's declared path, key and value and 69/00 extends it, opening **no** rival
bound home (`69/ADR-001`'s non-annexation rule and `acd-loop-cap-single-home` remain the authority).

**What no story owns, deliberately.** ADR-009's lines, and in particular: no story edits
`src/bundle/commands/**` (71's), `src/work.mjs` (zero, by design), `src/run-store.mjs`,
`src/effects/run-transitions.mjs`, `src/board-ui.mjs`, `ui/`, `src/work-doctor-controls.mjs` (66's lane —
the SHAPE is copied, the file is not), either runner script's existing registrations, or any existing
`test/loop-command-*.test.mjs` suite — that last being the no-regression evidence of ADR-002 §3.

## Codebase health — measured at HEAD, on the tree this milestone lands in

- **`src/` is 126 flat root `.mjs` siblings; `src/commands/` is 85.** This milestone adds **two** root
  siblings (`work-grade.mjs`, `work-doctor-rubric.mjs`) and **one** command; concurrently 70 adds one and
  69 adds two, taking the flat root to ~130 in one release window. Already ledgered as **`TECH_DEBT.md`
  item 10** ("`src/` has no interior structure"), whose trend table last recorded **106** root modules
  and whose proposed fix is *"a fitness function on root-level file count so the N+1th sibling fails
  CI"* — **+19% since that record and nothing noticed**. A `src/` regrouping does not fit here: **routed
  to the existing entry**, with the fresh number for scheduling.
- **The two new modules are leaves, not accretion into a god-file** — each 0–1 dependencies and 1
  dependent, neither adding a line to `src/work.mjs` (1,339 lines, 256 dependents) or `src/run-store.mjs`.
  This milestone discharges the announced hole at `src/commands/validate.mjs:57` **outside** the god-node
  and writes no second parser, store, bound home or transport.
- **One recurring shape gets a ratchet.** "Green for the wrong reason" is now the **fourth** measured
  instance here — 66's 4-of-5 audit, `m46/ADR-006`'s vacuous sweep, today's `node --test` run, and
  ADR-007 §2d's sixteen unprobed controls reading as probed. FF-5402 and FF-5410 are the ratchets.
