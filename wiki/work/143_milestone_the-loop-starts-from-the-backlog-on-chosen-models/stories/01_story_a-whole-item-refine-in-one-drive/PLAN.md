# 143/01 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**The bounds leaf.** Copy the `LOOP_CONCURRENCY_MODES` block shape: a frozen
`LOOP_REFINE_MODES = ["per-story", "whole-item"]`, a default bound to element 0, a named export for
element 1 for the shell to compare against, `resolveLoopRefine`, and `loopRefineFromConfig`.
Comment it in the house style, citing 143/ADR-002 and FF-6901. If the work-loops registry or the
bounds audit enumerate the `work.loop.*` keys, they are read-only here; check whether either needs
the new key listed, and do not add it if nothing enumerates.

**The shell.** `requestedSettings` gains `refine`. Validate a given `--refine` against the
vocabulary with the other guards, before any registered read. Refuse `loop-refine-unknown` with the
two members. The resolve rule is: the flag, else (on resume) the declaration's `refine`, else
`loopRefineFromConfig`. `resolveLoopResume` in the engine owns the explicit-wins / absent-inherits
step, as it does for `thinking`. Hand the resolved value to the engine's decision input as `refine`,
beside `concurrency`, and to `declarationFor`. Add `--refine` to the CLI spec in all three homes
(the input schema, `cli.spec.flags` and `cli.argv`) and to the usage line.

**The engine.** It imports nothing, so it compares against one local constant (`WHOLE_ITEM`), as
`REFINE_FIRST` does. In the `type === "milestone"` branch, when the phase is `refine` and
`input.refine === WHOLE_ITEM`, spread `autonomous: true` onto the `boundedDrive` result. Append
`refine` to `buildLoopDeclaration` and `recoverableDeclaration` with a `null` default.

**The drive.** `phaseCommand(phase, ref, mode, { autonomous })` appends ` --autonomous` after the
mode flag. Resolve `autonomous` from `input.autonomous === true`, else
`ctx.loopDrive?.autonomous === true`. Refuse on a non-refine phase before the dry-run return. The
cycle lends `autonomous` from the decision through `ctx.loopDrive` and, on the child path, through
`spawnPhaseDrive`. `spawnLaneDrive` appends `--autonomous` to its argv. Follow exactly how
`thinking` rides today.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `scripts/test.mjs --only`: the
loop-bounds, phase-map, determinism, drive-phase-driver, declaration, declaration-join, resume and
refusals suites, the concurrency single-home arch test, the new FF-14302, and the application
assembly suite. Red-probe FF-14302. Then run `aof work drive refine <a milestone with no stories>
--autonomous --dry-run --json` and read the composed command.

## Out of scope

Changing the refine prompt. An autonomous refine on a milestone that already has stories.
