# @aof/execution

Owns run persistence, lifecycle transitions, transcript spend ingestion, heartbeat queues
and session attribution, terminal provider resolution and the live terminal-session registry.
Core assembles these services and supplies application policy.

- `createRunStore({ reportDegrade, getAnswerTokens, readSessionAnswers })` owns run records
  and composes its own transcript settlement service. Answer definitions and transcript
  answer reading remain supplied by the work layer.
- `createRunSpendIngest({ readRuns, settleRunFromVendor })` exposes transcript settlement
  for callers that already have a run store.
- `createRunHeartbeats` queues consumption-driven heartbeat writes using supplied storage
  and diagnostic functions.
- `createRunSessionCapture` waits for both session attribution persistence and the caller's
  capture hook before returning the hook's result.
- `createTerminalProviders({ reportDegrade })` owns provider metadata, binary lookup and
  launch arguments/environment, preserving the injectable PATH resolver.
- `createTerminalSessions({ reportDegrade })` owns live-session records and best-effort
  pruning. It inspects process liveness without signalling or terminating sessions.
- `createSessionDriver({ transcripts, launch, reportDegrade })` owns local agent-session
  execution, transcript watching, completion detection, launch arguments and PTY lifecycle.
  Core supplies transcript readers, screen observation, attribution, phase-brief and trust policy.
- `createNodePtyLoader({ isPackaged })` owns lazy native loading: the packaged branch resolves
  beside the executable, while development uses a dynamic import. `createTerminalSpawn(loader)`
  is the shared spawn factory used by local sessions and the terminal WebSocket adapter.

Factories perform no I/O. The package imports public contracts and foundation APIs, Node
builtins and its own modules, and lazily loads its pinned `node-pty` dependency. It imports no
core, work, mesh, WebSocket transport or command registry code.
Record shapes, paths, refusal behavior and spending calculations remain unchanged.

Legacy root modules currently compose these services for existing consumers.
Screen services and reusable worktree mechanisms still need to move here;
final application composition will remove the transitional adapters.

Run package checks with `yarn workspace @aof/execution test`.
