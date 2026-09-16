---
type: story
number: 00
slug: the-anchor-taxonomy
title: "The anchor taxonomy — a node class for contact with reality, widened into two frozen enums that delete nothing"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The anchor taxonomy — a node class for contact with reality

## User story

As the framework's architect, holding a loop registry whose only notion of ground is "a human said
so",
I want the kinds of measurement that **cannot be argued with** — an observed process exit, the build
stamp on the running binary, a landed commit, a live-soak observation, a frozen rule — declarable as
first-class nodes with the class named on each,
so that "is this loop grounded" stops meaning "is it reachable from the operator" and starts meaning
"does anything here touch the world".

Today `GROUND_VALUES` is a set of one — `frozenSet("exogenous")` (`src/work-loops.mjs:91`) — and
`ground:` is admitted only on `kind: actor` (`:78`). The day-one registry's honest consequence is
that everything reachable from `actor:operator` reports `grounded-exogenous-only`, which milestone 52
deliberately made a **warn and not a pass** because exogenous is the weakest ground there is. This
story supplies the stronger classes 52 pre-authorised by name.

It is the vocabulary story, and it is deliberately small in code and large in care: two frozen enums
widen, one node kind is added, and **every one of the nine records milestone 52 delivered must parse
byte-unchanged**. A widening that invalidates a delivered record is not a widening.

## Tasks

- [x] `tasks/00_the-taxonomy-widens.feature` — the two closed enums gain their new members, a `kind: anchor` node parses, and every 52-era record still parses with no new finding
- [x] `tasks/01_ground-never-on-a-loop.feature` — `ground:` on a `kind: loop` node is refused whatever its value, and an anchor whose `observes:` is prose or unknown is refused too
- [x] `tasks/02_the-day-one-anchors.feature` — the framework's own anchors are declared from evidence, delivered through the bundle, and none is fabricated to improve a score

## Notes

- **52 pre-authorised this in writing, twice.** `52/ADR-002` — *"CLOSED set (52). 55 may ADD members;
  it may not remove one."* `52/ADR-005 §4` — 55 *"widens the `ground:` value enum …, widens the
  `kind:` enum if it wants anchor nodes, and adds provenance keys"*, with every 52-era record staying
  valid verbatim. This story is the discharge of both, and it needs no superseding ADR.
- **The one rule that does not widen is the host.** `ground:` gains five values and stays off
  `kind: loop` forever. A loop asserting its own ground is the circular claim the grounding check
  exists to detect — `52/ADR-005`'s words, and the reason `FF-5501` has a leg for it.
- **`observes:` is the one field in the whole registry where `prose:` is not admitted.** Everywhere
  else a paragraph is an honest declared gap. An anchor backed by a paragraph is an anchor that
  anchors nothing, and it would let the registry's own honesty measurement read prose as contact with
  reality. ADR-001 §5.
- **The day-one anchor set carries 52's discipline forward.** `52/ADR-005 §Consequences` warned story
  authors off *"declaring an operator edge to every loop just to clear the check — a fabricated edge
  is the same failure as a fabricated owner"*. The same warning applies with more force here, because
  milestone 55 puts L3 behind the result. Declare what the evidence supports; leave the rest reported
  as absent.
- **Parallel-eligible from day one.** `src/work-loops.mjs` has 18 dependents of which **three** are
  production — the `loops-*` commands, all read-only against this change (`aof graph impact`,
  2026-08-26). No other story in this milestone writes it, and `src/work.mjs` is untouched.
- **The schema literals this story lands are frozen in ADR-001 §2/§5.** 55/01 codes against those
  literals in parallel without waiting for this story to merge — 52's own practice, where the
  day-one registry was authored alongside the code that read it.
