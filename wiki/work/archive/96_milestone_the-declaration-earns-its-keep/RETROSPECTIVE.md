---
type: milestone
doc: retrospective
number: 96
slug: the-declaration-earns-its-keep
title: "Retrospective — the declaration earns its keep"
created: 2026-09-04
updated: 2026-09-04
---
# 96 · Retrospective

Lessons from delivering and accepting the milestone. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson. Findings are **referenced**, never restated:
they live in `VERIFICATION.md`.

## R1 — A bundle change is not delivered until it is INSTALLED, and nothing in the loop installs it

- **Kind:** blind spot · **Area:** delivery · **Stage:** build + verify · **Owner:** the phase commands · **Raised by:** the accept oracle reading zero (`@finding-F-96-C`)

Story 00's whole deliverable is that a phase command mints a run record. Its code was green, its
suites drove the mint end to end, and the mechanism had **never once executed**. The installed
`.claude/commands/aof/continue.md` had not been refreshed since `2026-08-06` and differed from its
source by 1,012 diff lines — it predated story 00 entirely.

**Why.** For every other kind of change, editing the source IS shipping it: a module under `src/` is
what runs. A bundle document is not. The prompt that runs is the *rendered, installed copy*, and the
gap between "the source says so" and "the agent reads it" is invisible to the suite, to `validate`,
to `doctor` and to review — every one of which reads the source.

**Lesson.** A story whose deliverable is a bundle document is not done at green; it is done at
**installed and executed once**. Two mechanical consequences worth taking: the story's own `@manual`
lane should run `aof work update` and then drive the changed prompt, and this milestone's own gate
question — "has the mechanism ever actually run?" — belongs on every bundle-surface story, not just
this one. This is the same shape as 96/03's close note about the graph rebuild: a delivered mechanism
whose benefit is gated on a step nobody runs.

## R2 — Prose in a bundle document is CONTRACT SURFACE, and one story broke three controls editing it

- **Kind:** blind spot · **Area:** contract · **Stage:** build · **Owner:** developer + reviewer · **Raised by:** the milestone gate, three separate reds

96/00 rewrote sentences in `src/bundle/commands/continue.md` and broke, without touching a line of
code: `acd-status-flag-on-starting-moves-only` (it spelled a full `aof work status … in-progress`
invocation inside a sentence FORBIDDING that move), `FF-7102 (b)` (it renamed the design step's
closing sentinel `**Mark it reviewed**`), and `span/21`+`span/22` (it rewrote the pinned sentence
`Do not move the MILESTONE's status, and never accept it`). Three controls, one story, all prose.

**Why.** Several shipped controls pin exact phrases in bundle prose, because prose is what an agent
executes and there is nothing else to pin. An author editing that prose is editing assertions, and
nothing about the editing experience says so. Worse, the controls are whole-tree: a story-scoped lane
cannot see any of them.

**Lesson.** Treat a bundle document as a file with tests. Before editing one, grep `test/arch/` for
its path — all three of these name `src/bundle/` explicitly and would have been found in one search.
And prefer a rewording that keeps a pinned phrase verbatim over one that moves it: all three repairs
here were single sentences that kept the control at full strength, which is strictly better than the
alternative of relaxing an assertion to accommodate a paraphrase.

## R3 — Two shipped controls can DIRECTLY CONTRADICT each other, and nothing detects it

- **Kind:** design gap · **Area:** controls · **Stage:** whole-tree gate · **Owner:** architect · **Raised by:** chore 116's red (`@finding-F-96-E`)

78/FF-7802 asserts that `src/loop-record-render.mjs` **must import** `KIND_SHAPES` from
`./commands/loops-graph.mjs`. m42 wave (d)'s `acd-command-layer-imports-downward` asserts that **no**
src-root module may import `src/commands/*`. Both are right on their own terms, and neither could be
satisfied while the table sat inside the command. The tree simply held a permanent red.

**Why.** Each control was authored by a milestone reasoning about its own subject. FF-7802's concern
is "one glyph table, imported not copied"; m42's is "the command layer is a leaf". Neither author had
reason to read the other's file, and no check asks whether two controls are jointly satisfiable.

**Lesson.** A control that REQUIRES a specific import is a much stronger claim than one that forbids a
shape, and it should name the module it requires the import *from* as a decision, not as an incidental
path — because the day that module has to move, the control moves with it. The cure was m42's own
documented one (move the shared thing below `commands/`), and the repointed FF-7802 keeps both of its
claims. Carry the general form: **when a control pins a path, it inherits every architectural rule
about that path.**

## R4 — A gate that can be KILLED will record a partial run as a complete one

- **Kind:** defect · **Area:** the gate itself · **Stage:** verify · **Owner:** 96/04 · **Raised by:** using the gate (`@finding-F-96-G`)

Five of this milestone's six gate runs were killed by a `work.test.deadlineMs` shorter than the suite
they governed, and every one was written into `REGRESSION.md` as an ordinary `red` with a partial
failure list. The lists shrank and shifted between runs, which read as flakiness and was not.

**Why.** The row records what the run *said*, and a killed run says something perfectly well-formed:
a non-zero exit and whatever failures were parsed before the axe fell. Nothing in the shape
distinguishes "the suite ran and these failed" from "the suite was stopped and these had failed so
far". The door's safety was never at risk — `green` requires a zero exit and an empty failure list —
so the defect is in the EVIDENCE, which is the entire purpose of the artifact.

**Lesson.** Any record that exists to be read later as evidence must state **whether the thing it
reports on finished**. Completion is a fact about the run, not a property that can be inferred from
its findings. Generalises past this gate to every captured-run artifact in the stream.

## R5 — Diagnosing "flaky" before diagnosing "truncated" cost two full gate runs

- **Kind:** mistake · **Area:** diagnosis · **Stage:** verify · **Owner:** the accepting session · **Raised by:** the same session, later

A gate row named one failure that passed standalone every time. That was read as a flaky test, and the
gate was re-run to see whether it recurred. It did not recur — because the *next* run was truncated at
a different point. Two ~15-minute runs were spent on that reading before the deadline was measured.

**Why.** "Passes standalone, fails in the suite" is a real and common signature, so it was a plausible
first hypothesis. What made it the wrong one was available and unread: the runs were finishing far
faster than a direct `node scripts/test.mjs`, which is the tell that they were not finishing at all.

**Lesson.** When a long run reports fewer failures than expected, **check that it completed before
interpreting what it found**. Duration against a known-good baseline is the cheapest possible check
and it was skipped. A missing failure and a truncated run look identical in the output; only the clock
tells them apart.

## R6 — Time-based synchronisation in a test only fails where it costs the most

- **Kind:** defect · **Area:** tests · **Stage:** whole-tree gate · **Owner:** the test's own milestone · **Raised by:** the gate (`@finding-F-96-H`)

Two rows in `mesh-coordination-launcher` fired an async ticker and slept a flat `25ms` before
asserting. Both passed standalone on an idle machine every single time, and both went red inside a
30-minute whole-tree run with the suite's own load on the box.

**Lesson.** A fixed sleep is a synchronisation primitive made of a guess about how fast the machine
is, and the guess is always made on an idle one. Wait for the assertion's own predicate instead: it
returns the instant the condition holds, so the fast path costs nothing, and it fails naming what
never became true. This class of bug is *specifically* invisible to a story-scoped lane, because the
load that breaks it only exists in the whole-tree run.

## R7 — A whole-tree gate makes the accepting milestone inherit every latent red in the repository

- **Kind:** design gap · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** five non-96 reds blocking 96's accept

96 met five reds it did not cause: two stale controls, and two subjects already ledgered as chores 114
and 116 *precisely so they would not be done here*. A whole-tree gate is all-or-nothing, so the
accepting milestone must either fix them, or spend `--gate-override`, or not accept.

**Why.** The gate's value is exactly that it refuses to look away — that is why it caught everything
in R2, R3 and R6. But the same property means a milestone's accept is coupled to the health of code it
never touched, and the ledger (a chore) has no way to say "known, scheduled, not yours".

**Lesson.** This needs a decision before it becomes precedent, and it is recorded as an open gap in
`OUTCOME.md` rather than resolved here. The two honest candidates: let a gate stand while a red belongs
to an open ledgered item the accepting milestone does not touch, or accept that the gate is a
whole-repository health bar and that every milestone pays to keep it green. Fixing all five *once* was
right; fixing all five *every time* is an unbounded obligation on whoever accepts next.

## R8 — A red probe against an unresolvable import proves nothing, silently

- **Kind:** mistake · **Area:** controls · **Stage:** verify · **Owner:** the accepting session · **Raised by:** discharging FF-9602 (`@finding-F-96-F`)

A red probe planted `import { workDir } from "./work-paths.mjs";` — a module that does not exist.
`scripts/test.mjs` imports the tree eagerly, so the runner died at link time and printed neither `ok`
nor `not ok`. Read naively, "zero failures" is a green control over a probe that never ran.

**Lesson.** A probe harness must assert that the run **actually ran** — a non-zero exit with zero
`not ok` lines is a crashed runner, not a passing control. Same root as R4, at a different scale: an
absent result and a negative result are not the same fact, and nothing distinguishes them unless
something is built to.

## R9 — The declaration decided a contract-versus-code dispute, and that is the mechanism working

- **Kind:** confirmed approach · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** 96/00 task 01

A Scenario Outline titled "the reactor's own table, unchanged" stated `| blocked | blocked |`, and the
reactor actually moves `blocked → in-progress`. The row could not be satisfied without narrowing a
shared spine seam — and `src/effects/table.mjs` was in 96/00's `reads:`, **not** its `files:`. The
declaration settled which of the two was wrong, with nobody arguing from taste.

**Lesson.** Worth carrying as evidence FOR the read/write contract beyond its cost argument: an
accurate write set is also an arbiter. When a contract and a code path disagree, "am I allowed to
write this file?" is a sharper question than "which one is right?", and it has an answer. The
secondary lesson is R1's cousin: an Examples table claiming to restate shipped behaviour is a
transcription, and nothing read the reactor when the row was written.

## R10 — The derived set is delivered and its benefit is gated on a graph rebuild nobody runs

- **Kind:** design gap · **Area:** derivation · **Stage:** build · **Owner:** 96/01 · **Raised by:** 96/03's close, measured

Measured against this repository's real graph artifact: 96/02's declaration widened on 5 of 9 paths
and 96/03's on 4 of 6, every one under `not-in-graph` — because the graph was built before those files
existed. ADR-007 §3 predicts this and is right that it is safe (correct-but-slow, every widening
named). What it does not say is that the headline saving therefore **does not arrive** until something
rebuilds the graph, and nothing in the build or review lane does.

**Lesson.** When a mechanism's benefit depends on a derived artifact, ship the thing that refreshes it
or ship the message that tells the operator to — "widened on N declared paths; `aof graph build .`
would narrow this" costs one line and converts an invisible non-benefit into a choice. Recorded in
`OUTCOME.md` `## Assumptions` rather than left implicit. Same family as R1.
