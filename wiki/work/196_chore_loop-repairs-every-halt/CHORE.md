---
type: chore
number: 196
slug: loop-repairs-every-halt
title: "The loop repairs every halt but the operator's own, before it stops"
status: done
owner: developer
created: 2026-11-15
updated: 2026-11-15
depends: []
schema: 1
aofVersion: 0.1.0
---
# 196 · The loop repairs every halt but the operator's own, before it stops

## Intent

Loop 15 (project-sijil) halted `grade-indeterminate` / `report-vacuous` on 2026-11-14 with 0 of 2128
cases failing: the rubric exited 1 outside any case, and the halt waited on the operator to read a
diag log. 147 handed only the three lane stops to a repair session; the operator ruled the loop must
try its best to repair itself first and ask when a decision is theirs. This chore widens the repair to
every non-operator stop, lets a repair ask through the loop's ask wait, makes the grade halt explain an
exit veto, and fixes two faults chore 195 (052dc1df) left on the branch. The evidence is in
`~/.aof/mesh/logs/loop-diag.15.2026-11-14T15-58-10-676Z.log`.

## Definition of Done

- [x] `REPAIRABLE_STOPS` is every `LOOP_STOPS` member except `OPERATOR_STOPS` (`uat-gate`,
      `session-needs-input`, `operator-interrupt`, `retry-parked`, `deadline-exhausted`); `LANE_STOPS`
      keeps 147's three; `LOOP_STOPS` is unchanged (`packages/work-loop/test/work-loop-stop-set.suite.mjs`).
- [x] A repair session that asks waits in place through `awaitAnswer` and is re-driven with the answer
      and its hand-over (`--answer` + `--halt`); only a parked question stops the loop
      (`packages/work-loop/src/cycle.mjs` `repairLaneHalt`, `test/arch/loop/acd-loop-ask-waits-in-place.test.mjs`,
      `packages/work-loop/test/services.test.mjs`).
- [x] A grade halt is handed to a repair session, and a repair that ends done resumes the loop to a
      finished milestone with no notification (`test/loop/loop-command-wave.test.mjs`, 147/00 E6 widened).
- [x] `/aof:repair` (and the codex variant) covers the story stops: it fixes the cause in the lane,
      proves it with validate/doctor/`grade --run`, asks through `AskUserQuestion` one question per ask,
      and keeps 147's absolute rules; the four renders, the manifest and the lock are regenerated
      (`test/bundle/claude-settings-merge.test.mjs`, `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`).
- [x] An exit veto (`report-vacuous`, no failing case, non-zero exit) names the exit and the runner's
      output tail in `work:grade --run`'s detail and the loop's halt Details.
- [x] The at-capacity cleanup retry waits on a ref'd timer and retries only the current checkout's
      refused cleanups — the wave suite runs to its end instead of exiting 0 with no summary.
- [x] 195's stale tests are re-pinned: FF-5307's `runs.mjs` digest, and the retry ladder's answer
      re-driving `session-1` after a timeout retry resumed it (`test/loop/loop-command-stops.test.mjs`).
- [x] `aof work validate` is green (no regression)

## Notes

The work is already done, uncommitted on `fix/loop-recovery-and-work-renumber`. 147's delivered
`.feature` rule R2 ("any other halt still stops for the operator") is superseded here and left
untouched; its executable tests carry the widened rule. Focused runs, each over an isolated
`AOF_GLOBAL_HOME`: wave + work-loop 123/123, stops 78/78, touched arch and bundle 38/38, services 6/6,
grade-command 2/2. The whole tree was not run.
