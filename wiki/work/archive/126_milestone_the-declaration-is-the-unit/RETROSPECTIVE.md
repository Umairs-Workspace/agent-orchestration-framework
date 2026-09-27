---
type: milestone
doc: retrospective
number: 126
slug: the-declaration-is-the-unit
title: "Retrospective — the declaration is the unit"
created: 2026-09-10
updated: 2026-09-10
---
# 126 · Retrospective

Milestone-level lessons — the ones no single story's retrospective states, because each is a property
of the milestone or of the process rather than of one story's subject. Story lessons live in the seven
`stories/*/RETROSPECTIVE.md`. Findings are **referenced**, never restated: they live in
`VERIFICATION.md`.

## R1 — A milestone's `## Objective` is a tax every story below it pays, and nothing reports the bill

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** a shipped gate, at the milestone door

**What happened.** `70/05 task02` was red for three story accepts. `F-01` guessed a budget cause and
routed it to `aof:refine 126/03`, where it sat while the story was built and reviewed. Measured at the
door: a milestone `## Objective` sits in `BRIEF_NON_CONDENSABLE_SECTIONS`, so it is carried WHOLE into
every one of that milestone's story briefs. At **3,795 characters** it took **47%** of the
8,000-character brief ceiling, and `126/03`'s architecture slice — the two largest ADRs in the
document, which its `adrs:` frontmatter explicitly declares — was dropped entirely. `126/02`'s refine
brief lost its `tasks` section to the same cause and was named by nothing, because the contract
assertion runs on the `continue` and `verify` phases only.

**Why.** The objective is the one section a milestone author writes at length, and it is the one
section the packer cannot reduce. The cost lands on a different document, at a different phase, for a
different item — so the author never sees it, and the story that loses its architecture is not the
story that wrote the prose. Compacting it to 3,188 characters, with the measured timeline and the
seam table intact, was enough for every 126 story's brief at every phase to carry every section.

**Lesson.** Treat a milestone objective as budgeted prose: state the argument and put the evidence in
`STATE.md`, which no brief carries. The general shape is worth more than the number — **a
non-condensable section high in a priority order silently starves everything below it**, and the
starvation is only visible from the compiled brief, never from the source. **Refs:** `@finding-F-22`,
`@finding-F-23`.

## R2 — A `files:` declaration names where new code will LIVE; a change's blast radius is everything pinned to where the old code WAS

- **Kind:** design-gap · **Area:** architecture · **Stage:** refine · **Owner:** product-owner · **Raised by:** four stories in a row

**What happened.** Four of six stories declared an incomplete `files:` — `F-05` (two ratchets),
`F-07` (a ratchet and a suite split at build time), `F-15` (a forced module, a five-link
content-address chain and a ratchet) and `F-17` (four delivered controls that followed a moved
symbol). Nothing went wrong, because the milestone was built serially.

**Why.** Refine derives a write set from the DESIGN — the modules the story will create and edit.
Every one of these misses is a frozen set, byte-pin, reach ceiling or line ratchet that names the
SUBJECT the story is moving or the shape it is adding, and none of them is derivable from where the
new code goes. `F-17` is the sharpest because its story is a pure subtraction: it removed code and
still had to write four controls.

**Lesson.** Four measurements make it a property of the declaration, not of any one refine. **The
wave planner trusts `files:`**, so under a fan-out two lanes would have written one budget table
without either having declared it. At refine, for any story that MOVES or RENAMES a symbol, or that
ADDS a file, a suite or a declaration key, enumerate the ratchets and frozen sets that name the old
location and declare them. **Refs:** `@finding-F-05`, `@finding-F-07`, `@finding-F-15`,
`@finding-F-17`.

## R3 — The red probe is the only instrument that tells "the claim is enforced" from "the claim is enforced BY THE CONTROL THE REGISTER NAMES"

- **Kind:** confirmed approach · **Area:** testing · **Stage:** verify · **Owner:** product-owner · **Raised by:** this milestone's eight probes

**What happened.** `FF-12607`'s row read as though its named control asserts the off-Windows coded
refusal. The probe that neutered the refusal left that control **green on all five legs** and
reddened three acceptance scenarios instead. Without the probe the row would have stayed wrong, and a
later reader deleting the acceptance scenario would have believed the control still held the line.

**Why.** A register row is prose written by the party being checked, and every declarative check over
it — does the control resolve, does the row exist, is a probe recorded — reads the same prose. Only
running the defect distinguishes the two.

**Lesson.** This is the field's stated value, observed: it does not catch a fabricated probe and it
does not reach an assertion that is not a declared control, but it does catch a register that
describes the wrong file. Where a claim is genuinely split between a control and its acceptance
suite, write the split into the row. **Refs:** `@finding-F-27`, `@finding-F-25`.

## R4 — Two inherited reds were carried as "irreducible" for three accepts and both fell in under an hour once investigated

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the milestone door

**What happened.** `F-02`/`F-16` concluded that `arch/119 FF-11903`'s residue "is not reducible by
repair alone and the remedy is the extractor or the ceiling, not three more repairs", because the
remaining citations are mentions inside the findings whose subject IS the bad path. `F-01` guessed at
a cause and routed it elsewhere. Both were inherited, unchanged, through three story accepts. At the
door, `FF-11903` fell to its ceiling by DE-SPELLING — naming the mistake without writing a token the
extractor reads as a citation, which the earlier analysis had not considered — and `70/05 task02`
fell to a prose compaction.

**Why.** A finding that states its own remedy is persuasive, and the statement was carried forward
verbatim into two more accept blocks. Each accept correctly declined to fix it inside a story; none
tested the claim.

**Lesson.** A finding's routing is a hypothesis, not a result. When a red is inherited across more
than one accept, the door owes it an INVESTIGATION rather than another restatement — and "the remedy
is X, not Y" deserves the same scepticism as any other undemonstrated claim. **Refs:**
`@finding-F-19`, `@finding-F-22`.

## R5 — The live `@manual` lane found four things a green tree could not

- **Kind:** confirmed approach · **Area:** testing · **Stage:** verify · **Owner:** product-owner · **Raised by:** `126/03` and `126/04`'s task 04

**What happened.** Every `@executable` lane in this milestone was green, and every declared control
was green under a red probe. The two live scenarios then found: a preflight whose failure detail is
**16,827 characters** on one line and can never pass on this node (`F-28`); a workspace with no
`claude-run-heartbeat` hook silently recording no liveness at all, which billed an idle machine a
declaration's whole compute budget (`F-31`, and `126/06` exists because of it); a named clean exit
restarted every ten seconds for 8h45m because the classifier matched a token the CLI never prints
(`F-33`); and the confirmation — not the assumption — that a supervisor-spawned loop with no console
DOES drive a Claude session through a headless ConPTY, which is the single risk `126/03`'s own Notes
named as unprovable by fixture.

**Lesson.** Milestone 59's `@manual` thesis, earning its keep on a milestone that had every reason to
feel finished. The pattern in all three is the same: fixtures carry a handful of rows and a
well-formed record, and the live system carries hundreds of stale rows and records that never wrote
the field the fixture assumes. **Refs:** `@finding-F-28`, `@finding-F-31`.

## R6 — `grep -c '^not ok '` reads a crash as a pass; the exit code is the signal

- **Kind:** mistake · **Area:** testing · **Stage:** verify · **Owner:** product-owner · **Raised by:** the first regression-gate row

**What happened.** A stated-reason edit to the directory ratchet landed inside a template literal and
its backticks terminated the string, so the file stopped parsing. I checked that lane with
`node scripts/test.mjs --only test/arch/testing/index.mjs | grep -c '^not ok '`, read **0**, and
called it green. The whole-tree gate then exited 1 enumerating no failure, and the milestone's first
`REGRESSION.md` row records a red nobody could read.

**Why.** A crash emits no TAP rows at all — no `ok` and no `not ok` — so a count of `not ok` is 0
whether the suite passed or never started. The check I used cannot distinguish the two outcomes it
exists to tell apart, and it fails in the reassuring direction.

**Lesson.** Read the **exit code**, and read the `ok` count beside the `not ok` count: `ok=0
notok=0` is a crash announcing itself. It is the same silent-false-pass shape this repository already
knows from running `node --test` directly on suites the runner owns, one level up — the instrument
was different, the failure mode identical. **Refs:** `@finding-F-35`.

