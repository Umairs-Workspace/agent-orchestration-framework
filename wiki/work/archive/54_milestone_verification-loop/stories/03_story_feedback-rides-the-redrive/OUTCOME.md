# 03 · Feedback rides the re-drive — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The verdict decides the act
`gradeRoute()` is the single derivation from a grade to a loop act — `pass` proceeds, `fail`
re-drives, `indeterminate` halts, and `rubric-unconfigured` is the one named exception that proceeds
as today. The routing reads the record's **verdict**; a `fail` carrying no failures re-drives and an
`indeterminate` carrying no codes halts, neither of which depends on the record having detail.

### The grade rides the run it re-drove
`brief.grade` is written through the same transition seam that already writes `brief.loop`, so a
`fail` verdict's record lands durably on the run record of the re-drive it caused, and the failures
reach the next session through `70/04`'s existing `pendingFixes` → `ctx.loopDrive.fix` →
`## REVIEW FINDINGS` transport. No second transport exists.

### The driven row carries the grade
`drivenRow()` emits the verdict, the code list and the observed case counts per drive, attributed by
run id rather than by position. `LoopState`'s ten top-level keys and `actShape()`'s whitelist are
byte-for-byte what they were.

### A cap-exhausted halt reports what it could not close
Both cap-exhausted sites — the gate-decision halt and the pre-drive `loop-cycle-cap` halt — report
`accumulatedRecord()`, the union of the grades carried by the loop's own runs keyed by `loopRunId`,
with the exhausting cycle's grade carried inline because it has no successor run to ride.

### The union survives a retried build attempt
`accumulatedRecord()` contributes one entry per distinct grade: a run whose `retryOf` lineage already
contributed the same `gradedAt` is skipped, so a cycle whose build attempt was retried is counted
once rather than twice.

### An unconfigured repository is byte-identical
With no `work.rubric` declared, the loop's `LoopState`, every report line, every driver input, the
driver's spawn argv and every run record are indistinguishable from the pre-54 shell — measured by
neutralising the whole grade path and diffing full observable traces, not asserted.

### FF-5409's second clause is armed
`acd-loop-probe-contract` now drives a real loop to a `grade-indeterminate` halt and asserts the stop
and its producer before the key-set shape it guards, and has been observed failing against two
planted defects.

## Assumptions

- **`70/04`'s transport is the only carrier** — the failures reach a re-driven session because
  `composeFixInput` renders `ctx.loopDrive.fix`; where that seam is absent the records are still
  complete and reported, but nothing hands them to the next maker.
- **The grade rides the `driven` row because `LoopState` is frozen** — 62, 63 and 78 consume its
  exact ten-key shape, so any future grade fact has the same one place to go.
- **No persistence code participates** — `src/run-store.mjs` and `src/effects/run-transitions.mjs`
  are passed through, so the run store neither reads the grade nor branches on it.
- **The blocking rubric spawn is survivable at this repository's rubric runtime** — measured at
  116 s against a 900 s heartbeat window (7.8×); the delivery rests on that margin, not on the
  spawn being non-blocking.

## Gaps

### The resume path never walks rung 3
- **Status:** open
- **Discharge condition:** the resume block rebuilds `pendingFixes` with a `grade` key, or the
  absence is declared in `LoopState`'s contract for its three consumers.
`brief.grade` is therefore not always present on a re-driven run: a loop resumed from a parked or
stranded run re-drives with no grade on its brief, and 62, 63 and 78 consume `LoopState` without
being told the key is conditional.

### The grade's failures are bounded only at the human render
- **Status:** open
- **Discharge condition:** the payload is bounded in the writer, as `70/ADR-003` bounds the phase
  brief.
`commands/grade.mjs` slices to 20 for its operator line, and the three seams this story opened —
`brief.grade` on every re-driven run record, `findings=<JSON>` on the cap-exhausted report line, and
`composeFixInput`'s `## REVIEW FINDINGS` — each carry the record whole.

### The transport bag carries more than the transport needs
- **Status:** open
- **Discharge condition:** a separate grade map keyed by ref, leaving `pendingFixes` exactly `70`'s
  shape.
`pendingFixes` carries the whole `GradeRecord` into `ctx.loopDrive.fix`; `composeFixInput`
destructures only `findings` and `changeUnderReview` and the registered input schema is unchanged, so
`70/ADR-009` §3 holds in letter while the bag holds a second milestone's document.

### The cost ladder's short-circuit governs decision order, not cost
- **Status:** discharged
- **Discharge condition:** ADR-007 §1 amended, or the invocation moved behind rung 2.
`work:grade --run` is invoked once per completed build, ahead of rung 1, so a red `work:validate` has
already paid for the runner. **Discharged by amendment** at 54/03's review: ADR-007 §1 now states
that the short-circuit governs the decision order and that rung 3's answer is taken once per
completed build, and `test/loop-gate-cost-ladder.test.mjs` asserts that rule over a *configured*
fixture rather than an unconfigured one that could not observe a spawn at all.
