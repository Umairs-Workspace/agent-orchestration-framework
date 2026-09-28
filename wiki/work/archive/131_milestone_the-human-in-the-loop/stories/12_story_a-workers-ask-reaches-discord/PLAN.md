# 12 · A worker's ask reaches Discord — build plan

## Mechanism

One fact already crosses the wire at the right moment: the worker's durable park,
`assignment.reported` with running + `needs-input`. This story adds the question to it, then lets
the control's three readers use it: the post, the board and the reply.

1. **The worker half (task 00).** `readWorkerAsk` lives in `park-resume.mjs`, beside the park's
   other worker-side logic. It calls `readAskQuestion` with the worktree as `cwd`, so the projects
   directory is the worker's own. At `worker-execution.mjs:1330` the extras object gains `ask:
   await readWorkerAsk(…)` on the same line, so the file stays at 1,914 lines. The worktree path
   and the directive's drive are both in scope there. `park-resume.mjs`'s two park reports get the
   same key. In `reportAssignmentSettled`, destructure `ask = null` and spread it into the payload
   only when it is non-null.
2. **The store (task 01).** Add the ALTER beside the `code` column's. `updateAssignmentState`'s
   options already use the "undefined keeps the existing value" idiom for `code`, so `ask` copies
   it. `transitionAssignmentState` forwards it. In the execution projection, parse it in a try, and
   attach it only when `awaitsAnswer`.
3. **The post (task 02).** In `settleAssignment`, read the row (the store is already open), note
   whether its code was `needs-input`, run the transition, and on the edge call
   `announceWorkerAsk` by a deferred import (the table's sanctioned escape). Keep the reactor's
   return value exactly as it is. `announceWorkerAsk` maps the workspace id to the control's
   checkout through `resolveNodeWorkspaces`, loads it, builds the envelope with `fields.node`, and
   awaits `notify`. 10's index then records the checkout's root with no change here.
4. **The readers (task 03).** In `list.mjs`, `workerAsk(execution)` reads `execution.ask` first. In
   `resume.mjs`, restructure so that both legs return through one announcement. The mesh leg
   announces only after a non-refused resume.
5. **The register (task 04).** Add FF-13114, move FF-13107's site table to seven, probe both, and
   drop `pending (12)`.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `blocked-run-parking`, `mesh-effects-outbox`,
`global-work-store`, `mesh-assignment-record`, `board-mesh-execution`, `notify-channels`,
`run-session-limit-resume`, `discord-replies` and `acd-loop-ask-reaches-every-face` through `node
scripts/test.mjs --only`. Then run one end-to-end probe in-process:
1. Take a worker fixture whose transcript ends with the four-line ask, and let it park. Ship its
   outbox step into a control fixture store, with a fake fetch.
2. Expect one POST whose line 1 names the worker's node, a board row whose `ask.question` is the
   four lines, and, after one fake reply through 10's handler, one `mesh:terminal-resume` call
   carrying the answer.
3. Apply the step again. Expect no second POST.

## Out of scope

- A loop that runs BY a worker node posting from it. The worker has no token, and this is a stated
  scope line in ADR-010 §7.
- Changing the ask card's rendering. It already renders a non-null question for any ask.
- Widening the ordinary assignment status frame.

## Known traps

- `settleAssignment`'s comment says the bridge ACK reads the reactor's return value, so a returned
  `code` is read as a refusal. Keep the post's outcome out of it.
- `worker-execution.mjs` is at its sink ceiling, so add no line. Any helper goes in
  `park-resume.mjs`.
- `reportDegrade` throttles each code for 5 s. The no-checkout and unreadable-column cases each
  assert one degrade.
