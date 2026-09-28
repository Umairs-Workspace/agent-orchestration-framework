# @aof/work-loop

Owns execution-loop decisions and control mechanisms. Graph discovery and rendering
belong to `@aof/work-graph`; core assembles the executable and supplies application policy.

- `engine` is the unchanged, zero-import decision engine. It accepts facts and returns decisions.
- `createAskRequests({ getRuntimeRoot, reportDegrade })` owns ask records, answer validation and polling.
- `createStopRequests({ getRuntimeRoot, reportDegrade })` owns stop/resume records and the combined file/signal interrupt source.
- `createChildDrive({ getRuntimeRoot, isPackaged, getCliEntry, runBounded })` owns child-drive arguments and result interpretation.

Factories perform no I/O. `getRuntimeRoot(env)` returns the existing global runtime
directory, including the caller's environment override. Diagnostics remain a supplied
application service. The child drive asks core for its CLI location only on the Node
branch; packaged executables receive verb arguments directly. Sessions continue to run
in child processes through the supplied bounded-spawn service.

The only package dependency is the public filesystem API in `@aof/foundation`.
Persisted record shapes, filenames, sanitization, stop escalation and signal cleanup
remain unchanged. Legacy source modules currently compose these services for existing
consumers. Cycle/wave orchestration and CLI contributions are the next extraction;
this package is not yet the completed work-loop boundary.

Run its tests with `yarn workspace @aof/work-loop test`.
