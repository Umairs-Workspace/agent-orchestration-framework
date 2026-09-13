---
type: story
number: 02
slug: evidence-re-run
title: "Evidence re-run — the recorded proof is executed rather than read, and the oracle is the message"
parent: 59
status: done
owner: product-owner
created: 2026-08-29
updated: 2026-08-30
depends: [59/01]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-002, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-008, wiki/work/56_spike_gate-probe-feasibility/SPIKE.md, wiki/work/66_milestone_controls-that-run/ARCHITECTURE.md, src/work-doctor-controls.mjs, wiki/work/59_milestone_audit-loops/stories/01_story_the-instrument-census/STORY.md, test/arch/acd-oracle-is-a-message-not-a-count.test.mjs, wiki/work/66_milestone_controls-that-run/VERIFICATION.md]
files: [src/work-audit/evidence.mjs, scripts/drive-control.mjs, test/support/evidence-control-fixture.mjs, test/arch/acd-evidence-oracle-is-a-message.test.mjs, test/arch/acd-controls-never-execute.test.mjs, test/evidence-re-run.test.mjs, scripts/test.mjs]
---
# 02 · Evidence re-run

## User story

As the product owner who has to accept a milestone on evidence I did not gather,
I want the recorded evidence to be re-executed by something that did not write it, and judged on the
message it actually produces rather than on the prose beside it,
so that "this control is green, and here is the red probe that proved it has teeth" is a claim I can
have re-checked instead of a sentence written by the agent whose work it certifies.

This is the gap the milestone objective names on the record: ACD's evidence is written by the same
agents that did the work, and it has already produced the predicted failure — evidence subagents
authoring record docs and recording decisions no node was entitled to make. Reading the register more
carefully cannot close that. Only re-running it can.

Two constraints from spike 56 shape the whole story. The oracle **must diff the failure message, not
the pass/fail count**: nine of this repository's gates are standing red, and on a standing-red gate a
real break is invisible to a count. And the re-run must happen in a bounded child process, because
one milestone ago this repository froze the rule that the lane reading a control may never execute it.

## Tasks

- [x] `tasks/00_the-register-is-re-executed.feature` — every fitness row's control is resolved and run, and the recorded result is confirmed or contradicted from what the run produced
- [x] `tasks/01_the-oracle-is-the-message.feature` — a standing-red control is judged on its failure message, and no verdict is reachable from a pass/fail count
- [x] `tasks/02_evidence-that-cannot-run-says-so.feature` — an unresolvable, unregistered, or timed-out citation reports what was tried, naming the path and the deadline
- [x] `tasks/03_the-count-recorded-is-the-count-observed.feature` — a recorded case count that no longer matches the observed one is drift, reported against the item that recorded it

## Notes

- **This lane reads the register through one home and re-implements no grammar.** ADR-002 §2:
  `fitnessDeclarations`, `citedControlPathsIn` and `redProbeRows` already parse the register and are
  pure. This story imports them and does something different with the result. `work-doctor-controls.mjs`
  is **not** written by this story or by any story in this milestone.
- **Doctor still never executes, and this story is where that is re-asserted.** FF-5905 extends 66's
  own guard from this side: the controls lane reaches no child process and no clock, and no audit
  module is reachable from doctor's check registry. The boundary is the command, not a convention.
- **The verdict must be underivable from the prose.** FF-5906's sharpest leg: with the child result
  withheld, every row must report that it could not be run — never confirm what the register claims.
  A lane that can agree with its input without running anything has not re-run anything.
- **A contradiction is the valuable output, and it is expected on arrival.** TECH_DEBT 27 records ten
  suites red at HEAD with nothing saying so, and 59/01's re-arming may raise that. This lane is what
  turns each of those into a named finding against the item whose register still says GREEN.
- **The deadline is per control and is reported.** A control that exceeds it reports what was tried
  rather than being recorded as a failure of the control, because "slow" and "broken" are different
  findings and conflating them is how a flaky gate gets ledgered as a real one.
- **Tier 2 is available, never default.** Driving the remaining suites costs ~9 minutes (56's table).
  It runs behind an explicit scope; the default path stays the arch tree.
