---
doc: examples
---
# 149 · Manual mode: continue guides the operator who builds the work themselves — example map
<!--
Drafted at refine's discovery beat, 2026-10-04. Struck because the record answers them: the session
writes no code and spawns no builder; `--manual` contradicts `--solo` and `--orchestrated`; the loop
never composes it (all STORY Notes). Measured: the loop's continue mode admits only solo and
orchestrated (loop-bounds.mjs); the CLI door decides only WHERE a continue runs. Settled with the
operator the same day (Q1–Q5, Q9, Q10).
-->

## R1 · A manual continue starts the story and hands the operator a guide, building nothing
- E1 · `aof:continue 149 --manual` on a refined story with its scenarios red: no aof-developer is spawned, no file outside the item folder is written, and the guide is printed [proposed]
- E2 · Story 147 (five tasks, seventeen `reads:`, twenty-nine `files:`): the guide gives the user story, each task file with its scenario names, every `reads:` and `files:` entry with one line on why it matters, the test files and the command that gates them, and an order to take the five tasks in [proposed]
- E3 · Story 149 at `not-started`, `aof:continue 149 --manual`: the story moves to `in-progress` [stated Q1]
- E4 · Re-run with 2 of 14 scenarios red: the guide is printed again in the terminal, headed by the 2 red scenarios, and nothing is written to the story folder [stated Q3]

## R2 · Manual is one story, here, at every door
- E5 · `aof:continue 149 --manual --solo`: stopped as contradictory before any role runs or any run is minted [proposed]
- E6 · `aof:continue 148 --manual` on a milestone: refused, naming its ready stories to take one at a time [stated Q4]
- E7 · `aof work continue 149 --manual`: answers "Continue \"149\" here — run: /aof:continue 149 --manual" [stated Q5]
- E8 · `aof work continue 149 --manual --node node-2976`: refused, because a worker cannot be the operator [stated Q5]

## R3 · aof:review reviews the operator's build, and fixes nothing
- E9 · `aof:review 149` with every scenario green: the gate ladder runs, then the architect and QA review the diff, the findings go to the operator, and a clean review moves 149 to `in-review` [stated Q2]
- E10 · `aof:review 149` with 2 of 14 scenarios red: stopped before any reviewer runs, naming the 2 red scenarios [proposed]
- E11 · `aof:review 149` raises a Blocker: no agent edits the code, 149 stays `in-progress`, and the Blocker is reported with its file and line [proposed]

## R4 · aof:code-review is removed, with the shipping it existed for
- E12 · `aof work update --dry-run --json` in a repo that rendered aof:code-review: its three renders are reported `delete`, and the bundle lists `commands/review.md` [stated Q9]
- E13 · `aof:autonomous 140-142 --ship`: the command takes no `--ship` and names no `work.codeReview.autoComplete` [stated Q10]

## Questions
- Q1 · business · answered · Does taking a story with --manual move it to in progress on the board?
- Q2 · business · answered · Once the operator's build is done, how does review run?
- Q3 · business · answered · Is the guide printed in the terminal only, or also saved in the story folder?
- Q4 · business · answered · Does --manual work on a milestone or a span, or on a single story only?
- Q5 · business · answered · Does the CLI door (and so the board) take --manual too?
- Q6 · technical · defaulted PLAN.md · Is the guide composed by the prompt, or by a new CLI verb?
- Q7 · technical · defaulted PLAN.md · Is manual a per-run flag only, or also a `work.agents.mode` value?
- Q8 · technical · defaulted PLAN.md · How do the guide and aof:review find which scenarios are red?
- Q9 · business · answered · Is aof:code-review removed now, or left as a stub pointing at aof:review?
- Q10 · business · answered · What becomes of `--ship` and `work.codeReview.autoComplete`?
- Q11 · technical · defaulted PLAN.md · Does aof:review restate continue's gate and review steps?
- Q12 · technical · defaulted PLAN.md · Does aof:review get its own `aof work review` CLI door?
- Q13 · technical · defaulted PLAN.md · Where does code-review's graph blast-radius ranking go?
