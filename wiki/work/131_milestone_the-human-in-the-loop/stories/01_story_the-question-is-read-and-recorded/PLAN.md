# 01 · The question is read and recorded — build plan

## Mechanism

Three independent seams, all leaves the later stories import. None of them yet has a caller that
waits. That caller is story 03's `awaitAnswer`.

1. **The reader moves, it is not rewritten.** Lift the body of the driver's private
   `readTranscriptTerminalOutcome` into `observe.mjs` as `readLastAssistantTurn`, returning the
   raw facts (stop reason, joined text, the pending human-input block, answered). Then shrink the
   driver's function to a mapping over it. The existing driver transcript suite is the
   characterisation net: it must go green with its assertions untouched. The human-input tool
   name list and the sentinel each get ONE home. The driver imports `observe.mjs`, never the
   reverse, so both live in `observe.mjs` and the driver re-exports the names. FF-5302 compares
   namespace keys, so a re-export keeps the seventeen.
2. **The ask file copies the stop request.** `ask-request.mjs` is `stop-request.mjs`'s shape, key
   for key: a segment-checked id, `shapeRecord` over a frozen key list, `writeText`, the degrading
   read, and an injected-timers poll with `unref`. `answerAsk` is the only function that scans
   the directory by workspace and ref. It sanitises before it reads anything.
3. **The record gains a key by the 68 discipline.** Append `asks` last in `buildRecord` and
   `normalizeRecord`. Add the three writers beside `heartbeat` (read, spread, persist). Put the
   skip in `staleRunningRuns`, which is the scan every reclaim path selects through, and never in
   a caller. Write the interval subtraction in `attemptElapsedMs` itself, pure, with no import.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the focused suites through `node scripts/test.mjs --only`:
the driver transcript suite (which hosts the reader cases, since `work-observe.test.mjs` is
unregistered), loop-diag (which hosts the ask-request cases, as it
hosts the stop request's), run-heartbeat-reclaim, the clock control and every record-key pin.
Then run one hand probe: mint a run in a fixture, `openRunAsk`, make it stale, and run
`transitionStaleRunsReclaimed`. The record is byte-unchanged. `answerRunAsk`, then the same sweep
reclaims it. A wrong build shows as a reclaimed waiting run, a sixteen-key pin still green, or a
driver transcript case edited to pass.

## Out of scope

- Any caller that opens, polls or answers an ask: the owner's wait is 03's and the verb is 04's.
- Notifying, rendering or narrating the question: 02, 03 and 05.
- The run-status render of `asks`. That command is byte-pinned and untouched.
- The FF-13101 to FF-13103 controls themselves, which are 06's. This story's cases prove the
  behaviour they will guard.

## Known traps

- The run store carried an UNCOMMITTED 130 edit (`carriedBrief`) in the shared checkout at
  refine. It had landed by the build (2026-09-24), so the FF-5307 re-pin is this story's alone.
- `run-store-spend` asserts `spend` is the LAST key on disk, and `run-status-document-frozen`
  asserts 16 keys. Both are in `files:` for that reason.
- The instruction template may hold no backtick, `//` or `/*`. The ADR paragraph's em dash and
  quotation marks are fine. No label may wrap across two template lines: task 01 counts each as
  an exact literal.
- FF-5307 is red in the working tree right now: the pin matches HEAD, and 130's uncommitted
  edit moved the digest.
- `loop-command-stops`, `loop-diag` and `run-session-limit-resume` are shared with 03 and 04. Edit
  only what the seventeenth key forces.
