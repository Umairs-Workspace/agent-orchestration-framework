---
type: story
doc: retrospective
number: 80
slug: outcome-per-delivered-item
title: "Retrospective — every item that delivers says what it delivered"
created: 2026-08-20
updated: 2026-08-20
---
# 80 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

## R1 — A type-agnostic body behind a typed filter is a typed consumer

The story's `## Why` argued the widening was nearly free: "the consumer is already type-agnostic —
`local-indexing.mjs:676` joins `OUTCOME.md` onto `item.dir` and parses it for EVERY item it scans".
That line is true and the conclusion drawn from it was false: the set being scanned was
`items.filter(item => item.type === "milestone" && item.parent == null)`, so a story's outcome was
never opened. Refine measured it and corrected the story before the build. **When you claim a
consumer already handles the general case, measure the SET IT ITERATES, not the body it runs over
each element** — the filter upstream of a general body is the type rule, and it is usually somewhere
the reader was not looking. Measured here as the difference between "a free ride" and the story's
load-bearing half.

## R2 — Widening a step in a prompt means enumerating its ENTRANCES, not its steps

`verify.md` dispatches a `spike` or a `chore` to a branch that runs BEFORE the numbered process
steps. Putting the widened Outcome obligation in step 6 alone would have authored an outcome for a
milestone and a story and silently skipped every chore — the type the ask named first. **A prompt
with an early-dispatch block has more than one entrance; a new obligation has to be wired at each
one, and something has to assert that it stays wired.** Task 01's contract check now asserts the
chore's own branch names the shared template, so the two-home wiring cannot rot back to one.

## R3 — Absent and empty are one value to a predicate and opposite intents to a user

The subtree rule reads an empty scope as "unscoped" — correct for the `--only` rebuild, where absent
and empty both mean the whole stream, and wrong for a `--item` recall filter whose PRESENCE is the
user's intent to narrow. Sharing the predicate would have turned `recall --item ""` from "narrow to
nothing" into "return everything", and it was caught in review rather than by the contract: the
Examples enumerated `39`, `39/02`, `80`, `41` and `999` — every value a user types on purpose and
none of the degenerate ones. **When one predicate is shared between a FILTER and a SCOPE, the
degenerate inputs are exactly where the two intents diverge; enumerate the empty, the blank and the
unresolvable, not only the meaningful.**

## R4 — A whole-file hash is a tripwire on the file, never on the rule it names

FF-5308 pins both `inRange`'s function body and a whole-file sha of `src/work.mjs`. The function pin
is doing its job and is green. The file pin has been red since the previous story touched an
unrelated part of the god node, and it reds again here for a seven-line comment that changes no
behaviour — so the control now reports "the loop scope guard must not widen the god-node parser"
about edits that widen nothing. **Pin the cut you mean.** A control that reds on any edit by any
story teaches its readers to expect red, which is the state in which a real widening goes unnoticed;
and a milestone whose controls outlive it needs its pins narrowed at its own accept, not by the next
story that brushes the file.

## R5 — When a story invalidates a delivered record, amend your own — never theirs

Moving the template made `m39`'s `OUTCOME.md` state something false: it names two paths that no
longer exist and calls the artifact a milestone template. Editing it would have made a done milestone
claim a delivery it did not make; leaving it silent would have left a false record with nothing
pointing away from it. The rule applied: **the superseding item states the supersession in its own
outcome and logs the residue as a finding.** The residue is real and worth naming — the index unions
both statements and has no notion of supersession, so a recall over "where the template ships"
returns the old one alongside the new. That is a gap in the document class, discovered only by being
the first story to invalidate another item's outcome.
