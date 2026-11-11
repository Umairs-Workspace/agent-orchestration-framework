# 160/04 · The gate launches clean and dies with its session — build plan

## Mechanism

The gate already wraps the launch: it hands `runTest` a `run` callback that calls `launch(toolchain,
files, options)`. Everything in this story hangs off that callback. It adds a cleaned `env`, an
`AbortSignal` and `stdin: "pipe"` to the options. `runBounded` already honours all three, and its
abort ends the child's stdin before any kill.

`cleanLaunchEnv` is a pure function next to the gate's other policy. The keep-alive gains a second
duty on its existing beat: it reads the run named by `AOF_RUN_ID`, and aborts the controller when
that run is no longer running. The core binding passes the run store's read in, the same way it
passes `headCommit`. An aborted launch comes back with outcome `aborted`. Map that outcome to the
`regression-gate-stopped` refusal before the row is composed, so nothing is appended.

On the runner side, extract the worker pool (the queue, `runUnit`, the workers and the alone-retry
pass) into the pool module, with spawning injected. The pool listens for `end` on its stdin. When
it fires, it kills every in-flight child, starts nothing more, skips the retries, and resolves with
what it has. The runner prints its report as usual and exits non-zero. The report's wording for a
stopped run is story 05's (`# not finished - …`). Here, a stop must simply not read as green.

## Verification step

On the control node: start `aof work regression-gate <ref>` from a shell with `GIT_ASKPASS` set
and a fake driven run (`AOF_RUN_ID` pointing at a run record in a temp item). After a minute, settle
that run. Then confirm that within about a minute no `test-shard.mjs` process remains (Task Manager
or `Get-CimInstance Win32_Process`), and that REGRESSION.md is unchanged. Record the process
listing in VERIFICATION.

## Out of scope

- The budget, unit timeouts and the `not-finished` word: story 05.
- Killing a gate from the loop's side: the gate watches its run, and the runner watches its stdin.
  Nothing new reaches into another process tree.
- `aof test` scopes other than the gate: ADR-005 governs the gate's launch only.
