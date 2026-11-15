# 191/04 · Build brief

## Mechanism

`stop-request.mjs` gains the start trio beside the resume trio, in their style. The segment is
`loop-starts`, spelled once, and each file is `<workspaceId>--<scope>.json` with both parts
passed through `segmentOf`. `stop.mjs` gains `handOffStart(workspace, { scope, level, now })`
beside `handOffLoop`. It reads the scope's runs exactly as the hand-off does, refuses running or
resumable scopes as values, and otherwise writes the request. `commands/loop.mjs` dispatches
`startHandOff` before the stop and the probe, as `handOff` is dispatched, and declares the flag. At
a launch with `supervised` and without `resume`, once the declaration is written, it clears its
scope's start request, at the same point where `--resume` clears a resume request.

`argvFor` takes `{ supervised: true }` and emits `SUPERVISED_FLAG`. `supervisedDeclarations` reads
the start requests per member workspace and adds one row each for a scope that is not running, with
id `start:<workspaceId>:<scope>`.

## Known traps

- The compute-budget gate must apply to start rows too. Add them before the gate, not after.
- `--hand-off-start` alongside `--stop`, `--resume`, `--hand-off` or `--dry-run` is a refusal at the
  parser, as `--hand-off` with `--stop` already is.
- The command-inventory golden changes with the new input key and flag. Regenerate it, never
  hand-edit it.

## Verification

The loop resume and declarations suites cover each refusal, the row's argv and the clear. FF-19105's
leg and its red probe. By hand on this laptop: `aof work loop <a fresh scope> --hand-off-start`,
then `aof mesh status --declarations --json` lists the start row, and the desktop app starts it.

## Out of scope

`/loop start` in Discord (06). Any change to the desktop app.
