# 126/05 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

One new leaf whose whole job is to import the SQLite runtime quietly, and two callers that stop
carrying their own copy of that act. The leaf wraps `process.emitWarning` immediately before the
dynamic import, swallows only a warning whose type is `ExperimentalWarning` **and** whose message
names SQLite, awaits the import, and restores the original in a `finally` — so a throwing import
still restores, and an unrelated warning raised during an unrelated await can never be swallowed.
Node raises this warning once per process, which is why the wrap need only cover the import.

Keep the leaf policy-free. The two callers refuse differently — the projection store throws a coded
`sqlite-unavailable` and honours a forced-unavailable option, the journal degrades its own way — and
both of those stay exactly where they are; the leaf returns the module or throws what the import
threw, nothing more. Collapse both `resolveSqlite` bodies onto it so `import("node:sqlite")` occurs
in exactly one module. That is a subtraction, which is the point.

Do not reach for the flag. `--disable-warning=ExperimentalWarning` works on this Node and hides every
experimental warning; `--no-warnings` hides the deprecations too. Neither belongs in any launcher,
script, hook, bundled command or `package.json`, and a control sweeps for all of them.

## The verification step

In-process: import through the leaf with a counting fake in place of `emitWarning`, confirm the
SQLite warning was swallowed and a planted non-SQLite experimental warning raised during the import
still reached the original; confirm `process.emitWarning` is identical to its prior value after a
successful import and after one made to throw. Then the caller checks: the projection store with the
runtime forced unavailable still throws its coded refusal. Finally the honest one — run any `aof`
command that opens the store from a terminal and read stderr: nothing.

## Deliberately out of scope

Any other warning. Any change to what either caller does once it has the runtime. Any launcher or
`NODE_OPTIONS` edit.
