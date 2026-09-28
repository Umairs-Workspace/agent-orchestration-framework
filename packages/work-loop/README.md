# @aof/work-loop

Owns execution-loop decisions, orchestration and its CLI contribution. Graph discovery and rendering
belong to `@aof/work-graph`; core assembles the executable and supplies application policy.

- `engine` is the unchanged, zero-import decision engine. It accepts facts and returns decisions.
- `createAskRequests({ getRuntimeRoot, reportDegrade })` owns ask records, answer validation and polling.
- `createStopRequests({ getRuntimeRoot, reportDegrade })` owns stop/resume records and the combined file/signal interrupt source.
- `createChildDrive({ getRuntimeRoot, isPackaged, getCliEntry, runBounded })` owns child-drive arguments and result interpretation.
- `createStoryCycle`, `createWaveOrchestration`, `createAskOrchestration` and `createLoopStops`
  own grading/retry sequencing, lane orchestration, waiting for answers and stop/hand-off behavior.
- `createLoopShell` and `createPhaseDrivers` produce the loop and three phase-driver commands.
  `createWorkLoopContribution` supplies those four descriptors to the shared registry.
- `createLoopProgress` and `createLoopDiagnostics` own progress sampling and launch diagnostics.
  `argv` is the zero-import declaration-to-arguments composer.

Factories perform no I/O. `getRuntimeRoot(env)` returns the existing global runtime
directory, including the caller's environment override. Diagnostics remain a supplied
application service. The child drive asks core for its CLI location only on the Node
branch; packaged executables receive verb arguments directly. Sessions continue to run
in child processes through the supplied bounded-spawn service.

The package depends on public APIs in `@aof/foundation` and `@aof/contracts`.
Persisted record shapes, filenames, sanitization, stop escalation and signal cleanup
remain unchanged. Legacy source modules currently compose these services for existing
consumers. Named service groups supply run storage, work discovery, execution, grading,
notifications and mesh operations. The package imports no assembled core or mesh module.
Core supplies `invoke(id, input, ctx)`; a per-call `ctx.invokeRegistered` still overrides it.
The adapters currently defer access to the core registry. Removing those adapters and
composing the final application directly remain part of the full migration.

Run its tests with `yarn workspace @aof/work-loop test`.
