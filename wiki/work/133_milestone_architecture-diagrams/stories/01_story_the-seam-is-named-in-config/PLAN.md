# 133/01 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

This story is the spine the other five compose, and it has three seams.

**Config.** `work.diagrams` follows the `work.plan` idiom exactly: a validator called from
`validateWork`, and one exported resolver that every consumer reads through. The resolver is total.
A bad config resolves to off and never throws, because the validator reports the error and a
consumer that threw on config would take refine down with it. The generator-id list in the
validator's message comes from the registry, so `config-inspect.mjs` imports `generatorIds()` and
never spells an id.

**Layout.** One pure module owns the `diagrams` segment, the `ADR-NNN-<slug>` stem, the paths, the
brief reader, the block writer and the link parser. It reads no disk: text and listings come in as
arguments. That is what lets story 03's lane stay pure and story 04's UI stay independent of it.
FF-13302 lands here and sweeps `src/**` for any second spelling.

**Registry and adapter.** A frozen map built from each adapter's own `id`. The one adapter is the
only file under `src/` that spells its name (FF-13301, which also sweeps `src/bundle/**`). `locate`
takes `home` as an argument. The CLI face passes `os.homedir()`, so suites steer it with
`HOME`/`USERPROFILE`. `toSvg` is the plugin's documented SVG procedure done in Node, and it is
deterministic.

`diagram:plan` is a registry command in a new `diagram` command family, wired into the CLI's
top-level dispatch the way `graph` is. The check order is in task 03's rulings. Off is answered
before any ADR check. The command writes nothing, not even the folder.

The four new directories (the diagram engine, the command family, and the two suite
directories) are declared EXEMPTIONS in the source-directory budget, each naming its
eventual members (including story 02's `rasterize.mjs` and `export.mjs`), so story 02 edits no
budget line. Register both new test indexes with the test runner.

## The verification step

The end-to-end check is task 03 run against a temp project with a fixture home: off, missing, the
full plan and each refusal, all through the real CLI, with exit codes read unpiped. Then run the
focused suites and the two new arch-tests through the runner's `--only` selection with
`AOF_GLOBAL_HOME` set to a fresh temp directory. Record a red probe for FF-13301 (spell the id in
`config-inspect.mjs`) and for FF-13302 (build a `"diagrams/"` path outside the layout) in
`VERIFICATION.md`. Never run the full suite on this machine.

## Out of scope

- The SVG and PNG writes and the rasterizer (story 02). `toSvg` is here only because it is the
  adapter's half of the contract.
- Anything that reads the real `~/.claude` or the real plugin tree in a suite.
- Turning diagrams on for this repo (story 06).
