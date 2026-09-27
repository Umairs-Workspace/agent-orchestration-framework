---
doc: retrospective
updated: 2026-09-07
---
<!--
  Story RETROSPECTIVE.md — the lessons from HOW this story was built and gated, not what it
  delivered (that is OUTCOME.md) and not what was found (that is VERIFICATION.md, referenced here
  and never restated). One `R<n>` per lesson, appended, never renumbered.
-->
# 123 · The review close mints no driver — Retrospective

<!--
  `observability/snapshots/2026-09-07T00-14-49-840Z/` was written by `aof work observe 123 --write`
  and carries NO agent rows: `sessions: 0`, `agents: 0`, no stalls. The story was built and gated in
  one main session that the transcript miner does not attribute to this ref, so there is no spend or
  stall lesson to draw here — an absence of evidence, recorded as such rather than left to look like
  a clean run.
-->

## R1 — the bound answered correctly three times while the thing it existed to prevent happened

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** 118/01's contract
- **Raised by:** the operator, from the stream itself — chores 120, 121 and 122 appearing after
  milestone 119's review closes

**What happened.** 118/01 capped the triage's creation authority with a depth bound keyed to the
**type of the item under review**: reviewing a chore, a checklist-shaped remedy folds into that
chore's own Definition of Done instead of minting the next one. Three weeks later milestone 119's
closes minted three top-level chores. The bound was not bypassed and did not misfire — it answered
correctly every time, because the item under review was a milestone or a story. **Refs:**
`123/tasks/00_the-close-creates-nothing.feature` preamble; `118/VERIFICATION.md`.

**Why.** The bound was keyed to a **proxy** for the failure rather than to the authority that caused
it. Six of the stream's chores had been minted while reviewing another chore, so "the reviewed item
is a chore" looked like the shape of the problem; it was a property of the measured sample, not of
the mechanism. The mechanism was question 3's power to create at all, and that was untouched.

**Lesson.** When a bound exists to remove an authority, bind the authority — not a condition
correlated with its recent misuse. The test to apply at refine: *can this bound answer correctly and
the failure still occur?* If yes, it is a filter on a sample, and the next occurrence outside that
sample is already scheduled.

## R2 — narrowing an authority to ZERO is provable; narrowing it to ONE was not

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** the story's contract
- **Raised by:** the story author, writing the exhaustive leg

**What happened.** 71/ADR-003 said *the loop creates exactly one type, in exactly one place*, and
every control over it asserted **which** creation was allowed — a row-by-row table of inputs someone
thought to list. Once the authority was narrowed to zero, the same claim became a sweep over the
decider's whole declared input space: 6 severities × 4 locked-contract values × 3⁵ flag combinations
× 6 reviewed types = 9235 calls, each asserted to carry `creates: null`. **Refs:**
`arch/123 FF-7103` (the exhaustive leg); `123/VERIFICATION.md` red-probe rows.

**Why.** "Creates nothing" is a universal over the input space, and a universal is machine-checkable
by enumeration of the space itself. "Creates exactly one thing, under exactly these conditions" is a
conjunction of particulars, and particulars can only be asserted for the rows someone remembered —
which is why the prose layer failed twice on inputs no row covered.

**Lesson.** Prefer narrowing an authority to zero over narrowing it to one, and not only for the
obvious reason: zero is the only setting whose bound can be asserted over the whole input space
rather than over a table. When a design leaves one exception standing, expect the control over it to
be an enumeration, and expect the enumeration to be incomplete.

## R3 — a control anchored on the ANSWER goes vacuously green in the beat the answer moves

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** `m71/FF-7103` leg (b)
- **Raised by:** the story author, in `STORY.md` `## Notes`, before the change was made

**What happened.** FF-7103's prose leg located the checklist question by matching the literal
`**top-level chore**` — the question's ANSWER — and then asserted that any `aof work <verb>` the
block named was `promote-finding`. This change removes both the answer and the invocation. Left
alone, the anchor would have found nothing and the verb check would have passed over an empty set:
the leg would have gone green by having nothing left to read. The story re-anchored it on the
question's own words (*"discharged by a checklist against existing code"*) and re-pointed the verb
half at the stronger claim — a whitelist of **zero**, plus a positive assertion that the block states
*"The loop creates NO item."* **Refs:** `123/tasks/00` sc. 12; `arch/123 FF-7103` leg (b).

**Why.** The anchor was chosen for convenience at the time it was written: `**top-level chore**` was
the most distinctive string in the region. Distinctiveness and stability are different properties,
and the most distinctive string in a block is usually the one a change is most likely to move.

**Lesson.** Anchor a prose control on the invariant — the question, the ordering, the obligation —
never on the current answer. And state a prohibition as a whitelist of what is permitted (here,
zero verbs) rather than a blacklist of known offenders: the whitelist catches the verb the CLI grows
tomorrow, which is precisely the case the blacklist cannot.

## R4 — the declaration was written from intent, and the tree it was written in belonged to someone else

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** the story's frontmatter
- **Raised by:** the product owner at `aof:verify`, by diffing the envelope rather than reading it

**What happened.** `files:` named eight paths; the story had written nine. The ninth,
`src/commands/promote-finding-to-chore.mjs`, carried the story's own header rewrite and was listed
under `reads:`. Nothing reported it — `aof work validate 123` is `PASS` with the omission in place —
and the file sits inside concurrent lane 119/02's declared `src/commands/` envelope, so a reader
attributing the change by declaration alone would have credited it to the wrong story. Fixed at the
close. **Refs:** `@finding-F-123-A`.

**Why.** The frontmatter comment says the sets were *"DERIVED after the build"*, and they were —
derived from what the author remembered writing, not from what the diff said. In a checkout carrying
135 changed paths from another in-flight lane, memory and the diff are not the same list, and the
other lane's broad envelope absorbs anything the narrow one forgets.

**Lesson.** Derive `files:` from `git status` over the item's own change, not from recall — and do it
especially when the tree is shared, because a shared tree is exactly where a missing declaration
stops looking like a mistake and starts looking like someone else's work.

## R5 — the story's own criteria were asserted under its predecessor's name

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** the story's test lane
- **Raised by:** the product owner at `aof:verify`, by counting case labels rather than cases

**What happened.** Task 00's scenarios were made green by re-pointing existing assertions inside
cases named `118 task00` and `118 task01`. The behavioural suite carried **zero** cases labelled
`123`; the arch half did label itself (`arch/123 FF-7103` ×2), so the gap existed in one lane only.
Fixed at the close with one `123 task00` case and a header wiring. **Refs:** `@finding-F-123-B`.

**Why.** The change genuinely was a re-pointing — 118's questions did not move, only question 3's
answer did — so editing 118's rows in place was the correct edit. What did not follow from that is
leaving 123 with no row of its own, and nothing prompts for it: `aof work doctor 123` reports
`rubric-join-unchecked`, which is precisely the check that would have caught it, unarmed.

**Lesson.** When a story re-points an existing suite rather than extending it, it still owes one case
carrying its own ref. Re-pointing is the right edit and an incomplete one: the assertions belong to
the predecessor's questions, and the contract they now discharge belongs to this story.

## R6 — a hand-back recorded at three consecutive gates is not a hand-back

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** the operator
- **Raised by:** the product owner at `aof:verify`, on noticing the finding was familiar

**What happened.** `arch/FF-6603`'s ROUND 3/1 floor was recorded as `F-102-B`, then as `F-118-A`,
then as `F-123-E` — three consecutive accept gates, each routing it to *"the operator, as a story
shape"*, each reading it slightly further from the 90% the leg asserts (89.93% → 89.93% → 89.20%).
No story was ever refined for it. **Refs:** `@finding-F-123-E`; `118/VERIFICATION.md` `F-118-A`;
`102/VERIFICATION.md` `F-102-B`; `123/OUTCOME.md` `## Gaps`.

**Why.** This story makes `story (operator)` the destination of every remedy the close is too
expensive to fix, which turns the busiest routing into the one with no pickup surface. A hand-back is
recorded in the accepting item's `VERIFICATION.md` `## Findings` table and nowhere else, and nothing
reads those tables across items — so from inside the loop, "handed back" and "dropped" produce
identical evidence.

**Lesson.** The rule this story ships is only half a rule until the hand-back is visible. Recording a
finding in the accepting item's own table is enough to be honest and not enough to be picked up; the
next thing this loop needs is a surface that lists open `story (operator)` routings across items, so
that a third identical recording reads as the alarm it is rather than as diligence.
