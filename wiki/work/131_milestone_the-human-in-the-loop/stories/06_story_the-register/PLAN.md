# 06 · The register — build plan

## Mechanism

Three arch files, in the harness shape of 130's three loop-stop controls beside them. Copy
`acd-loop-stop-request-single-home` for the imports and the helper set. Each file exports an
`archTests` array of `{ name, run }`, with case names prefixed `arch/131 <id>`, and is registered by
one import and one spread appended to the loop arch index.

Each control has two legs, plus a third where a sweep can come up empty:
- **Structural**: resolved import specifiers through the one extractor (FF-11901), and
  comment-stripped sweeps with the source-slice helpers (`matchedBraceBody`, `matchedParenSpan`)
  for the "X before Y inside this branch" clauses (FF-13109's admission order, FF-13101's three
  writers).
- **Fixture**: the delivered functions called directly under an isolated home, such as
  `answerAsk`, `transitionStaleRunsReclaimed`, `attemptElapsedMs`, `notify` with an injected
  fetch and degrade sink, `renderDiscord` and `accountLine`. FF-13105's lane leg reuses the
  lane fixture's `askWait` seam, and FF-13104's reuses the drive suite's fake PTY. Do not build a
  second harness.
- **Non-vacuity**: a sweep that finds nothing is a failure, never a pass.

After that, the budget row moves by +3 over whatever it reads when you arrive. Then run the
probes one at a time and record each in VERIFICATION. The `pending — 131/06` token comes off
each ARCHITECTURE row only once its file is on disk and its probe has been seen red.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the runner's `--only` selection over the three new files
and the directory budget: nine ids green. Then the standing set the task 00 contract names. Then
each probe from task 01's table, reverted each time. Finally `aof work doctor 131` from the repo
root, which must report no `control-unresolved` and no `verification-missing-red-probe`.

Signs of a wrong build:
- a control that stays green under its own mutation;
- a sweep that walks zero modules and passes;
- a fourth new file in the loop arch directory;
- a VERIFICATION row with no observed message.

## Before you start

FF-13105's one-spelling leg is red over the tree as measured at refine
(`src/loop/cycle.mjs:1079`, the stop-standing verify branch). That is 131/03's fix. If it is
still there when you arrive, report it against 03 and do not narrow the leg. The other eight
controls do not depend on it.

## Out of scope

- Any change to a subject file. A control that needs the code changed is a finding against the
  story that owns the file, fixed there.
- Re-pinning `53/FF-5307` digests (01/04/05 own them) and the `src/loop` exemption (it already
  names `ask-request.mjs` and `ask.mjs`).
- The live run (07).

## Known traps

- Append to the index after the 130/05 block. Never re-order it.
- The budget control checks the table against the tree in both directions: a +3 with two files
  landed reds.
- `waiting on you` sits in a comment in `board-mesh-execution.mjs`. Strip comments before the
  sweep, or FF-13108 reds for a false reason. The same goes for `notify()` in
  `worker-stream-client.mjs` (FF-13107).
- Run nothing else while a spawn-heavy suite is running. Contention manufactures reds.
