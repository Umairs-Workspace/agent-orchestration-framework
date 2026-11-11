---
doc: examples
---
# 147 · The loop hands a halt to a fresh session to fix, then resumes — example map
<!--
Drafted at refine's discovery beat, 2026-10-04. Struck before asking, because the record answers
them: what the repair session is handed (STORY Notes); that the loop resumes on the recorded
session choices (STORY Notes, 143); that the two known causes are also fixed at source (STORY
Notes). Measured: the three lane halts are `lane-open-failed`, `lane-merge-refused` and
`lane-merge-conflict` (engine.mjs LOOP_STOPS); the lane commit stages with `git add -A`
(mesh/worktrees.mjs). Settled with the operator the same day (Q1–Q4): the three lane halts only,
one repair per halt, on for every loop unless turned off, the two source fixes in this story.
-->

## R1 · A lane halt is handed to a fresh session to repair, unless repair is turned off
- E1 · `aof work loop 03`, merge-home of 03/03 conflicts on the milestone STATE.md (`lane-merge-conflict`): a repair session opens, handed the code, producer, Details line, loop-diag log path, lane worktree, branch, base and tip [stated Q1]
- E2 · A lane will not reopen (`lane-open-failed`, cause `assignment-gate-propagation-dirty-worktree`): a repair session opens with the same hand-over [stated Q1]
- E3 · `aof work loop 03 --no-repair` halts `lane-merge-conflict` at 03/03: the loop stops for the operator, exactly as today [stated Q3]
- E4 · `work.loop.repair: false` in the project config, the loop halts `lane-open-failed`: the loop stops for the operator [stated Q3]

## R2 · Any other halt still stops for the operator
- E5 · The loop reaches UAT session 32 (`uat-gate`): the loop stops, no repair session opens [stated Q1]
- E6 · The grade of 03/02's code stays red (`grade-indeterminate`): the loop stops, no repair session opens [stated Q1]

## R3 · One repair per halt, after which the loop resumes on its own or stops
- E7 · Loop started `--model continue=opus --thinking high`; the repair session ends done: the loop resumes 03 on the same model and effort, and nothing is typed [proposed]
- E8 · After one repair the loop resumes and 03/03 halts `lane-merge-conflict` again: the loop stops for the operator, naming the repair run [stated Q2]
- E9 · The repair session ends failed or cancelled: the loop stops with the original halt and the repair run's id [proposed]

## R4 · The two known causes no longer halt the loop
- E10 · A lane's session left `runs/.heartbeats.ndjson` written when its build ends: the lane commit does not stage it, and the lane cleans up and reopens [stated Q4]
- E11 · Two lanes in one wave each append build notes to the milestone STATE.md: merge-home brings both home with both notes kept, and the loop does not halt [stated Q4]

## Questions
- Q1 · business · answered · Which halts are handed to a repair session, and which still stop for the operator?
- Q2 · business · answered · How many repair attempts does one halt get before the loop stops for the operator?
- Q3 · business · answered · Is the repair session on for every loop, or does the operator turn it on?
- Q4 · business · answered · Are the two known causes fixed in this story, or in stories of their own?
- Q5 · technical · defaulted PLAN.md · Does the repair session run in the lane or in the primary checkout?
- Q6 · technical · defaulted PLAN.md · How is the repair session's own outcome recorded on the run?
- Q7 · technical · defaulted PLAN.md · Does the loop resume in its own process, or exit and be relaunched?
- Q8 · technical · defaulted PLAN.md · How does merge-home keep both lanes' STATE.md notes?
