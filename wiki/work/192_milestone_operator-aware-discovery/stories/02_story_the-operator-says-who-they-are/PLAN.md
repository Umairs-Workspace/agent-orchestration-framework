# 192/02 · The operator says who they are — build plan

## Mechanism

A pure leaf in `@aof/contracts`, shaped like `agent-mode.mjs`: the frozen levels, a merge of two
raw blocks (global under project: the role replaces, the expertise map merges per domain), a
resolver from one raw block to `{ declared, role, expertise }`, and a level lookup that answers
`new` for anything unlisted. It imports nothing and never throws.

Three places compose it, and none of them re-reads the key by hand:

- `loadWorkspace` reads the global file's `work.operator` exactly as it reads the global `mesh`
  block a few lines earlier, tolerating a missing or unreadable file, and puts the merged block on
  the returned config. The project file on disk is not touched.
- `config-inspect.mjs` gains the validator beside `validateWorkExamples`, called from the same
  `work` validation so the global file gets it too, and exports `operatorProfileFromConfig` beside
  `examplesEnabledFromConfig` for the readers 03 adds.
- `inspectConfig` answers the `operator` block. It reads the raw project config it already holds
  as `executionConfig` and the global file through `globalWorkspacePaths(options)`, resolves each
  alone to learn the sources, and resolves the merge for the values.

## Verification step

In a scratch project with `AOF_GLOBAL_HOME` pointed at a scratch home: write a role and one level
into the global file and a different level for the same domain into the project file, then run
`aof project show --json`. The role must come back with source `global` and the level with source
`project`. Then misspell a level and run `aof project validate`: one `operator-profile-bad-value`,
and `project show` still answers, with that domain at `new`.

A wrong build shows as `project show` and the loaded workspace disagreeing about a level (two
merges), or as the project's config file changing on disk after a load.

## Out of scope

- The doctor's warning, `init-config`'s flags and `aof:init`'s question — 03.
- Reading a record doc's `domains:` in code — no code needs it in this milestone (ADR-003 §8).
- A UI for the profile — the config editor keeps round-tripping keys it does not know.

## Known traps

- `inspectConfig` normalises the config through the asset loader, which drops the `work` subtree.
  Read the profile from the raw config, as the `memory` and `delegation` blocks do.
- `loadWorkspace` is on every verb's path. The global read must stay one small JSON read with a
  swallowed failure, like the mesh one.
- The schema's `work` definition is closed in places. Add `operator` beside `examples`, or every
  project that declares a profile fails schema validation in its editor.
- FF-19203's sweep will see the levels in the schema and in test fixtures. It sweeps runtime
  source only; say so in its header, as 134/FF-13402 does.
