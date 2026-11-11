# Build brief

## Mechanism

`createMemoryCommand` already builds one descriptor. Make it build `memory` (route `["memory"]`)
and derive `work:memory` from it by spreading the descriptor and replacing only `id` and
`cli.route`. `cli` is a nested object, so spread it as well: `{ ...canonical.cli, route: [...] }`.
Keep `spec`, `argv`, `render` and `json` as the same references. Return both from the factory and
the binding, register both in `command-core.mjs`'s knowledge contribution, and add `memory` to
`KNOWLEDGE_COMMAND_IDS`. The seam's `MEMORY_USAGE` becomes `aof memory <verb> …`, and so do the
other hints in `memory.mjs`, `import-milestone.mjs` and `cli.mjs`.

Help: `helpText` sends every one-word route to Usage. Give it one rule: a one-word route whose
word `HELP_FAMILY_TITLES` names is its own family. Add `memory: "Memory"` to the titles and to the
order beside `graph` and `mesh`. `resolveRoute` already picks the longest match, so `work memory`
and `memory` do not collide.

Watch for:
- `acd-work-memory-routed` pins the help placement under Work and the ladder subtraction. Widen
  it for the new section and keep it green.
- The byte-for-byte cases need a real CLI spawn per door (`spawnCliSync`). An in-process render
  cannot show stderr or the exit code.
- Retiring a spelling reaches suites the lane never selects (prior lesson). Grep the test tree
  for `aof work memory <verb>` and `to rebuild it`, and run every suite that matches.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, on a temp project with an ingested fixture stream, run each
argv in task 00's outline through both doors and `diff` the stdout, stderr and exit code. Then run
`aof --help` and read the Memory section. Record FF-17801's red probe in the milestone
VERIFICATION: replace the alias's `render` with a wrapper and quote the message the control
prints. Run only the declared suites plus the grep hits, never the full suite on this machine.

## Out of scope

Migrating any bundle asset, README or schema text (178/02). The `origin` field (178/03). Hiding
or retiring the alias.
