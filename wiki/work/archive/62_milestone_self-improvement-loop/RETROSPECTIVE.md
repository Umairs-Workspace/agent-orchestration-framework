---
doc: retrospective
---
<!--
  Milestone RETROSPECTIVE.md — answers ONE question: what did HOW we executed teach us? Owner:
  aof:retrospective, called at the close by aof:verify. One R<n> per lesson, APPEND-only, never
  renumbered. References the evidence; never restates it — the findings live in VERIFICATION.md,
  the decisions in ARCHITECTURE.md, the blow-by-blow in STATE.md.
-->
# 62 · The self-improvement loop — Retrospective

Six stories, two stages, nine declared controls, **eight findings at the acceptance gate — six of them
defects in this milestone's own controls rather than in its product code.** The product half went
green and stayed green: `aof work tune` emits 63 evidenced proposals over the real corpus, and no
finding at this gate touched the proposals, the lanes, the distances or the provenance resolution.
What the gate found was that four of the nine assertions guarding that code were describing a tree
that no longer existed, a claim they never made, or a corpus that had stopped growing.

That is the thread, and it is worth stating once before the entries repeat it in five costumes: **this
milestone's subject and its execution kept meeting.** A milestone built to stop the harness believing
an unmeasured number spent its whole acceptance gate discovering numbers it had itself asserted and
never re-measured. 61 recorded the same collision from the other side. Twice is a pattern; the
countermeasures below are the third instance of it, which is what makes them ratchets rather than
fixes.

---

## R1 — A widening in one story is green in its own lane and red in a sibling's, and only the milestone gate looks

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** orchestrator · **Raised by:** `aof:verify`'s gate

**What happened.** One commit — 62/04's `9898750b` — produced two of the gate's four opening blockers.
It gave each lesson record a `citations` array and gave `src/work-loops.mjs` a twelfth export. Both
were correct, both were needed, both were green in 62/04's own lane. The first turned 62/05's control
red (`VERIFICATION.md` D-01); the second turned milestone 52's loader census red (D-02). Neither was
visible until the whole suite ran at the gate.

**Why.** `aof:verify` scopes a story's run to that story's own scenarios on purpose, and the honest
cost of that choice is written into the command: a poisoning story is caught at the gate, not
immediately. That is the trade working, not failing. What made it cost two blockers rather than one
was the *kind* of change: 62/04 widened a **shared record's shape** and a **module's export surface**,
and both are read by parties outside the story that changed them. A widening of a private function
cannot do this; a widening of a shape or a surface almost always can.

**Lesson.** The scoped story run stays. What is worth adding is a cheap discriminator at the point of
the edit: **a change that widens a record's shape or a module's export surface owes a sweep of that
thing's readers before the story is called done** — `grep` for the export, and for who consumes the
record — because that is precisely the class the story's own lane is structurally unable to see.
Neither sweep here would have taken a minute, and each would have moved a blocker out of the gate.

---

## R2 — A declared invariant with no assertion is a clause whose green means nothing, and only the red probe compares the two

- **Kind:** mistake · **Area:** delivery
- **Stage:** verify · **Owner:** architect · **Raised by:** FF-6209's own red probe

**What happened.** `ARCHITECTURE.md`'s FF-6209 declares that formation's tie-break is "a function of
CONTENT, never of ARRIVAL … and a shuffled input yields byte-identical candidates" (ADR-014 §5). The
shipped control never shuffled anything. The clause had no leg. Six legs passed and one sixth of the
declaration was unguarded, and nothing in `validate`, `doctor` or the suite could say so — a control
file is checked for existing and for passing, never for asserting what its register says it asserts.

**Why it survived to the gate.** The register and the test file are written by different passes and
compared by nobody. The declaration reads as prose; the test reads as code; both were reviewed, and
review reads each against its own purpose rather than against the other. It is the shape this
repository keeps re-finding: two documents agreeing about a fact that neither checks.

**How it was actually found — and this is the part worth carrying.** By the **red probe**. Breaking the
tie-break to read arrival position turned exactly one leg red, and the wrong one: the real-corpus
*tradeoff* leg, red only because the measured table happened to shift. Had this repository's clusters
been insensitive to that ordering, an arrival-reading tie-break would have passed the entire control
with nine green legs. The probe is the only step in the whole pipeline that asks a control to
demonstrate it can fail *for the stated reason*.

**Lesson.** **A red probe that lands on a different leg than the declaration predicts is a finding
about the control, not a curiosity about the probe.** It is the one signal that separates "this
assertion holds" from "this assertion exists". Two corollaries the register now records: a probe is
owed per *declared clause* where the clauses are separable, and the probe's expected leg should be
named before it is run, so landing elsewhere is loud.

---

## R3 — A control that stores a figure over a corpus this repository itself writes is set to fail on its own accept commit

- **Kind:** mistake · **Area:** delivery
- **Stage:** verify · **Owner:** developer · **Raised by:** `aof:verify`'s gate (D-08)

**What happened.** FF-6209's basis leg asserted the live measurement byte-equal to a four-row stored
table and the live record count equal to a stored 402. The corpus it measures is **the retrospectives
of this repository** — including this document. Writing it changes the lessons lane. The control was
therefore armed to fail on the commit that accepted the milestone, and would have failed on the next
retrospective in any case.

**Why, and the part that makes it a lesson rather than an oversight.** The milestone already knew the
rule and had already written it down. FF-6208's declaration says, in the same register: *"it runs over
the corpus as it stands and holds no expected figure: a stored count would go stale on the next
retrospective, which is the corpus this milestone reads."* Two controls over one corpus, one stating
the rule and the other breaking it, both authored inside the same milestone, both reviewed.

**The re-measurement was itself informative.** The record COUNT was unmoved at 402 while every row of
the table moved — because 62/04 changed the record *shape*, and `citations`/`target` feed
`stableValue`, which feeds the tie-break, which moves cluster boundaries. A stored figure hides
exactly that: the number a reviewer would check for staleness was the number that had not changed.

**Lesson.** Over a corpus the repository writes, **assert the DECISION, never the numbers**: recompute
the relations that justify the choice (does 3 still collapse the loose cluster, retain recurring
classes, avoid the tightest setting's fragmentation) and keep the measured table beside them as dated
provenance. A stored figure is admissible only over an input the repository does not author. And when
one control in a register states a rule, that rule is a review question for every other control in the
same register.

---

## R4 — A "single home" fix has readers of its own, and the tidier sweep broke a second control

- **Kind:** near-miss · **Area:** delivery
- **Stage:** verify · **Owner:** product-owner · **Raised by:** the fix's own full-lane run

**What happened.** D-04 was a second home for the frozen status vocabulary: `src/work.mjs` gained
`"in-review"` and so carried all five words, which is what 66/FF-6602's leg (b) fires on. The obvious
fix was the tidy one — destructure the five out of `VALID_STATUS` and de-literalise every site, exactly
as `src/import/recovery.mjs` had already done. It made FF-6602 green and turned
`arch/status-rollback-bounded` red: that control reads `ROLLBACK_TARGETS` **as source text** and
requires a literal `Set`.

**Why the tidy fix was wrong.** The two controls are not in conflict — FF-6602 bans the *complete*
vocabulary, not each word — so the file was always allowed four literals and had always carried them.
The breach was one word. The sweep answered a question nobody had asked and paid for it in a second
red control, which the full lane caught only because the whole lane was run.

**Lesson.** Before de-literalising a value, **ask which controls read that value as text.** More
generally: a single-home fix should remove exactly what crossed the threshold, because a "home" rule
is usually a rule about a *set* being complete, not about each member being forbidden. The minimal fix
here is one destructure of two names and one line changed, and it is also the correct one.

---

## R5 — A spike's directives are quoted into the next milestone's ADRs without re-measurement

- **Kind:** mistake · **Area:** planning
- **Stage:** refine · **Owner:** architect · **Raised by:** architect

**What happened.** At 62's refine, two of spike 60's three prerequisite limbs measured differently at
HEAD: (ii) an append-only observation log already existed (`aof work observe --write`, 8 snapshots,
68/05) because the spike's Lane A grep never reached `src/work-observe.mjs`; and (iii) teaching
`continue.md` to name a config key removes only `harness-not-introspectable`, never `not-admissible`,
because `src/bundle/**` is shipped assets excluded from the program read by construction. Both were
caught only by re-running `assessProposal` at HEAD.

**Lesson.** A directive addressed to a named downstream item wants a **re-measurement obligation
attached to it**. A spike's Outcome/Next is a measurement with a date, not a standing instruction, and
the item that consumes it owes the re-run before it quotes the number into an ADR.

---

## R6 — An ADR that names a function as its mechanism owes a one-line check that the function returns what the clause needs

- **Kind:** mistake · **Area:** delivery
- **Stage:** refine · **Owner:** architect · **Raised by:** architect, at the Three Amigos pass

**What happened.** ADR-006 §1 cited `controlPathsIn` as the provenance-citation extractor. It filters
through `isControlFileName`, so the ADR's own worked example was dropped, and `normalizeCitedPath`
strips the line the same ADR required be checked. Caught by QA at the Three Amigos pass, not by the
architect who wrote it. Both defects were visible in the module's own exported surface.

**Lesson.** An ADR naming a function as a mechanism owes the same thing a fitness function owes: **a
one-line demonstration that the named function returns what the clause needs.** The check is cheaper
than the ADR sentence it validates.

**And it recurred at this gate, from the other direction.** FF-6204's byte-unchanged leg compares
`controlPathsIn` against its own composition — so a change *beneath both sides* moves them together and
the leg cannot see it. The first red probe came back green for exactly that reason. A self-comparison
is a real control over the SPLIT and no control at all over the GRAMMAR, and the register now says so.

---

## R7 — A milestone whose subject is not believing an unchecked number asserted one of its own

- **Kind:** mistake · **Area:** planning
- **Stage:** refine · **Owner:** architect · **Raised by:** architect

**What happened.** 62's ADRs said 8 append-only observability snapshots. The census is 8 directories
across 7 items, 6 with an `agents.json`, and the declared reader returns at most one per item — so the
population the floor rested on was one the reader could not produce. The count was taken with `ls` at
refine and never re-derived through the reader the same document mandated.

**Lesson.** **A figure a floor or a threshold rests on must be measured THROUGH the reader that will
produce it in production, not beside it.** R3 is this same lesson arriving at the gate instead of at
refine, over a different figure, in the same milestone.

---

## R8 — `validate` rejects a stage-2 story's `reads:` for the modules its own milestone has not built yet

- **Kind:** near-miss · **Area:** process
- **Stage:** refine · **Owner:** architect · **Raised by:** architect

**What happened.** `aof work validate` rejects a story `reads:` entry naming a path the story's own
milestone has not built yet, so a stage-2 story cannot declare the stage-1 modules it composes. 62/04
had to drop four `src/work-tune/*.mjs` entries and stand sibling `STORY.md` paths in their place to
reach validate PASS at refine.

**Why it matters.** That is 61/R6's measured failure mode — read contracts systematically short, every
escape load-bearing — re-created by the validation contract itself rather than by an author. The
read contract that would have been most useful to 62/04 is the one validate refused.

**Lesson.** Worth a decision in the work stream: either admit a **within-milestone forward reference**
in `reads:`, or have validate report it as a **warn naming the story that will create the path**. A
gate that makes the honest declaration impossible teaches authors to under-declare.
