# 143/03 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**The shell (`commands/loop.mjs`).** Replace `requestedThinking` with one `requestedSessions(input)`.
It normalises `input.model` and `input.thinking` to arrays (a string from an older caller becomes a
one-element array) and calls `parseSessionChoices`, throwing a `commandError` with the refusal's code
and a 400 status. On resume, hand the parsed choices and an `explicit` boolean (whether any session
flag was given) to `resolveLoopResume`. Resolve all three phases with `resolveSessionLaunch(config,
phase, { choice })` into the `sessions` table. Derive `thinking`, the unphased `--thinking` level,
for 141's key. Thread both through `declarationFor`. Mark `model` and `thinking` `repeatable: true`
in `cli.spec.flags`. Type both as arrays in the input schema, and pass them through `cli.argv`.
`thinkingNarration` becomes `sessionsNarration(sessions)` and reads only the table. The probe adds
`sessions`.

**The engine.** Append `sessions` to `buildLoopDeclaration` and `recoverableDeclaration` with a
`null` default, copying plain values. In `resolveLoopResume`, when `explicit` is false, rebuild the
choices from the recorded table's flag-sourced parts (`modelSource`/`effortSource` of `--model` or
`--thinking`). With no recorded `sessions`, fall back to the declaration's `thinking`. Return the
choices for the shell to resolve against the current config, so config parts re-resolve. The engine
imports nothing, so the source strings are compared as local constants.

**The lend.** Store the parsed choice per phase on the resolved invocation. The cycle passes the
flag parts for the drive's phase: `ctx.loopDrive.model` / `.thinking` in-process, and `model` /
`thinking` to `spawnPhaseDrive` on the child path. `wave.mjs` does the same for `continue` lanes, in
place of today's single `resolved.thinking`. `spawnLaneDrive` appends `--model <id>` beside
`--thinking`. Follow exactly how `thinking` rides today, and keep the "absent passes nothing" guard.

**The drive.** Add `model: { type: "string" }` (not repeatable). Resolve with `input.model`, then
`ctx.loopDrive.model`. Pass it to `resolveSessionLaunch` as a choice with `modelFlag: "--model"`,
alongside the existing `thinking`. The dry run returns `model: { id, source } | null` beside
`effort`. The launch already passes `session.model` to the driver, so nothing changes there.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `scripts/test.mjs --only`: the
drive-phase-driver, declaration, declaration-join, resume, wave, narration, probe and refusals
suites, the narration and attempt-clock arch tests, FF-14303, FF-7006 and the application assembly
suite. Then install the payload (the local installer with `--skip-ui`) and check
`aof --version`. Run `aof work loop 143 --model refine=opus:xhigh --model verify=fable --dry-run
--json` and read `sessions`. Do not start a live loop from an agent shell.

## Out of scope

Subagent role models (`work.agents.models`). A per-drive run-record key.
