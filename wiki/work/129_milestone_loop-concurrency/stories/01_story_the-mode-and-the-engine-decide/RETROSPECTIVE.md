---
type: story
doc: retrospective
number: 01
parent: 129
slug: the-mode-and-the-engine-decide
title: "Retrospective — the mode and the engine decide"
created: 2026-09-13
updated: 2026-09-13
---
# 129/01 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run itself was
clean — one review round, no Blocker, no stall (`observability/snapshots/2026-09-13T01-03-03-701Z/report.md`:
4 agents, 45 min real active time, 0 stalls) — so every entry here is a near-miss or a shape lesson,
not a failure.

## R1 — A pure decider handed a "memory" must be built to the caller's real type, not to the Examples' literal

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** craft reviewer (code-reviewer)

**What happened.** `decideWave` read a `Set`-typed `live` / `setAside` as empty. Every row of task
03's Examples spelled the memories as array literals, so the developer built to the fixture shape;
`src/commands/loop.mjs` keeps its set-aside as `new Set()`, and the first real caller would have
re-offered every set-aside unit on every tick — the "infinite loop dressed as progress" 124/ADR-005
§5 names. Caught in the craft pass, fixed at the review close with eight rows added.

**Why.** A `.feature` can spell a value but not a runtime TYPE, and the shell that owns the memory
was in `reads:` as a file, not as a call site. The contract's Examples were read as the input's
whole shape.

**Lesson.** When a pure decision takes a value a SHELL already holds, the build reads that value's
type at the shell's call site first and the Examples carry one row in that shape — or the contract
names the type in prose ("an array or a `Set`"). QA's case matrix should ask "who produces this
input, and as what?" for every input that is not a `work:next` answer. Refs: `F-01`.

## R2 — When a scenario must land in an existing suite, the suite that owns the FIXTURE WRITER is the home, not the one nearest the code

- **Kind:** mistake · **Area:** contract · **Stage:** refine/build · **Owner:** QA / developer · **Raised by:** architect

**What happened.** `test/loop/` is at its budget ceiling, so task 00's loader-admission scenario had
to ride an existing suite. It was placed in `loop-record-projection.test.mjs` (nearest the projection
under test) and built as a second hand-rolled registry writer; `work-loops-resolved-ceilings.test.mjs`
already owned the loader's `grammarRows` table. Moved at the review close; the home gained an R8
parse guard on every row.

**Why.** "Extend a registered suite" was decided by subject proximity. The cost of a duplicated
fixture writer (`extend-existing-surfaces`) is invisible from the `.feature`, which names the
behaviour and not the harness.

**Lesson.** A budget-forced placement is chosen by asking which suite already holds the fixture
writer / registry builder the scenario needs; the STORY Notes should name the host suite per task
when the directory is at ceiling (this story named it only for `decideWave`). Refs: `F-02`,
`STATE.md` "Default decisions taken at refine" (`test/loop/` 72/72).

## R3 — An ADR that names a projected state must cite the projection's own enumeration

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** all three review lenses

**What happened.** ADR-001 §1 said a loop record citing the mode as a `ceiling:` "reads `unknown`".
`ceilingOf` (78/ADR-004) reserves `unknown` for a record that DECLARES it; a declared pointer the
projection cannot number is `bounded` / `bound: null` / `comparison: null`, as a `module:` pointer
already projects. The contract beat caught it and task 00 locked the right shape; the ADR carried
the wrong word until the review close amended it, dated.

**Why.** The ADR was written against the word the operator would expect to read, not against the
state machine the projection already had. The rulings paragraph in STATE.md recorded the departure,
but a ruling in STATE does not edit the ADR a later reader opens first.

**Lesson.** When an ADR states what a record "reads" or "projects", it cites the enumeration
(`state:` members) of the projection it targets, and a contract-beat ruling that contradicts an ADR
sentence is written INTO the ADR as a dated amendment at the beat, not deferred to the review close.
Refs: `F-03`, ADR-001 §1 (amended 2026-09-13).

## R4 — An engine act the shell does not yet honour is a deliberate, dated interim — and it needs an operational rule, not only a note

- **Kind:** near-miss · **Area:** process · **Stage:** build/verify · **Owner:** orchestrator / product-owner · **Raised by:** all three review lenses

**What happened.** The engine now answers a fresh `gate` act for any `in-review` story with tasks
(ADR-001 §4), and the shell's handler for a fresh `gate` is story 04's. From this diff until 04
lands, ANY `aof work loop` — `sequential` included — whose head is such a story halts
`unmapped-item-type` / `unexpected-engine-act` instead of re-driving `continue`. The STORY Notes
declared the interim; the review made it explicit that the 127 soak must not run in between.

**Why.** The story boundary split a pure leaf (01) from its shell (04) so the first wave could run
concurrently — the milestone's own thesis — and the price of that split is a window in which the
engine is ahead of the shell. Fail-loud is the right failure (a halt, never a burned session), but
it is still an outage of the loop for one head shape.

**Lesson.** When a pure-engine story changes an act the shell must honour, the acceptance records
an OPERATIONAL RULE for the window (here: no loop over a stream holding an `in-review` story until
04 lands), named in `VERIFICATION.md` and in the milestone `STATE.md`, and the successor story's
first task is the shell's admission of the act. Refs: `F-08`, `STORY.md` Notes (interim),
ADR-008 §3.

## R5 — A structural invariant goes to the register; a task scenario cites the control rather than restating it

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** QA / architect (Three Amigos) · **Raised by:** architect

**What happened.** Task 01 carried "the engine imports nothing" as an acceptance scenario. The
claim already lives in `work-loop-determinism`'s copied-alone leg and is FF-12902's family boundary
once 05 lands; the scenario's `Then` reads the source text, which is the litmus's definition of a
design assertion. Its regex also admitted a dynamic `import()`, which the strong home never did.

**Why.** The ADR's consequence sentence ("the engine stays a pure leaf: `src/work/loop.mjs`
imports nothing") was carried into the feature verbatim as a reassurance, and a reassurance in a
`.feature` becomes a second, weaker copy of a control.

**Lesson.** At the contract beat, a `Then` that reads source text is moved to the register (or
cited by `FF-NN`), never locked as a scenario; the feature stays behavioural. Refs: `F-11`, `F-05`.

## R6 — A pure-leaf module that keeps accreting deciders needs a ratchet or a split before it is the next god-node

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** architect (structural review)

**What happened.** `src/work/loop.mjs` crossed 1,500 lines with this story (1,578; 51 inbound
edges) with no budget row and no ledger entry, and 04/05 add to it. The review/finding-routing
block (`:170-380`) shares nothing with the phase map it sits beside.

**Why.** "Pure decisions go to `src/work/loop.mjs`" (ADR-008 §1) is a routing rule with no size
term, and every milestone since 53 has added a decider to the one leaf because it is the one leaf.

**Lesson.** A subject-family split of the leaf (phase map / review routing / supervision) or a
shrink-only size ratchet is story-sized and belongs in the next loop milestone's partition; until
then each story that grows the file records the delta in its review. Refs: `F-10`,
`ARCHITECTURE.md` § Codebase health.
