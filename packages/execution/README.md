# @aof/execution

Owns run persistence, lifecycle transitions, transcript spend ingestion, heartbeat queues
and session attribution. Core assembles these services and supplies application policy.

- `createRunStore({ reportDegrade, getAnswerTokens, readSessionAnswers })` owns run records
  and composes its own transcript settlement service. Answer definitions and transcript
  answer reading remain supplied by the work layer.
- `createRunSpendIngest({ readRuns, settleRunFromVendor })` exposes transcript settlement
  for callers that already have a run store.
- `createRunHeartbeats` queues consumption-driven heartbeat writes using supplied storage
  and diagnostic functions.
- `createRunSessionCapture` waits for both session attribution persistence and the caller's
  capture hook before returning the hook's result.

Factories perform no I/O. The package imports public contracts and foundation APIs, Node
builtins and its own modules. It imports no core, work, mesh or command registry code.
Record shapes, paths, refusal behavior and spending calculations remain unchanged.

Legacy `src/run-*.mjs` files currently compose these services for existing consumers.
Local session drivers, terminal services and worktree mechanisms still need to move here;
final application composition will remove the transitional adapters.

Run package checks with `yarn workspace @aof/execution test`.
