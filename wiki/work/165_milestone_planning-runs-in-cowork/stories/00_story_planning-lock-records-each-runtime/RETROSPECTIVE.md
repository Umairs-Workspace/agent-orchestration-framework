---
doc: retrospective
promotionFrom: 1
---
# 165/00 · The planning lock records each runtime — retrospective

## R1 · The declared write set missed the command face whose help text the build changed

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (STATE feedback) · **Promoted to:** none

**What happened:** The build rewrote the `--force` help text in
`packages/core/src/commands/planning-init.mjs` ("re-pin and re-install the named runtime over its
recorded planning entry"). That file was in `reads:`, but not in `files:`. 165/03's importer sweep
later found the second half: `test/fixtures/application/command-inventory.json` snapshots the
usage and flag text, so it changes whenever that text does.

**Why:** The plan listed the core module whose behaviour changed. It did not list the face that
describes the behaviour, or the fixture that snapshots that description.

**Lesson:** A story that changes what a CLI flag means lists the command face and
`command-inventory.json` in `files:`, so the wave planner and the story lane both see them.

**Refs:** ../../STATE.md Feedback (165/00, 165/03).

## R2 · The story-scoped test run widened to the whole tree with every declared path present

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (STATE feedback) · **Recurs:** 160/02/R1 · **Promoted to:** none

**What happened:** `aof test --scope impacted --story 165/00` started `scripts/test.mjs` with no
selection, which is the whole tree, even though every path in `files:` existed. It ran for 10
minutes with no output before it was stopped. The story was gated with `scripts/test.mjs --only`
over its five suites instead.

**Why:** The impacted selector widens to the whole tree for reasons it does not print, so the
lane cannot tell a widening from a hang.

**Lesson:** Until the selector names why it widened, a story lane reads the selector's summary
line before waiting on the run. If the summary says the whole tree, it stops and gates with
`--only` over the declared suites.

**Refs:** ../../STATE.md Feedback (165/00).
