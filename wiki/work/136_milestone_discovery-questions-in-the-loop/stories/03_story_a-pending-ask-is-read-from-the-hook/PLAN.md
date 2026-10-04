# 136/03 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

- **The hook** (`ask-pending-enqueue.mjs`) reads the `PreToolUse` event from stdin and appends one
  line to `<AOF_RUN_ITEM_DIR>/runs/.asks-pending.ndjson`. Registered by `claude-ask-pending.json`
  (`PreToolUse`, matcher `AskUserQuestion`) beside the heartbeat's two bundle entries; the
  manifest is regenerated with `scripts/generate-bundle-manifest.mjs`.
- **`readPendingAsk`** sits beside `readAskQuestion` in `observe.mjs` and reaches the driver, the
  loop's ask owner and the mesh park-resume through their existing transcript bags, as an optional
  entry so a test double without it keeps today's behaviour.
- **The driver** stamps `drivenAt` at the top of the drive and passes `{ itemDir, since }` to its
  completion watch; `readTranscriptTerminalOutcome` reads the record first.
- **`ask.mjs`** reads the record scoped past the run's newest answer (the standing ask excluded on
  re-entry), and composes the re-drive text only when the question came from the record.

## The verification step

`node scripts/test.mjs --only test/loop/loop-ask-pending-hook.test.mjs` with `AOF_GLOBAL_HOME`
isolated, then the importer sweep: the driver, ask, observe, bundle and mesh suites. The live proof
is 136's `@manual` run on the test-bed.
