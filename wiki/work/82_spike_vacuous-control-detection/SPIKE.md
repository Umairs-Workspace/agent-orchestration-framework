---
type: spike
number: 82
slug: vacuous-control-detection
title: "Is a vacuous control mechanically detectable?"
status: done
owner: architect
created: 2026-08-24
updated: 2026-09-04
depends: []
timebox: 2d
schema: 1
aofVersion: 0.1.0
---
<!--
  SPIKE.md — the record doc for a de-risk spike. Answers ONE question:
  is the unknown resolved, and what did we find?
  Owner: whoever runs the spike. A spike is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature. Its whole deliverable
  is a RECORDED FINDING; the code it produces (if any) is a throwaway prototype, never shipped as-is.
  "Done" = ## Finding is filled and the unknown is resolved (aof:verify checks exactly this — no
  scenario run, no "tests green"). It gates the stream: a milestone that `depends:` on this spike waits
  until it is `done`.
-->
# 82 · Is a vacuous control mechanically detectable?

## Question

**Can a test whose fixture cannot reach the condition it names be detected by a signal, rather than
by a human reading it?**

A control that guards nothing passes. It is indistinguishable, on every signal this repository
currently produces, from a control that guards something and found nothing wrong. The red-probe
register is the existing countermeasure and it is a **declaration, not a detector** — it records that
somebody performed a probe, never that the assertion beneath it was reachable, and its own boundary
paragraph says so in as many words.

The question is deliberately narrow. It is **not** "can we prove tests are good"; it is whether the
specific, recurring shape below is mechanically recognisable:

> an assertion that cannot fail under the fixture it is given, because the fixture never establishes
> the precondition the assertion's own message claims to be about.

## Timebox

- Box: `2d` — stop and record the best-available finding at the boundary; a timebox extension
  requires explicit re-scoping.
- **A negative finding is a real finding.** "No, not mechanically — here is why, and here is the
  cheapest non-mechanical countermeasure" resolves this spike and should be recorded as confidently
  as a yes. What must not happen is a third prose rule dressed as an answer.

## Investigation

Run 2026-09-04, inside the `2d` box. Four throwaway prototypes, all under the session scratchpad;
**nothing landed in the tree**, and the one production mutation was restored and re-verified green.
Each candidate was measured against the seven-instance corpus below, and against the healthy
remainder of the suite — because a detector's cost is its false positives, not its true ones.

**M0 — the corpus is not one shape, and only two instances match the question as asked.**
Re-read against this spike's own definition (*an assertion that cannot fail under the fixture it is
given, because the fixture never establishes the precondition the assertion's message claims to be
about*):

| # | the control | its actual shape | matches the named shape? |
|---|---|---|---|
| 1 | 16 red-probe cells (69, 70) | accepting set wider than the message claims — a placeholder satisfies it | **no** — the assertion *can* fail; an empty cell reddens it |
| 2 | `REG-MUT-11` "by construction" | a promise in the message that no assertion tests; found by mutating *source* | **partly** — unreachable branch, but not a fixture-reach problem |
| 3 | `loop-gate-cost-ladder` "no runner is spawned" | absence assertion over a channel the fixture cannot populate | **yes** |
| 4 | `FF-5409`'s `grade-indeterminate` clause | shape read off a probe that reaches no stop | **yes** |
| 5 | `69/F-69-V7` rubric pin | environmental — pins a command unrunnable on this machine | **no** |
| 6 | `53/FF-5304` exactness | self-fulfilling literal, hand-edited to match | **no** — it can fail; it was made not to |
| 7 | the skipped-case pass | metric conflation (`total` counted skips) | **no** — the metric was wrong, not unreachable |

This bounds the best case before any detector is built: a *perfect* detector for the named shape
answers **2 of 7**, under this spike's own bar that "a detector that cannot flag most of them is not
worth landing". The corpus was recorded as one class because every instance shared a *consequence*
(green for an unmeasured reason), not a mechanism — and a detector keys on mechanism.

**M1 — the population any detector must triage.** Absence assertions are the only class that can be
vacuous in the narrow sense: a positive assertion that passes proves the fixture reached the state,
whereas an absence assertion passes both when the code is right and when the fixture never arrived.
Measured over `git ls-files test`: **8,057 absence assertions among 38,829 assertion lines (20.7%)
across 1,103 files** — `equal(x, falsy)` 3,510, `deepEqual(x, [])` 1,285, `ok(!x)` 1,236,
`notEqual` 1,098, `doesNotMatch` 412, `equal(x.length, 0)` 372, `doesNotThrow` 144.

**M2 — candidate "assertion-message vs. asserted-subject divergence": REFUTED by measurement.**
The hypothesis was that a message naming a subject the assertion never touches is greppable. It is;
it is also the house style. Over the 21,295 assertions carrying a message, the rule
(no content word of the message appears anywhere in the asserted expression) flags **7,481 — 35.1%**,
and the sampled flags are healthy controls whose messages state the *consequence* rather than the
mechanical subject: `"not reported at all"` over `deepEqual(mine, [])`; `"the whole stream is quiet
about the file"` over `deepEqual(findings, [])`. Divergence is the norm here, so it separates
nothing. No threshold rescues it: the corpus instances sit inside a 7,481-strong healthy majority.

**M3 — candidate "mutation at the fixture", narrowed to its only tractable form.** The general form
needs the fixture mutated to *establish* a precondition, which is the author's knowledge. The one
mechanisable proxy is an **automated red probe**: for an absence assertion that searches for a string
literal, find that literal in `src/`, force its emission, re-run, expect red. That subset is bounded
and small — of 371 negated-search assertions carrying a literal, **238 have a literal that appears in
`src/`**. Cost floor: one owning-suite run per mutant; `test/loop-gate-cost-ladder.test.mjs` alone
takes **13.5 s**, so 238 × 13.5 s ≈ **54 minutes**, optimistic (it assumes one cheap file per mutant).

**M4 — the decisive experiment: the automated probe returns the WRONG verdict on the corpus.**
Instance 3 is still in the tree at `test/loop-gate-cost-ladder.test.mjs:107` and is still vacuous —
54/03 repaired it by *adding* a configured-fixture leg beneath, not by removing the blind assertion.
`src/commands/loop.mjs` was mutated to emit `Gate work:grade` unconditionally at the top of
`invokeGateLadder`, and the suite re-run: the assertion went **red** (3 of 9 tests `not ok`, exit 1).
The probe therefore reports the known-vacuous control as **"armed"** — a false negative on the single
instance it was designed to catch. The mutation restored, the suite is green again (0 `not ok`).

The reason is structural, not a flaw in this mutant. A crude mutant injects the token into the
channel from *outside* the logic under test; it proves the channel is wired, never that the fixture
can reach the condition. A *faithful* mutant would have to drive the real grade rung — which under
this fixture is impossible, because no rubric is declared. Establishing that precondition is exactly
the manual repair 54/03 performed, and choosing it requires knowing which precondition the
assertion's subject depends on. That is the author's intent, and it is not recoverable from source.

**M5 — candidate "coverage of the asserted path under the test's own fixture": also returns a false
"armed", by a second route.** This is the proxy this spike named as most likely tractable, so it was
measured rather than argued. `test/loop-gate-cost-ladder.test.mjs` was run under `NODE_V8_COVERAGE`
and the emission site of instance 3's subject located — `src/commands/loop.mjs:1737`,
`` `Gate work:grade …` ``. The innermost V8 range covering it reports **`count=2`: the path WAS
executed.** Coverage therefore calls the blind assertion's path "covered", because the file's nine
tests share one process and the *sibling* configured-fixture legs executed it. Discriminating them
needs **per-test** isolation, and that is priced: the runner's fixed module-graph cost is **4.66 s per
process**, over **1,003 registered suite arrays** and several times that many individual tests — a
floor in the hours for one full pass, against a whole-suite baseline that is a small fraction of it.

The cost is not the disqualifier, though; the discrimination failure is, and it survives per-test
isolation. Coverage observes *whether production code ran*. "Correctly did not run" and "could never
have run" are **the same observation** — a red-gate test that legitimately asserts the runner is not
reached leaves the emission uncovered for the right reason, exactly as the blind one does for the
wrong reason. That is definitional rather than empirical, and it is stated here as the argument it is:
coverage cannot carry the distinction because the distinction is not in what executed.

**M6 — what the repository already does about it, unnamed.** The 54/03 repair is a **guard
assertion**: a *positive* assertion that the precondition was reached, placed immediately before the
shape it guards — `assert.equal(state.act.stop, "grade-indeterminate", "guard: the loop halted on the
stop this clause is about")`. The idiom is already in the tree at **121 uses across 43 files** (measured at HEAD), and it
is documented nowhere in `wiki/*.md` — it survives as a local habit, not a convention.

**M7 — diff-scoped yield, which is where a control could still be quiet.** Per ordinary working
commit, 0–2 absence assertions are added. Per *milestone squash-merge* the figure is 150–813, which
would be tuned out on sight. The narrow negated-search shape of M3 is the bounded one: **+17** for
the four-milestone commit `78746b74`, **+59** for `b1ba1197`, **+0** for `231ee134`.

## Finding

**No. Vacuity is not mechanically detectable — and the obstruction is structural rather than a
matter of effort, tooling or budget.**

Vacuity is **not a property of an assertion**. It is a *relation* between the assertion and the
reach of the fixture it was given, and the relation is only defined once you know which precondition
the assertion's subject depends on. That premise lives in the author's head. Nothing in the source
distinguishes `!lines.some(includes("work:grade"))` over a fixture that *cannot* spawn a runner from
the identical expression over a fixture that *can* — the two differ only in an intent the code never
states. All three candidates this spike named were tested, and each failed in one of two ways. Those
two ways are a claim about **these three**, not a proof that no detector could exist:

- **Textual proxies have no selectivity** (M2): 35.1% of messaged assertions "diverge", nearly all of
  them healthy, because the repository deliberately writes messages about consequences.
- **Behavioural proxies answer a different question** (M4, M5): the automated red probe measures
  *"is the channel wired"*, and coverage measures *"did this path run"* — neither is *"can this
  fixture reach the condition"*. Both therefore return **"armed"** for a control both 54/03 reviewers
  independently identified as blind. A detector that is confidently wrong about the one corpus
  instance it was built for is worse than no detector.

The narrow answer therefore also settles the broad one. Even granting a perfect detector for the
shape as stated, **it addresses 2 of the 7 instances** (M0) — the corpus is four or five mechanisms
sharing a consequence, not one mechanism. The class was real; the *single* detector it seemed to
imply was not.

**The negative is the finding, and it is worth as much as a yes.** It retires the standing hope that
some unbuilt signal would eventually catch this class, and it says precisely which hope is retired:
not "we lack a tool", but "the fact a detector would need is never written down".

**The cheapest countermeasure, and it is not prose:** the **guard assertion** already in the tree
(M6) — one *positive* assertion that the precondition was reached, immediately before the absence
assertion it guards. It is authored by the only party who holds the premise, costs one line, and
converts a silent vacuity into a loud failure the moment the fixture stops reaching the condition. It
is not a detector and does not pretend to be; it makes the missing fact *explicit* so that the
ordinary red/green channel can carry it. Its weakness is honest and worth stating: nothing compels it,
and a guard can itself be written blind.

**The one mechanical residue worth naming** is an *attention router*, not a detector: the 238-member
negated-search-with-traceable-literal subset (M3), filtered to those whose test body carries no
`guard:` witness, is bounded (0–59 per milestone diff, M7) and can direct a human to the assertions
most likely to be blind. It **decides nothing** — M4 and M5 are the proof that the verdict
cannot be automated — and by this spike's own bar it does not qualify as the answer, because it cannot see
instances 1, 5, 6 or 7. It is offered as a triage aid, and must never be described as a vacuity check.

**A red probe at authoring time remains the only measurement.** That was the standing position before
this spike; the contribution here is that it is now a *measured* conclusion with the alternatives
priced and eliminated, rather than an assumption nobody had tested.

## Outcome / Next

**What this unblocks, immediately: no milestone should be scoped to build a vacuity detector.** That
was the open possibility this spike existed to price, and the answer is no. Scoping one would have
committed a milestone to the same defect shape aimed at the fix — the outcome the spike was created
to prevent. Nothing `depends:` on this spike, so nothing is unparked by it; what it buys is a
roadmap slot *not* spent.

**What is now decidable, and belongs to the operator (this spike creates no items):**

1. **Name the guard idiom, or leave it a habit.** 121 uses across 43 files, documented nowhere
   (M6). Raising it to a named convention in `wiki/acceptance-criteria.md` — *an absence assertion
   carries a positive guard that the precondition was reached* — is chore-sized and is the highest
   value-per-cost item this spike surfaced. It is a convention, not a control, and the eighth-prose-
   rule objection applies to it honestly: what distinguishes it is that it names a **one-line code
   change**, not a behaviour to remember.
2. **The attention router**, if it is wanted at all — bounded, advisory, and explicitly not a
   verdict. Recommended **only** alongside (1), because a router that points at assertions with no
   convention to repair them toward is another warn nobody actions.
3. **Instance 3 is still blind at `test/loop-gate-cost-ladder.test.mjs:107`** (M4). 54/03 added a
   sound leg beneath it and left the original assertion standing. It is one guard line from honest,
   and it belongs to milestone 54's lane, not to this spike (54's own R11: extending another
   milestone's gate is fine, discharging its debt while you are in there is not).

**What must not happen next.** Not an eighth prose rule saying "check your fixtures reach the
condition" — that is what the seven instances already ignored, and R1 recorded that prose is the
countermeasure this repository keeps reaching for and that keeps not working. The finding's whole
content is that the missing artefact is a *written-down premise*, so the only useful response is one
that makes a premise explicit in code.

## Why this is worth a roadmap slot

<!-- Not a template section. Kept because the corpus IS the justification, and a later reader deciding
     whether to run this spike needs the count, not the assertion. -->

**Seven instances in a single milestone (54), every one green, every one found by a human or a
reviewer reading it — none by a signal.** Recorded at 54's accept as `RETROSPECTIVE.md` R1 and as an
open gap in `54/OUTCOME.md`:

| # | the control | why it was green |
|---|---|---|
| 1 | 16 red-probe cells across milestones 69 and 70 | filled with a placeholder-substitute the shape test reads as "recorded" (`F-54-REFINE-2`) |
| 2 | `REG-MUT-11`'s "by construction" tolerance | its own promise is false for the array's terminal element (`F-54-00-4`) |
| 3 | `loop-gate-cost-ladder`'s *"no runner is spawned"* | fixture declares no rubric, so no spawn was observable at all |
| 4 | `FF-5409`'s `grade-indeterminate` clause | took its state from the READ-ONLY `work:loop` probe, which drives nothing and reaches no stop |
| 5 | `69/F-69-V7`'s rubric-command pin | pinned a command that cannot grade green on this machine |
| 6 | `53/FF-5304`'s stop-set exactness | rests on a hand-typed literal that was hand-edited to match (`F-54-VERIFY-2`) |
| 7 | the skipped-case pass | `total` counted skips, so a suite that ran nothing cleared its floor (`F-54-00-2`) |

The countermeasure reached for each time was another prose rule. Seven recurrences is the evidence
that prose is not working, and the reason this is a spike rather than an eighth rule: **nobody knows
whether the mechanical answer exists**, and committing a milestone to build a detector before that is
known would be the same defect shape aimed at the fix.

**What it gates.** Nothing yet `depends:` on this spike, deliberately — a control worth landing is
scoped only once the finding says one is possible.
