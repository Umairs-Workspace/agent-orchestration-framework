# 57 · Paired loops — Retrospective

<!--
  RETROSPECTIVE.md — the lessons this milestone paid for, in a form the NEXT milestone can carry.
  Written at accept from the STATE `## Feedback (for retro)` notes, the VERIFICATION findings and the
  blocker stops. Lessons are `R<n>`; a decision durable enough to bind future work graduates to an ADR
  instead. Not a diary — a diary of what happened is STATE's job, and it is compacted, not copied.
-->

## R1 — A story's own verify cannot see the control it poisons elsewhere, and four did

**What happened.** Every story passed its own gate, and the milestone gate then found four regressions
against controls belonging to milestones 42, 53, 66 and 69: a second home for the autonomous attempt
ceiling (`F-57-M-1`), the `ADR-\d` id grammar spelled twice more (`F-57-M-4`), a sixth silent-catch
site (`F-57-M-8`), and a bundle census literal not moved with the tree it counts (`F-57-M-2`). All
four were introduced by stories that were green, reviewed and marked `done`.

**This is the documented trade, and it was paid in full.** `aof:verify` scopes a story's suite to that
story on purpose, and states the cost in terms: *a poisoning story is caught at the gate, not
immediately, and may need rework after being marked done.* That is exactly what happened, so the
lesson is not "the rule is wrong".

**The lesson is that the two lanes have very different costs.** The behavioural suite is long, which is
what the scope rule is protecting against. The ARCHITECTURE lane is fast, cross-cutting by
construction, and is where every one of these four was caught. Running `test/arch/**` at the story gate
while still deferring the behavioural lane would have caught all four at the story that caused them,
for a fraction of the cost the rule exists to avoid.

**Carry:** propose the split to the next milestone that touches `aof:verify`'s step 1 — story gate runs
the arch lane, milestone gate keeps the full lane.

## R2 — A prose note asking the next author to remember has a measured record of 0 for 5

**What happened.** `test/bundle-asset-manifest-complete.test.mjs` pins a census of `src/bundle/**` and
carries a comment arguing, in capitals, that *"THE LITERAL MOVES IN THE SAME DIFF AS THE TREE"*. That
note names four prior recurrences by hand — `d5cea70`, milestone 53's gate, `F-69-V21`, `F-55-M-2`,
story 87. This milestone was the fifth move and the fourth time the causing diff did not pay it.

**The instrument is what is wrong, not the authors.** Five for five, a comment addressed to whoever
edits a different file next has failed. The same class produced `F-57-M-3`: `src/bundle/manifest.json`
is *derived*, its generator's header says to run it after any bundle change, and two stories changed
the bundle without re-deriving it — because the manifest is not a file either story edits. Nine gates
went red, none of them naming the change that caused them.

**What would actually work.** A control that fires at the moment of the bundle change rather than nine
controls firing later at someone else's gate: the bundle→disk parity leg `F-57-01-2` already asks for,
extended to assert the shipped manifest equals a fresh render, and the census derived from the tree
rather than pinned beside it.

**Carry:** this is a standing recommendation to the architect, not a 57 action — but the next milestone
to add a bundle member will pay it again if nothing changes.

## R3 — Re-reading a finding's enumeration is not re-measuring it

**What happened.** `F-57-00-2` enumerated `arch/m42-item-3`'s silent-catch offenders at 57/00's accept
and named five files. The first milestone-gate pass matched that control's red line against the finding
and counted it as inherited. It had grown a **sixth** entry — `src/commands/ratchet.mjs`, added by
57/03 after the enumeration was written. The gate under-reported its own milestone's regression by
trusting a list it had authored earlier.

**Why it is worth a lesson.** This milestone's whole subject is that a number the optimizer can edit is
not evidence. A finding register is exactly that shape: the verify node writes the attribution and the
verify node later reads it back as the answer. A stale enumeration looks identical to a fresh one —
the same argument this document already makes about allocating finding ids — and it took a
re-measurement, not a re-read, to see the difference.

**Carry:** at a milestone gate, re-measure every inherited-drift finding rather than matching a red
line against its recorded enumeration. The cost is one command per finding; the failure mode is
shipping your own regression as someone else's.

## R4 — Widening a frozen set without probing it is how a frozen set stops being frozen

**What happened.** Fixing `F-57-M-4` required `src/work-ratchet.mjs` to import `./declared-id.mjs`,
which `FF-5705`'s frozen three-member import assertion forbade. The set was widened by one.

**What made it safe rather than a hole.** The admission carries a *checked condition*, landed as a new
leg of the same control: the admitted leaf must import nothing and reach no I/O, and the engine may
take only the ADR id fragment from it, never the leaf's heading recogniser. Both halves are red-probed,
along with the inverse — a fourth import still reds the set. Without that leg, admitting one import
would have laundered an arbitrary dependency tree in behind it and `FF-5705` would have kept reporting
green about a purity claim it no longer checked.

**Carry:** when a fitness function's frozen literal has to move, the amendment owes a probe of the
*widened* set and a check of whatever condition justified the widening. An amendment with no probe is
indistinguishable from a relaxation.

## R5 — Every green-making edit here was the move the milestone exists to refuse, and naming that early is what kept them out

**What happened.** Each of the four regressions had an obvious fix that was a form of editing the
measurement: adding the counter module to `EXPECTED_READERS`, relaxing the census literal to a bound,
re-marking a control `pending`, softening the silent-catch ban. None was taken — the recorded set was
not widened for `F-57-M-1`, the census literal moved to the new truth rather than becoming a bound, and
`F-57-M-8` was fixed inside milestone 42's own stated carve-out rather than around it.

**The general shape.** A control that is red because the code is wrong and a control that is red
because the control is wrong look identical from the failure message. The question that separated them
every time was *whose claim moved* — 53's cap invariant did not move, so the code had to; 66's census
literal is explicitly authored to move with its subject, so it did.

**Carry:** when a gate reds, decide whether the invariant or the code is what changed before deciding
what to edit — and record the answer, because the next reader sees only the edit.

## ADR candidates

None. R1 and R2 are recommendations against surfaces this milestone does not own (`aof:verify`'s step
1 scope rule, and milestone 53's `FF-5313`), and R3–R5 are practice rather than structure. Nothing here
binds future work strongly enough to be a decision record, and inventing one to look thorough is the
failure ADR-006 §3 names in a different register.
