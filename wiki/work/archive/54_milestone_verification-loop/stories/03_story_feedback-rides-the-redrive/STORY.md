---
type: story
number: 03
slug: feedback-rides-the-redrive
title: "Feedback rides the re-drive — the findings stop being dropped, and cap-exhaustion carries the record"
parent: 54
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-23
depends: [54/01, 54/02]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · Feedback rides the re-drive

## User story

As a maker being re-driven after a red gate,
I want the grade's record handed to me — which cases failed and what they said,
so that my second attempt starts from what went wrong instead of rediscovering it, and so a loop
that exhausts its cap leaves behind a record of what it could not close rather than a bare stop.

<!-- Measured at refine: the pure engine ALREADY computes the right decision — `work-loop.mjs:340`
     returns `drive(ref, "continue", cycle+1, {findings})` — and the shell dropped it three times
     over. ~~`commands/loop.mjs` bare-`continue`s past the payload~~ — CORRECTED at contract time
     (2026-08-22): **70/04 landed on this branch** (`54ff074`) and that drop is closed; `:614-623`
     now sets `pendingFixes` and `drivePhase` hands it over as `ctx.loopDrive.fix`. What remains is
     54's own half: nothing puts the GRADE on that payload, no run brief records it, and
     `:494`'s `cap-exhausted` site still hardcodes `findings: []`. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-record-reaches-the-redrive.feature` — a `fail` verdict re-drives `continue` with the grade riding `brief.grade` through the transition seam that already writes `brief.loop`; the bare `continue` stops dropping it
- [x] `tasks/01_the-driven-row-carries-the-grade.feature` — `drivenRow()` gains the verdict, the code list and the observed counts, while `LoopState`'s ten top-level keys and `act`'s whitelist stay **exactly** as they are
- [x] `tasks/02_cap-exhaustion-carries-the-record.feature` — the hardcoded `findings: []` becomes the real accumulated record, the union over the loop's own runs keyed by `loopRunId`; the halt carries the final record because the exhausted cycle has no successor run to ride
- [x] `tasks/03_only-fail-redrives.feature` — `pass` crosses to verify, `fail` re-drives up to `cap`, `indeterminate` halts on `grade-indeterminate`, and `rubric-unconfigured` proceeds exactly as today

## Notes

- **54 supplies the records; 70 carries them.** `70/04` owns the fix respawn *"carrying the findings
  as its message"* and `70/00` owns `drive.mjs`'s payload seam. This story builds **no second
  transport**, widens no driver input schema, and coins no third meaning for `brief` (`70/ADR-001`
  named that collision). Where 70 has not landed, 54's records are still complete and reported — they
  reach the next session when 70's seam does.
- **The declared cross-milestone overlap RESOLVED, and it resolved in 54's favour.** This story and
  **70/04** both edit `src/commands/loop.mjs`. At break-down 70 was `in-progress` with every story
  `not-started`; **at contract time 70/04's code had landed** (`54ff074`, *"Warm the review fix
  loop"*), so the rule the break-down wrote — *whichever lands second rebases rather than
  re-derives* — now binds **this story**, and there is nothing to negotiate: 70 built the transport
  (`pendingFixes` → `ctx.loopDrive.fix` → `composeFixInput`'s `## REVIEW FINDINGS`) that ADR-008 §5
  said 54 must not duplicate. **54 supplies the records; 70 carries them** — literally, now. STATE
  records why the overlap was named rather than left to be found: two stories an architect had
  partitioned as independent both edited one file, ×9 and ×8.
- **No persistence code at all.** `src/run-store.mjs` (46 dependents) and
  `src/effects/run-transitions.mjs` (17) are passed **through**, not edited — the run store never
  reads the grade and never branches on it, so it gains no key, no state and no transition.
  `68/ADR-009`'s rule (the run fact goes through the transition seam) and `53/ADR-004`'s "no new
  persistence code" both kept.
- **`LoopState` is not widened.** Its key set is a frozen exact ten-key deep-equal, and 62, 63 and 78
  consume it. The grade rides the `driven` row instead — the one place in the frozen document that is
  per-drive, additive, and pinned by no test (re-measured at HEAD: every assertion on `state.driven`
  is either an empty deep-equal or a projection).
- **Sequenced last**, behind 54/01 (which produces the record) and 54/02 (which reorders the gate it
  threads the record through).
