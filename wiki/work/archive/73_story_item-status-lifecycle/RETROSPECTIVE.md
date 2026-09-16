---
type: story
doc: retrospective
number: 73
slug: item-status-lifecycle
title: "Retrospective — the item status lifecycle"
created: 2026-08-16
updated: 2026-08-16
---
# 73 · Retrospective

Lessons from assimilating already-delivered work. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

## R1 — A rule enforced only by prose in a prompt is not enforced

The status lifecycle existed as a written instruction in `src/bundle/commands/continue.md` for the
whole life of the framework, and the framework's own stream still carried items that read
`not-started` while they were being built. The instruction was correct, discoverable and ignored,
because it was filed as bookkeeping AFTER the process steps: an agent executes the process, then
reconciles the record on the way out, or forgets. **When a fact must be true every time, put it in a
seam a caller cannot reach around — and if it must stay in prose, make it a numbered STEP at the
moment it becomes true, never a trailing block.** The measure of the fix is not "the prompt now says
it better"; it is that four mint sites got the behaviour without being edited.

## R2 — A write-back with no write-forward is a no-op wearing a guard's clothes

`rollbackItemStatus` shipped in milestone 20 with a bounding fitness function, a behavioural suite,
and a declared reactor on `run.completed` — and it could never fire, because it refuses any
from-state that is not `in-progress` and nothing in the codebase could set `in-progress`. Every test
passed; the guard was inert for two months. **A transition guard is only as live as the transition
INTO its from-state. When adding a bounded writer, ask what writes the state it fires from — and if
the answer is "prose", the guard is decoration.** `acd-status-rollback-bounded` even asserted the
inertness as a virtue ("the ONLY item-status writer"), which is how a true statement became the bug's
best defence.

## R3 — A lifecycle modelled on one item type gets worked around

The first cut of the edge table required `in-review` before `done`, which reads perfectly for a story
and silently refuses acceptance for milestones, `uat` sessions, `spikes` and `chores` — none of which
is ever authored `in-review`. It was caught by walking the accept path of each type against the table
before shipping, not by a test. **Enumerate every type that will pass through a new state machine and
walk each one end-to-end. A model that fits the type you had in mind is the normal way this fails.**
The rule that survived is the one worth having (`done` unreachable from `not-started`/`blocked`), and
the type-specific gate moved to the surface that knows the type.

## R4 — "Where does this fact live" is answered by what already spells it

`ITEM_STATUS_EDGES` began in `work.mjs`, beside its writer, which felt right and was wrong: the
table's KEYS are the five frozen status words, so declaring it there was a second spelling of a
vocabulary that has one home — and it turned `acd-acceptance-horizon-single-predicate` red on arrival.
**A new structure's home is not where its caller lives; it is where the vocabulary it is made of
already lives.** The fitness function found this, which is the system working — but only because a
previous milestone had paid to make the vocabulary single-homed in the first place.

## R5 — Changing a test's expectation can silently retire a delivered acceptance criterion

Two lanes needed updating because one command now reclaims AND mints. In
`run-status-rollback.test.mjs` the fix was faithful — drive the scan the scenario's own `When` names,
assert the intermediate, then assert the composite — and the lane came out STRONGER. In
`run-resilience-acceptance.test.mjs` the same instinct produced a lane asserting the OPPOSITE of the
clause it evidences (F-73-M), because that lane is CLI-level and the intermediate is no longer
observable from outside the command. **When a change makes an accepted criterion's evidence
ambiguous, fix the evidence at the level the scenario speaks at; if that level can no longer see it,
say so as a finding rather than flipping the assertion.** A delivered `.feature` is immutable, so the
only honest moves are stronger evidence or a recorded gap.

## R6 — A review by the author is not a review

Every finding worth having in this item came from the two spawned lanes, and several were things the
author had written down as fact: the wrong mechanism for the remote path (F-73-F), the `statusFrom`
key collision with an established meaning (F-73-E), and the assertion-vs-clause gaps (F-73-J/K/L).
The author had verified the change end-to-end through the real CLI and still believed a false
statement about it. **Independent review earns its cost precisely where the author is most
confident.** Both lanes also independently re-attributed the pre-existing reds instead of accepting
the author's attribution, and QA measured a wider arch surface than the author had — 1072 tests
against 247.

## R7 — In a shared working tree, "the change set" needs naming, not inferring

The pending tree held two unrelated bodies of work, so an unscoped `--pending` assimilation would
have derived acceptance criteria for someone else's story and reviewed code this change never
touched. Naming the in-scope and out-of-scope paths up front kept both lanes honest — and the
out-of-scope reading still paid off, surfacing a HIGH-severity `ReferenceError` in the co-resident
change (F-73-P). **Scope a reverse-governance pass by explicit path list whenever the tree is
shared, and let a reviewer READ outside that list even when it may not review there.**
