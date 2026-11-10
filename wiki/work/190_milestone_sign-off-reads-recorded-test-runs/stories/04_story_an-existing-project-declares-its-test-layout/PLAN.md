<!-- Build brief — advisory, the builder's alone. The task features are the contract. -->
# 190/04 · An existing project declares its test layout — build plan

## Mechanism

**One pure function, two faces.** `layout.mjs` exports `testLayoutChecks({ toolchain, gate,
tracked, workDir })`. It returns `[]` when the toolchain did not compile, and otherwise up to three
checks `{ id, severity: "ok"|"warning", message }`. `toolchain` and `gate` are the compiled results
of `resolveTestToolchain` and `resolveTestGate`, never the raw config (FF-7201). `tracked` is the
`git ls-files` list, or `null` when it could not be read. Membership is decided by `isSuiteFile` from
`select.mjs` (FF-19006). The test-shaped name set is one frozen list in this module.

- **Project doctor:** `doctorConfig` pushes the checks after `toolPlatformChecks`, like
  `notion-auth`. The `git ls-files` read happens there, at the impure edge (it already uses
  `spawnSync`). Wire the function in through `assembleConfigInspect`'s services; do not import
  `@aof/work` from config-inspect ad hoc. Follow how the other services arrive in `assemble.mjs`.
- **Update:** `work:update`'s `run` attaches `testLayout` (the warnings only) to its result, and
  `render` appends one line per warning after `memoryConfigLines`. It uses the same service as the
  doctor, so the agreement scenario holds by construction.
- **`--plan` / `--commit`:** in `commands/test.mjs`, `--plan` returns right after the selection,
  before the record lookup and before the launch. Put the record lookup after the plan return, not
  inside a branch that a later edit could reorder. `--commit` goes beside `--since` in `changed.mjs`:
  `git diff --name-only <rev>^1 <rev>`, or for a root commit `git show --name-only --format= <rev>`.
  It joins `STORY_AND_SINCE`'s one-source refusal (generalise the code's message to name whichever
  two were given). `--commit` without `--plan` gets its own refusal code.
- **Command:** `map-tests.md` is modelled on `init.md`'s analyse-then-author shape. Register it in
  the manifest the way `teach`/`manual` are, then run `aof work update` to render. Its `<process>`
  is: before replay → read runner and layout → roots/suffixes → couplings census (grep each
  candidate path in suites, literal and `path.join` segments, as 190/01 task 03 did) → gate resume
  (only when the program honours the contract; this repo's `scripts/test-sharded.mjs` is the one
  example) → write (skipped under `--dry-run`) → after replay → `aof project doctor`.

## Verification step

- `AOF_GLOBAL_HOME=$(mktemp -d) aof project doctor --json` on this repo: three `test-layout-*`
  checks, all `ok`.
- In a scratch clone with the 4ff7fba6 `work.test` block: the doctor reports suites, couplings
  and resume warnings, and `aof work update` prints the same three lines.
- `aof test --scope impacted --commit HEAD --plan` prints `plan:` and nothing launches. Check that
  the record store's file count is unchanged.
- Task 04 is the live proof, recorded in VERIFICATION.md.

## Out of scope

- Teaching other runners the resume contract. The skill names the contract; it does not write an
  adapter.
- Re-running `/aof:map-tests` on this repo's own config, which 190/01 and 190/02 already declared.
- A replay that rebuilds the graph per commit: it uses the current graph (ADR-008 §2).
