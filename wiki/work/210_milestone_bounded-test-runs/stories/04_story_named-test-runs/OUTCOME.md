# 210/04 · An agent runs the suites it names and states why, and the whole tree is refused inside story work — Outcome

## Delivered

### Named runs with a reason
`aof test <suite>… --reason "<why>"` runs exactly the named suites and records the files, content key, result and reason. It refuses a missing reason (`test-reason-missing`), a path that is not a registered suite (`test-not-a-suite`), no form (`test-form-missing`) and two forms at once (`test-form-conflict`). A repeat on unchanged content is answered from the record unless `--fresh` is given.

### The importer suggestion
`aof test --suggest` lists the suites the working tree's changes reach by import, through a test helper, or by naming the path, from a fresh scan on each call. It runs nothing and reads no code graph.

### The whole tree outside story work only
`aof test --all` runs the whole tree and refuses inside story work (`test-all-in-story-work`), where story work is an `AOF_RUN_ID` naming a story or task run, or any running story or task run in this checkout. No flag or environment variable overrides the refusal. The regression gate is the other door to the whole tree.

### The old selection removed
The `impacted` scope with `--scope`, `--story`, `--since`, `--commit` and `--plan`, the selector, the declared changed set and `work.test.couplings` are gone. A config that still sets `work.test.couplings` is refused with `test-config-key-removed`, which names the key. The suite predicate lives in `packages/work/src/testing/suites.mjs`.

- **Retired controls stay as rows** — 72/FF-7202 and 190/FF-19003 are marked retired in their accepted registers, and each row points at 210/FF-21001's control.

### The testing family's controls
FF-21001 (no testing module reads the code graph), FF-21002 (one module parses import specifiers) and FF-21003 (the whole tree has two doors) are green and each has a recorded red probe.
