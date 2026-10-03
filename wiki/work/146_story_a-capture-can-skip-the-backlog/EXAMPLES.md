---
doc: examples
---
# 146 · A capture can skip the backlog — example map
<!--
Drafted at refine's discovery beat, 2026-10-03, and settled with the operator the same day. Struck
before asking, because the record answers them: who mints the number (STORY Notes, 41/ADR-002:
`aof work promote`, never the prompt); what a promote refusal does after the switch (promote.md
step 4: a refusal is a stop, the item stays where it was scaffolded). The operator narrowed the
story: the switch only sends a capture into the stream, at the tail. No position, no switch in the
other direction, and nested stories are not part of it.
-->

## R1 · `--in-stream` sends one capture straight into the stream, at the tail
- E1 · Intake "backlog", `aof:add-story loop-diagram --in-stream` → scaffolded at backlog/story_loop-diagram/, then `aof work promote loop-diagram --json` runs and the minted ref is reported [stated Q1]
- E2 · Intake "backlog", `aof:add-story loop-diagram` with no switch → stays at backlog/story_loop-diagram/, exactly as today [stated Q5]
- E3 · `aof:add-milestone billing --in-stream` → promote runs with no `--at`, and the milestone lands at the tail [stated Q2]

## R2 · The switch never mints and never reaches around a promote refusal
- E4 · Intake "backlog", `aof:add-chore tidy-config --in-stream depends gamma`, gamma a backlog slug → promote refuses promote-depends-backlog; the refusal is reported and the chore stays in the backlog [proposed]

## Questions
- Q1 · business · answered · How is the switch spelled on the add commands?
- Q2 · business · answered · Should the switch also take a position, beside `aof:insert-*`?
- Q3 · business · answered · What does a nested story given the switch do?
- Q4 · technical · defaulted PLAN.md · Where in the arguments may the switch appear?
- Q5 · business · answered · Is there also a switch that keeps a capture in the backlog?
