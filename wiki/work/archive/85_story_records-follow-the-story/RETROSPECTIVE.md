---
doc: retrospective
item: 85
created: 2026-09-04
updated: 2026-09-04
---
# 85 · Retrospective

Distilled at the accept gate from the four findings review round 1 promoted (chores `105`–`107`, and
the two arch controls it found already red), from the two the gate itself raised (`VERIFICATION.md`
D-01, D-02), and from the one design question the story carried unanswered out of refine. No
`observability/` lesson beyond R5: `aof work observe 85` matched **0 agent runs across 0 sessions**
and **0 run records**, against **418 unattributed agent runs** on this machine.

This is the first story to carry a retrospective in its own folder under its own delivered rule.
Measured immediately before it was written: **275 of 283** done stories carried none, and
`RETROSPECTIVE.md` appeared **57** times at driver level and **zero** times under `stories/`.

## R1 · A contract test that pins a filename has encoded a proxy for the rule, not the rule

**Kind:** mistake · **Area:** architecture · **Stage:** refine (of the *earlier* story that wrote the
rule) · **Owner:** architect · **Raised by:** this story's premise.

**What happened.** `39/ADR-004` exists to stop a subagent with `Write` from clobbering record
documents and fabricating decisions. The template says exactly that in its own header. But
`test/verify-outcome-per-type.test.mjs` implemented it as a scan asserting the offender list is empty
*apart from `verify.md`* — a filename. When `aof:assimilate-code` needed to author an outcome, the
test reddened, and the change looked like a repeal of a safety rule rather than what it was.

**Why.** At the time the rule was written there was exactly one accepting command, so "the accepting
command" and "`verify.md`" were the same set and the cheaper spelling was chosen. The two statements
only diverge when a second member appears — which is precisely when the pin is load-bearing and
precisely when nobody can tell from the test whether the divergence is a violation or a growth. The
threat model names a **role** (subagent, has `Write`); the test named an **instance**.

**Lesson.** When a control's intent is a role and its implementation is a name, the name will
eventually block a legitimate member of the role, and the author who hits it cannot distinguish "I am
violating this" from "this was always too narrow" without re-deriving the threat model. Encode the
role: the fix here derives the admitted set from *which prompts accept an item* and asserts the
complement (**no agent prompt** carries the instruction) as a separate, independently-failing
assertion — so the subagent refusal cannot be loosened by anything that widens the command side.

**Countermeasure that is not just "write better tests".** The reconciliation shipped with a
**non-vacuity assertion**: the scan asserts the accepting set is exactly `verify` + `assimilate-code`
and that **both match the rule the others must not**. Without it, a future edit that broke the
matcher would turn the whole control green and silent — the same failure the pinned filename had,
one level up.

**Refs:** `tasks/00`, scenario "the one-writer contract admits the govern commands and still refuses
every subagent"; `test/verify-outcome-per-type.test.mjs`;
`src/bundle/templates/shared/OUTCOME.md` (header, now naming both doors).

## R2 · A write set declared at build is a log of what was done, and cannot contain what is still owed

**Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** product-owner ·
**Raised by:** this gate (`D-02`), self-reported in `STORY.md` `## Notes`.

**What happened.** `files:` was deliberately left empty at scaffold because `tasks/01`'s
doctor-vs-validate question was unsettled and the write set genuinely depended on the answer. The item
then went **straight from scaffold to `aof:continue`**, skipping the refine gate that would have
settled it, so `files:` was written during the build — from what had already been edited.

**Why this was not a harmless bookkeeping slip.** D-01 is its direct cost, and the mechanism is
mechanical. Three bundle command prompts were edited. The build ran a render partway through, which
rewrote `retrospective.md` across three runtimes. Those three rendered paths **were** in the
build-time `files:` list, because they existed by then. The renders for `verify.md` and
`assimilate-code.md` had not been run, so their six rendered paths were not — and the build finished
without them. A list derived from "what I have written" is structurally incapable of naming "what I
still owe"; only a forecast made *before* writing has that property.

**Lesson.** Deferring `files:` because an open design question genuinely blocks it is correct. Filling
it from the diff afterwards is not the same thing, and it silently converts a forecast into a
changelog. When refine is skipped, the write set must be declared from the *design*, at the first
moment the design is known, and before the first edit — otherwise the one class of omission it exists
to catch is exactly the class it cannot catch.

**Refs:** `VERIFICATION.md` D-01 and D-02; `STORY.md` `## Notes`; chore `108`.

## R3 · The lane a new check lands in is decided by the size of the backlog, not by how structural the rule feels

**Kind:** confirmed approach · **Area:** architecture · **Stage:** build · **Owner:** developer ·
**Raised by:** `tasks/01`, which shipped the question open on purpose.

**What happened.** `tasks/01` refused to choose between `doctor` (advisory) and `validate`
(structural) in its own text, and instead named the measurement that would decide it. Re-measured at
build over this stream: **199 of 283** done stories carried no `OUTCOME.md` and **275** carried no
`RETROSPECTIVE.md`. A `validate` finding would have reddened the whole stream at once — taking down
every gate that runs validate, **including the loop's first rung**. It landed in `doctor`, at `warn`,
and reported 278 findings on its first real run without blocking anything.

**Why this is a confirmed approach rather than a compromise.** "This rule is important, therefore its
check should be structural" is the intuition, and it is wrong in a way that is only visible from the
backlog count. The rule's importance sets whether the check exists; the backlog sets whether it can be
a gate *today*. Conflating them is how a check that could land now waits for a migration nobody has
started — the feature's own text says so, and the story then held the line by keeping the backfill
explicitly out of scope.

**Lesson.** For any new rule with pre-existing violations, decide the lane by measuring the
violations first, and ship the reporting and the fixing as separate pieces of work. Record the
measurement in the artifact, because the number is what licenses a later promotion from `warn` to
`error` — and that promotion becomes safe exactly when the count reaches zero, which is now an
observable condition rather than a judgement call.

**Refs:** `tasks/01` preamble; `src/work-doctor-coherence.mjs:355-399`; `STORY.md` `## Notes`
("Where it landed"); `VERIFICATION.md` § "Live probe" (278 findings, all `warn`, disjoint from
`CONTROL_FINDING_CODES`).

## R4 · A ratchet honoured on trust is a ratchet whose control nobody checked, and this one had already been passed twice

**Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect ·
**Raised by:** review round 1 (`D-04` → chore `106`).

**What happened.** The story first wrote a new `src/work-doctor-records.mjs`, then **withdrew it** —
correctly — because `66/ARCHITECTURE.md` carries a ratchet ("doctor's lane modules go 4 → 5; the
SIXTH folds the family into `src/work-doctor/`") and because the sibling would have re-spelled
`lifecycleCompletenessGroup`'s own `cacheDegraded()` predicate. The check landed inside the existing
group instead. Review then found that `FF-5905`, the control that *enforces* the ratchet, was **red on
a clean tree**: the list had already been passed twice unfolded, most recently by `78/03`'s
`work-doctor-loop-record.mjs`.

**Why it is a near-miss and not a win.** The author reached the right answer by reading the ADR and
believing it. Had they instead run the control to check whether they were allowed, they would have
found it already failing — and a failing control gives the next author no signal at all, in either
direction. The good outcome here was produced by diligence, not by the mechanism the ratchet exists to
be.

**Lesson.** A ratchet is a promise that a control is watching. Before honouring one at cost — here,
withdrawing written code — run the control, because a red control means the ratchet is currently
decorative and the real question ("fold the family, or supersede the ratchet?") is already overdue.
Re-marking a gate is not the same as answering it.

**Refs:** `STORY.md` `## Notes` (the withdrawn sibling); chore `106`;
`test/arch/acd-controls-never-execute.test.mjs:95`; `66/ARCHITECTURE.md`.

## R5 · This story produced no observability record, and the pipeline — not the story — is the finding

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** the observability lane ·
**Raised by:** the retro step.

**What happened.** `aof work observe 85` matched **0 agent runs across 0 sessions** and **0 run
records**, while reporting **418 unattributed agent runs** on this machine. Story `81`'s retrospective
recorded the same shape one day earlier (R5 there), from the same node.

**Why it matters more the second time.** One empty snapshot is an anomaly; two consecutive ones from
the same node, with 418 sessions sitting unattributed, is a join that is not landing. The build cost
of both stories — where the time went, whether an agent stalled — is unrecoverable, which is precisely
the evidence the hill-climbing loop is supposed to run on.

**Lesson.** Treat an empty observability snapshot as a finding about the pipeline, not as an absence
of work. The signal to watch is the **unattributed** count: 418 runs that matched no run record is not
"no data", it is data that failed to join, and those are different bugs with different fixes.

**Refs:** `81/RETROSPECTIVE.md` R5; `aof work observe 85`;
`aof-work-observe-transcript-observability` (memory).
