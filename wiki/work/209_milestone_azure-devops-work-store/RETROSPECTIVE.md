---
doc: retrospective
promotionFrom: 1
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files — retrospective

## R1 · Every story that added a verb, stop or preflight code under-declared the same registries

**Kind:** mistake (recurring within the milestone) · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** product owner (verify) · **Promoted to:** none

**What happened:** 03, 04 and 05 each built outside their declared write sets, and the missed files were mostly the same kind. The command inventory and application command count, the stop-list pins and loop-shell bounds, the source-directory budget, the workspace runtime audit stamps and FF-16004's module count are all pinned censuses of what a story adds. Each story found its own. The whole-tree reds they left surfaced only when 05's task04 widened its run.

**Why:** Each story was refined from its own feature reading. The censuses that a new verb, stop, preflight code or golden suite moves are not on any story's path, so no one story's refine saw the set as a whole.

**Lesson:** When a milestone adds verbs, operator stops, preflight codes or suites, have the milestone breakdown name the censuses they move. Each story then declares the ones it touches, and story verify runs the `test/arch` sweep (209/05 R2).

**Refs:** m209/03/R3; m209/05/R1; m209/05/R2; STATE `## Feedback (for retro)`.

## R2 · Three stories sat uncommitted through review and two verify passes

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** product owner · **Promoted to:** none

**What happened:** 00–02 were committed after their build. 03–05 stayed in the working tree through their builds, reviews and both verify passes, beside another session's uncommitted files. The milestone gate could not run until one 102-file commit at the end, and a red found then could have been bisected only to the whole block.

**Why:** No step between a story's review and the milestone gate commits the story, and the first verify pass reported the gate as blocked rather than asking for the commit.

**Lesson:** Commit each story when its review closes, as 00–02 were, so the gate can run on any later pass and a red bisects to one story. At verify, ask for the commit as soon as the gate is the only thing left.

**Refs:** commits 672446a2 and bc9776cb; VERIFICATION accept decisions (first and second pass).

## R3 · Tripling a suite's cases was costed in minutes, not in gate units

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product owner (verify) · **Promoted to:** none

**What happened:** 209/05 ran the 150 captures three times in `work-stream.test.mjs` and recorded the cost as "about 8 minutes". The file did not declare `independentCases`, so the sharded gate ran its 636 cases as one unit. Under gate load that unit reached the 45-minute unit limit, and the first gate row was `not finished` (F-04). Once the file declared it, the same cases ran as 46 chunks in 2.8 minutes of wall time.

**Why:** The cost was measured by running the file alone. The gate schedules by file, and only a file that declares independent cases can be split across workers.

**Lesson:** When a story multiplies a suite's cases, check how the gate will schedule it: declare `independentCases` if every case builds its own state, or split the file. Run it once through `scripts/test-sharded.mjs --files` before review.

**Refs:** VERIFICATION `@finding-F-04`; REGRESSION.md, first row.
