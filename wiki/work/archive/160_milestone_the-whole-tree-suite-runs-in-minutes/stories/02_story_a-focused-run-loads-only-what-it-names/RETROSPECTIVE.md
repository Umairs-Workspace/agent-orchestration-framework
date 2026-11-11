---
doc: retrospective
promotionFrom: 1
---
# 160/02 · A focused run loads only what it names — retrospective

## R1 · `--scope impacted --story` launched the whole tree, serially

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 124/00/R2 · **Promoted to:** none

**What happened:** The story's lane ran `aof test --scope impacted --story 160/02`. The declared `.aof/` and
`.claude/` paths have no registered dependent, so the selection widened to `scope all` and launched the whole
tree serially on the control node. It was stopped at once, and the story's suites were run by file.

**Why:** A declared path the graph does not know widens the impacted scope to everything. The lane brief did not
say to run the story's suites by file.

**Lesson:** A story lane runs `scripts/test-shard.mjs <its suites>` (or `aof test --scope file`). It never runs
`--scope impacted` on a story whose `files:` names config, renders or new paths.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/02); 160/06/R1.

## R2 · A red probe on the launcher broke the launcher that ran it

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** FF-16003's red probe made a selection fall back to `args`. With the probe applied,
`aof test --scope file X` launched `node scripts/test.mjs X`, which is the whole tree.

**Why:** The probe edited the seam that the probing command itself goes through.

**Lesson:** Probe a launcher seam through `node scripts/test-shard.mjs <suite>`, never through `aof test`.

**Refs:** ../../VERIFICATION.md `## Fitness functions` FF-16003.
