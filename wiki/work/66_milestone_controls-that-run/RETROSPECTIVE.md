---
doc: retrospective
updated: 2026-08-16
---
<!--
  Milestone RETROSPECTIVE.md — answers ONE question: what did we learn that is worth carrying?
  Owner: product-owner. Distilled at the close from STATE.md's `## Feedback (for retro)` notes and
  VERIFICATION.md's findings. Lessons are `## R<n>` headings (ADR-008 ruling 1 — the bare form,
  unhyphenated, which is what memory's parser indexes).
-->
# 66 · Controls That Run — Retrospective

**The milestone in one line: it built a gate against controls that do not work, and then failed that
gate six times, on itself, in public.** Every lesson below is drawn from a defect this milestone
committed against its own thesis — which is the only reason to trust the gate at all. A milestone
about falsifiability that never falsified itself would be the thing it exists to refuse.

## R1 — A control's INSTRUMENT needs a non-vacuity witness, not just its subject

FF-6602 shipped **green for the wrong reason**: its comment stripper removed block comments before
line comments (TECH_DEBT item 24's trap order), so a `//` comment containing `/*` opened a phantom
block and **1,349 lines of `src/` were deleted before the detector ran**. Its "the frozen five have
ONE home" lane passed *only because the stripper had deleted the second copy*.

The fix that works is measured, and the obvious ones do not: against the four genuinely-blinded
modules, *last-code-line survives* catches **0 of 4**; *export count* catches **2 of 4** — silent on
the very module whose blinding caused the false green; *declaration count* **3 of 4**; and comparing
the candidate stripper's non-blank code-line count against the one home's output catches **4 of 4**
with 0 false positives.

**Carry:** a guard asserting an absence must assert its own eyesight, and the assertion must be
measured against the population it claims to see. "The stripped body is non-empty" is itself a
vacuous control.

## R2 — A claim about the tree is a MEASUREMENT, and it binds reviewers too

m45/R5 ("a fitness function must check what its name claims") was violated **six times** in this one
milestone. Three at refine, caught by QA re-measuring. Then: FF-6601 blind to the copy shape most
likely to arrive; a lane whose *name* asserted a reconciliation its *body* never read; and a severity
claim frozen without ever running the accept it described.

The sharpest instance was the **reviewer's**. An architect reported a guard as unfalsifiable —
"2,365 refs with, 2,365 without, it drops zero" — and the builder contested with evidence rather than
complying. The zero was an artifact: a `node -e` search string reduced through the shell to `(?!.d)`,
which occurs in no source, so `String.replace` was a no-op and the regex was compared against itself.
Had the builder complied, 66/01 would have shipped a guard **hiding 34 valid citations** from the
check 66/02 exists to run.

**Carry, now frozen as ADR-010/E:** a regex or population measurement taken through `node -e` or a
quoted heredoc **is not evidence** — measure from a script file that prints the constructed pattern
beside its result. The trap fired three times in this milestone, once on the architect drafting the
ADR about it. And ADR-009/A's measure-against-HEAD ratchet **binds reviewers, not only builders**.

## R3 — A claim about a GATE must be run at the TRANSITION it governs

ADR-011/C froze the severity claim *"error while 66 is open, warn at `done`"* without ever running
66's accept. The consequence arrived at the close: **milestone 66 was refused by the gate milestone
66 shipped**, over two citations in its own architecture document, with no clearing act available and
no waiver path — and adding one was refused, because a waiver clause is the first thing a future
project reaches for.

**Carry:** measuring a finding is not the same as measuring the accept. Run the gate at the
transition before freezing what it does there.

## R4 — A rule frozen in an ADR and never shipped as an ask is a gate with no ask

The cause underneath R3 was smaller and worse. ADR-010/D froze *"write every specimen APART, never
joined"* — and **0 files in `src/bundle/` carried it**. The check shipped; the prevention sat in a
document no downstream project reads. So the author of ADR-009/D had no rule to follow, and neither
would the next project's architect.

Three occurrences, three authors' worth of care: ADR-010/D slipped twice while drafting its own row,
the PO planted three more in a `VERIFICATION.md` written *after* the rule existed, and the architect
wrote both specimens joined **inside the ADR that forbids it**. That is what a rule with no ask looks
like from the inside.

**Carry:** ADR-007 §1 already says a refusal with no ask is a trap. Extend it — **when a rule is
frozen, the same milestone ships its ask, or the rule does not exist.**

## R5 — Where a story ships PROSE, the reader-judgement lane is the only control

Two defects in 66/03 were invisible to every assertion because they were sentences. The template said
a guard is indistinguishable from a broken one *"by every signal except **this cell**"* — swapping the
**act** (a red probe) for the **record**, in the milestone whose whole subject is that distinction.
And four files promised an accept refusal the machinery does not perform, deriving it with an invalid
*"so"* from a `warn` that does not gate.

Every token-presence lane was green for both. The first was caught by the `@manual` reader **in its
own author's output**; the second by QA driving the real `doctorWork` at every status.

Its mirror image: a lane whose *name* claimed the reconciliation it never checked let a real
literal-versus-effect conflict ship green, and needed a human to catch.

**Carry:** a token-presence test passes happily on a sentence saying the opposite. Where the
deliverable is wording, `@manual` is not ceremony — and its evidence must name the sentences weighed,
so a reader who was not there can check the reasoning rather than take it.

## R6 — A story partition grounded in the import graph is blind to duplicated derivations

`ARCHITECTURE.md` claimed 66/01 shared no file with its siblings. Measured: **both** 66/00 and 66/01
edited `src/import/recovery.mjs`, and the two edits landed in the **same hunk**. Sequenced it was
invisible; run concurrently — as the partition itself prescribed — it is a merge conflict.

The mechanism is the lesson: **an import graph cannot see a duplicated literal, because a copy creates
no edge.** The one coupling this milestone exists to remove is the one its own boundary instrument is
structurally blind to. It bit twice in one file because that module had independently re-spelled both
the lifecycle vocabulary and the declaration grammar.

**Carry:** before claiming two stories share no file, grep for the **derivations** each owns, not only
the import edges.

## R7 — A story's task features must be read as ONE document at refine

Two rows of `01_a-register-declares-once.feature` were unbuildable **because of** a scenario frozen in
`00_one-lane-that-reads-and-never-runs.feature` — same story, same contract. Honouring the row costs
62 new reads; the sibling scenario freezes the read budget. The contradiction survived refine, the
Three Amigos pass and three closure rounds, surfacing only when the build hit it.

**Carry:** every existing check reads features one at a time, which is exactly why a cross-feature
contradiction is invisible. Add a refine-time pass that reads a story's features as one document.

## R8 — A ledgered-and-deferred control is indistinguishable from an absent one

TECH_DEBT item 24 named the exact regex, the exact order and the exact fix at m45 — then was deferred
through m46, m47, m48 and m66, each deferral costing a reviewer the same afternoon, while the item's
own "false GREEN" note said *not yet observed*. This milestone observed it, in a delivered control, in
a module **item 24 had named by name**.

The same shape from the retrospective side: m40/R3 recorded a fix and scheduled nothing; across 26
milestones its gap grew from 7 records to 127, red at HEAD the whole time, listed in no ledger until
now.

**Carry:** a lesson recorded, cited and never executed is the same defect class as a control declared
and never run. **A "Carry:" line is not a tracked artifact** — this repo has no mechanism that turns
one into work, and both halves of that gap are now ledgered.

## R9 — A number that licenses NOT doing something is a measurement too

The decision to leave this repo's installed bundle copies stale was justified with *"already 11
entries stale at HEAD"*. The 11 was the **manifest's** staleness; the installed copies were **84 of 86
identical**. The conclusion held, but the arithmetic was about a different pair.

**Carry:** ADR-009/A and ADR-010/E ratchet claims made *for* an act. The same standard applies to a
number offered as the reason to skip one.

## What went right, and is worth repeating

- **The builder contested a reviewer with evidence instead of complying** (R2). That single act is
  what kept a 34-citation coverage hole out of the tree. Compliance would have been the defect.
- **Closure ADRs did the work an edit would have hidden.** Five rounds (ADR-008 … ADR-012) recorded
  corrections *by measurement*, superseding without editing an ADR body — including two rulings that
  contradicted earlier ones by the same author, each with the number that forced it.
- **Every story landed its own controls** (ADR-007 §1). No late "the fitness functions" story, and
  m52's TECH_DEBT item 48 outcome — three stories accepted on fixtures not on disk — did not recur.
- **The lane caught its own author.** Its first act was reporting five dangling citations against
  milestone 66, three in a record document the PO wrote *after* the rule forbidding them. No reviewer
  caught those three; the check did. That is the whole case for mechanisation over recall, made by
  the milestone against itself.
