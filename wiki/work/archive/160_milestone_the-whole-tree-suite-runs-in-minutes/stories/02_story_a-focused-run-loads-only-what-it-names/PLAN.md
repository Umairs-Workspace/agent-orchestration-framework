# 160/02 · A focused run loads only what it names — build plan

## Mechanism

`aof test` composes a selection as the declared program, then `work.test.args`, then `selectArgs`
expanded over the files (`argumentVector` in the work package's toolchain module). Add one optional
key, compiled in `resolveTestToolchain` with the same refusals as `args` (an array, of strings).
When it is present and the launch carries a selection, it replaces `args` in `argumentVector`. A
whole-tree launch, the gate, and every launch without a selection are untouched. 144's `gate.args`
is the pattern to copy, including its "absent is an answer" rule.

The shard entry becomes the declared program. It already runs a file through `runCases`
without the registry and already handles the import ring. Teach it several files, and keep its
current `<file> [<positions>]` form working for the sharded runner. The positions argument is
recognised by shape, `^\d+(,\d+)*$`. A file that will not load, or exports nothing runnable, is a
`not ok - <file> …` line and a non-zero exit, worded as `loadSelected` words it. Use one
`runCases` call over the concatenated cases, so the `# executed N cases` line stays single.

The isolation hook's runner match, which today names only the registry runner, widens to the
shard entry as well.

## Verification step

`AOF_GLOBAL_HOME=$(mktemp -d) aof test --story 160/02`, and a hand-typed run of the shard entry
over one small suite: time both, and count the evaluated modules with a
resolve hook. No `index.mjs` from `test/` and no unnamed suite may appear. Record the times before
and after in VERIFICATION.

A selection that still pays the registry shows ~15 s of startup and the indexes in the module list.
A selection that silently ran fewer cases than its files export shows a `# executed` count lower
than the files' case total.

## Out of scope

- Moving the registry out of the runner: rejected in ADR-003 (twenty text readers and the census).
- Making the runner's own `--only` fast: impossible while it holds the registry's static imports.
