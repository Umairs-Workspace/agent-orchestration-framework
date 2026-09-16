---
type: story
doc: retrospective
number: 03
parent: 126
slug: the-supervisor-reconciles-a-supplied-set
title: "Retrospective — the supervisor reconciles a supplied set"
created: 2026-09-10
updated: 2026-09-10
---
# 126/03 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — When a contract-beat note and a delivered `.feature` disagree, the feature wins and the RESIDUE must be ratified, not left as a sentence that reads as done

- **Kind:** blocker · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** the builder, at the contract beat

**What happened.** ADR-006's contract-beat §4 ruled that the two seeded daemons are spawned with
`current_dir` set to the resolved install dir. Task 02's delivered `Examples` table says their
working directory is "not set — inherited, exactly as today", and its `one spawn site` scenario
requires the shell to set each child's working directory "from the child's own `cwd` and from
nowhere else" — which forbids the shell supplying an install-dir default. The two cannot both hold.
The build followed the `.feature`, because the `.feature` is the delivered acceptance criteria.

**Why.** The disagreement is invisible from either document alone: §4 states an intent about two
specific children, the table states a property of every child, and only reading them together shows
that the second forbids the first. Nothing in the toolchain compares an ADR note against a
scenario's Examples.

**Lesson.** The dangerous half is not the disagreement but the SENTENCE THAT SURVIVED IT: ADR-007's
own amendment then listed "126/03 pins the two seeded daemons' `current_dir`" among three reasons a
hazard was mitigated, and that reason is false. A mitigation cited across a story boundary must name
the delivered contract it rests on, not the intent that was recorded before it was built — otherwise
a live residue reads as discharged. **Refs:** `@finding-F-24`, `ARCHITECTURE.md#ADR-006`,
`ARCHITECTURE.md#ADR-007`.

## R2 — A register row that overstates where a literal lives describes an implementation weaker than the one it got

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** the builder, at the contract beat

**What happened.** `FF-12606` says the admitted `["work","loop"]` argv literal appears "in the Rust
tree twice" — the source roster (§8) and the runtime gate (§5). It appears ONCE, because §8's roster
is enforced in `test/arch/ui/acd-desktop-read-only-fleet.test.mjs`, a Node control, which the row's
own "enforced by" column states. The Rust tree holds the gate alone: `DECLARATION_ARGV_PREFIX` in
`supervision.rs`, read only by the parse in `status.rs`.

**Why.** The row was written from the ARGUMENT (there are two places this verb is admitted) rather
than from the TREE the sweep walks (one of the two is not in it). A tolerance stated as "two
occurrences are expected" is strictly weaker than what the implementation can assert.

**Lesson.** When a control tolerates N occurrences of a literal, check whether the tree it sweeps
really holds N — an over-count is a hole with a number on it. The delivered control asserts one
declaring file and one reader, which forbids a second occurrence rather than tolerating one, and
"a third cannot arrive silently" is satisfied more tightly than the row claims. **Refs:**
`@finding-F-25`.

## R3 — An allow-list and a deny-list cannot sweep the same subject, and the difference is the fixtures that prove them

- **Kind:** misunderstanding · **Area:** testing · **Stage:** build · **Owner:** architect · **Raised by:** the builder, at the contract beat

**What happened.** `36/acd-desktop-read-only-fleet` was extended from a deny-list of five mutation
verbs to an allow-list of exactly four spawnable verbs, in that control's own file. Two adjustments
were forced, both by the fixtures the new claim needs. The sweep had to strip `#[cfg(test)]`
modules, because the runtime gate's own cargo fixtures plant a `["work","tune","62"]` ROW to prove
the parse drops it — an allow-list over the whole file would red on the test that proves the
allow-list's point. And it had to sweep the argv-ARRAY form only, because an allow-list over the
joined-string form reds on the app's own UI copy (`"aof mesh desktop"` as a window tooltip,
`"mesh unreachable"` as a tray label, both reading as `<verb> <sub>` pairs and neither a spawn).

**Why.** A deny-list's claim is "this string never appears", which no fixture needs to violate. An
allow-list's claim is "every occurrence is on the roster", and the tests that prove a roster works
must contain occurrences that are not on it.

**Lesson.** Turning a deny-list into an allow-list is not a widening of the same sweep; it changes
what the sweep may look at. Narrow the subject deliberately (production source, argv-array form),
make the narrowing self-checking (each file asserted to carry at most one `#[cfg(test)]`, and for it
to be trailing, so the strip cannot swallow production code), and lean on the sibling control that
already forbids the escape — here `acd-desktop-trusted-spawn` forbids every shell-string spawn, which
is what makes the array-only sweep sound rather than convenient.

## R4 — The strongest proof that a boundary is not crossed is not to transport what must not be interpreted

- **Kind:** confirmed approach · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** the builder

**What happened.** A supplied declaration row carries `scope`, `level` and `cap`. The contract calls
them display-only and optional, and the drop table requires only that their absence not drop a row.
The build does not project them into the supervised child at all.

**Lesson.** "The supervisor interprets none of them" is a claim about behaviour that a reviewer must
check; "the supervisor never receives them" is a claim about shape that a control can assert. Here it
is what lets `FF-12606` assert the parse's gate reads exactly `id`, `argv`, `cwd` and `label`. A later
surface that wants to render a declaration's level reads it from the row in the view-model, not from a
field the supervisor holds.
