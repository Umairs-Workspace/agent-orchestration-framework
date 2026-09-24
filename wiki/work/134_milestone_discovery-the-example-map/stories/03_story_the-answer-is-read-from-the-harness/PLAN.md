# 134/03 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

Three seams: a new reader, one new writer in the run store, and a directory fix at the settle.

**The reader** is a pure function over transcript text: split the lines, parse each (skip the
bad), index every `tool_use` block whose name is in `HUMAN_INPUT_TOOL_NAMES` by its id, then for
each `user` line whose `tool_result` names one of those ids and whose `toolUseResult` is an object,
walk its `answers` and keep the keys `readMapToken` reads a token at the head of. The line itself
supplies `sessionId`, `timestamp` and `entrypoint`. A thin async wrapper feeds it
`readTranscriptTree(projectsDir, sessionId)`. That is the only place in the source tree that
spells `toolUseResult` (FF-13401). Import the tool-name list; do not write the name.

**The writer** is `recordAnswers`, on the `recordAnchorReading` pattern: validate, read the run,
refuse to overwrite a present `brief.answers`, persist. `completeRun` calls it after the spend
block, in its own try, and reports a failure through `reportDegrade` exactly as spend does. Take
a `settleSpend` flag there so the spend block can be skipped while the answer block still runs.
`carriedBrief` drops `answers` beside `loop`. `completeRun` imports the reader lazily, as it does
the spend producer, to keep the run store's static graph acyclic.

**The directory** is resolved in `transitionRunComplete`: an explicit `projectsDir` wins; else,
if a `workspace` is named, `claudeProjectsDir({ cwd: workspace.projectRoot, env, home })`; else
nothing. `spendSettled` passes through as `settleSpend: !spendSettled`. The two driven settles
already hold the right directory in their settlement context; hand it over with
`spendSettled: true`.

**`collectAnswers`** reads the story's runs and its parent's (`readRuns` over each item), takes
`brief.answers` from settled runs and the reader's live answers from `running` ones, filters to
tokens naming the story, folds duplicates on `(toolUseId, question)` and sorts by `at`. Story 04's
snapshot probe is its first caller, so keep its options plain (`projectsDir`, or `workspace`,
`env` and `home`).

Two pins move: FF-5307's sha256 of the run store (re-pin in the open, comment naming 134/03), and
the spend suite gains the hand-run-settle case. FF-6908 stays green because nothing new reaches
`buildRecord`. Red-probe both new controls and record the probes in the milestone
`VERIFICATION.md`.

## The verification step

With `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` each set to a fresh temp directory, run the two
example indexes, the spend-ingest, spend-store and record-key suites, the FF-5307 and FF-6908
controls, and the drive and warm-fix loop suites through `scripts/test.mjs --only`. Then do task
03: install with `node scripts/install-local.mjs --skip-ui`, check `aof --version`, write the
three procedures and their paste slots into the milestone `STATE.md`, and stop with `NEEDS_INPUT`.
Every leg needs an undriven interactive session, and the answer leg needs a person.

## Out of scope

- Any reader of `collectAnswers`: the doctor lane, the snapshot probe and the continue door are 04's.
- The discovery beat's prose and the `EXAMPLES.md` template (05).
- Forged transcript lines and naming the person (RESEARCH R6, R3). The record names the channel.
