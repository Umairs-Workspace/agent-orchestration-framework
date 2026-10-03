---
doc: examples
---
# 145 · A milestone's loop plan can be drawn — example map
<!--
Drafted at refine's discovery beat, 2026-10-03. Struck before asking, because the record answers
them: which engine draws (one engine for every diagram, the operator's ruling in the Notes);
whether the drawing runs headless (no, it runs in the operator's session); and which settings mean
"refined upfront" (work.loop.concurrency = refine_first, the only mode with a refine phase before
any build).
-->

## R1 · A plan is drawn only for a refined milestone the loop would plan upfront
- E1 · Milestone 7 with stories 01 and 02, both with tasks, under work.loop.concurrency "refine_first" → execution/loop-plan.json is written and the drawing instructions are answered [proposed]
- E2 · The same milestone with work.loop.concurrency unset ("sequential") → stopped with a message naming work.loop.concurrency and "refine_first"; nothing is written [confirmed]
- E3 · Story 7/02 has no tasks yet → stopped with a message naming 7/02 as not refined and "aof:refine 7/02"; nothing is written [confirmed]
- E11 · The ref is a standalone story or a chore → stopped with a message that a single item runs in one lane, so it has no waves to draw; nothing is written [proposed]

## R2 · Stories that cannot collide share a wave; the rest wait
- E4 · 01 writes a.mjs, 02 writes b.mjs, no depends → wave 1 holds 01 and 02 [proposed]
- E5 · 02 writes src/, which covers 01's src/a.mjs → wave 1 holds 01; wave 2 holds 02, marked held by its files overlap with 01 [proposed]
- E6 · 02 depends on 01 → wave 1 holds 01; wave 2 holds 02, with the edge 01 → 02 [proposed]

## R3 · The plan says what it cannot know
- E7 · Lane bound 2 and three stories in wave 1 → the third is marked as waiting for a free lane [proposed]
- E8 · 01 declares no files → 01 runs alone in wave 1 and every other story is held behind it [proposed]

## R4 · The plan is the whole milestone, with built stories shown as built
- E9 · 01 is in review, 02 is not started, and they cannot collide → wave 1 holds 01 and 02, and 01 is shaded as built [stated Q1]
- E10 · 01 and 02 are both done → the plan still holds both in their waves, both shaded as built [stated Q1]

## Questions
- Q1 · business · answered · When some of the milestone's stories are already built (in review or done), should the diagram plan only what is left, or the whole milestone as if nothing had started? (everything, with completed items shaded or highlighted, 2026-10-03)
- Q2 · business · answered · Should the command take only one milestone, or also a range like 129-131 (the loop can run a range, and stories from different milestones then share waves)? (one milestone or work item per run for now, 2026-10-03)
- Q3 · technical · defaulted Notes · Is execution/loop-plan.json written when diagrams are off or the generator is missing? (yes: the plan is aof's own data; only the drawing is skipped)
- Q4 · technical · defaulted Notes · Does a re-run overwrite execution/, and does aof commit it? (overwrites; never commits)
