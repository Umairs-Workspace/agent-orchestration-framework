---
doc: retrospective
promotionFrom: 1
---
# 194 · Global Discord channel settings — retrospective

All three runs ended `done` on their first attempt, with no stall recorded and no review finding.
Two lessons follow. Two of the build's feedback notes carry no lesson: `allowKeyOf` is spelled
three times, and `test/discord` now sits at its flat-layer threshold. Both are recorded in
`STORY.md` `## Feedback (for retro)`.

## R1 · Two scenarios named a slash command that does not exist

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** Task 00 E2 and task 02's "a channel the bot cannot place" both say `/loop
status`, but `/loop` takes only `stop`, `resume` and `start`. The build flagged it and tested
`/status`, the command the scenarios mean. The delivered `.feature` still names `/loop status`.

**Why:** The scenarios were drawn by hand from the trace (`STORY.md` `## Notes`), and the command
names were written from memory. Nothing checked them against the registered slash-command table.

**Lesson:** At refine, check every CLI verb and slash command a scenario names against the
registered table before the contract is locked. A wrong name passes review only because the build
quietly substitutes the right one, so the contract and the test diverge without a word.

**Refs:** `STORY.md` `## Build notes` (scenario flagged, not changed); `EXAMPLES.md` E2; related in
kind, below the recurrence threshold: m167/00/R1.

## R2 · A bare file argument to the test runner started the whole suite, again

**Kind:** mistake (recurring) · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Recurs:** 178/R2 · **Promoted to:** none

**What happened:** To run the story's suites, verify ran `node scripts/test.mjs <file>` under an
isolated `AOF_GLOBAL_HOME`. Without `--only`, the runner ignored the path and started the whole
registry on this MacBook, where the full suite must not run. It was noticed when the first "file"
ran past its 600 s budget, and was stopped. The lane was then run through
`scripts/test-shard.mjs <file>`.

**Why:** 178/R2 recorded the same mistake, with `Promoted to: none`. A lesson that lives only in a
retrospective is not in front of the person typing the command. The runner still drops bare
arguments silently, and `.claude/rules/build-deploy-restart.md` says "run focused suites" without
naming the command that does it.

**Lesson:** The second occurrence is the signal to promote this lesson rather than restate it.
Either the runner refuses or warns on bare positional suite paths, or the rule names
`node scripts/test-shard.mjs <files>` (or `scripts/test.mjs --only <files>`) as the focused form.
Until then, never pass suite paths to `scripts/test.mjs` without `--only`.

**Refs:** `VERIFICATION.md` `## Verification limits`; `scripts/test.mjs` `selectionArgv`; 178/R2.
