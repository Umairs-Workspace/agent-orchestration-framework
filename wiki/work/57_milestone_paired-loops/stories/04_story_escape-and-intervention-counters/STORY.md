---
type: story
number: 04
slug: escape-and-intervention-counters
title: "Escape and intervention — the other two optimizing loops get counters, from records that already exist"
parent: 57
status: done
owner: product-owner
created: 2026-08-27
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
# 04 · Escape and intervention counters

## User story

As an operator who now has a gate demanding that every optimizing loop be watched,
I want the other two optimizing loops — review-fix-rereview and the autonomous cascade — paired with
numbers that code produces from records this system already writes,
so that satisfying the gate means installing a real counter rather than appointing a judge, and the
milestone's own rule that counters beat judges holds for the milestone's own pairing table.

Three loops declare `optimizing: true` and none is watched (measured 2026-08-27). 57/03 builds the
build loop's counter. This story builds the other two, and it builds them the cheap way, because both
quantities are already sitting in records nobody is reading them out of:

**Finding escape** pairs the review loop. A review loop optimises *open findings toward zero*; its
counter-metric is findings that reached zero and came back — a finding recorded against an item after
its review completed. Feedback records (`FEEDBACK.ndjson`, `src/feedback-records.mjs:9`) carry an
`at` timestamp per entry, and the item's own record carries when it was accepted. The subtraction is
the counter.

**Intervention** pairs the autonomous cascade. A cascade optimises *items reaching done without a
human*; its counter-metric is how often a human or a retry was needed. Run records already carry
`attempt`, `retryOf`, `state`, `outcome` and `failureReason` (`src/run-store.mjs:506-530`) — the
retry lineage milestone 20 shipped. Counting it is arithmetic over data on disk.

## Tasks

- [x] `tasks/00_a-finding-that-escaped-the-review.feature` — a finding recorded after the item was accepted is an escape, and the counter names the item it escaped from
- [x] `tasks/01_the-cascade-that-needed-a-hand.feature` — retries, exhausted attempts and operator resumes are interventions, counted from the run records that already carry them
- [x] `tasks/02_absent-data-is-not-a-good-score.feature` — a counter with nothing to count reports that it cannot measure, and never reports zero

## Notes

- **Task 02 is the one that keeps these counters honest, and it is not a defensive extra.** A counter
  that reports `0` when it has no data reports a *perfect score* for a loop nobody has measured —
  which is worse than silence, because the pairing gate would then be satisfied by an instrument that
  has never observed anything. 52/ADR-002 froze `unknown` and `none` as first-class and mutually
  distinct for exactly this reason; these counters inherit that distinction.
- **Nothing is instrumented and nothing new is written to disk.** Both counters are readers over
  records milestone 20 and the feedback path already produce. If a quantity is not already recorded,
  this story reports that it is not measurable rather than adding a write — adding writes to make a
  counter possible is 68's territory, and it is `done`.
- **Escape is defined against acceptance, not against the review phase's end.** An item can leave
  review and re-enter it; what makes a finding an *escape* is that it arrived after the item was
  accepted as finished. That is a single, unambiguous moment on the record.
- **Both counters are deterministic, so both watchers declare it.** ADR-002 §5 then requires their
  measurement to be pointer-backed, which is what makes 57/05 able to declare `determinism: counter`
  for both without lying.
- **Both files are new, with zero dependents.** ADR-007 §7. This story may land in any order relative
  to everything except 57/05, which cites its command.
