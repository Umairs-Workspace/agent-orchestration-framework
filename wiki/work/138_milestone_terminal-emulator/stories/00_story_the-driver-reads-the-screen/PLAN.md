# 00 · The driver reads the screen — build plan

## Mechanism

Three new leaves first, then one rewire of the driver's promise body. Nothing else in `src/`
moves.

1. **Approval, then the package.** Task 00 blocks every other task: without the package the model
   suites cannot go green, and only the byte path is testable.
2. **The model is a thin wrapper.** `createScreen` awaits `load()` once per loader (a `WeakMap`
   keyed by the function), takes `Terminal` from the module or its `default` (the package is
   CommonJS under `import()`), and builds it with `{ cols, rows, scrollback: 0 }`. `write` wraps `terminal.write(data, callback)` in a promise. `snapshot` reads
   `terminal.buffer.active`: `type`, `cursorY`/`cursorX`, and `getLine(viewportY + i)` for each
   viewport row.
3. **The door owns every screen fact.** `openSessionScreen` opens the model (or none), counts
   pending writes, and runs one recognition pass when the count returns to zero: that is the
   coalescing. Each pass reads `wait` entries on their own, then the first claiming entry of the
   rest decides the frame. The byte gate moves in verbatim as the no-model branch, keeping its own
   byte string exactly as the driver kept it. The door also answers `parked()`, `markPaste()` and
   `evidence()`.
4. **The driver acts on verdicts.** Open the door after the pre-spawn refusals, just before the
   spawn; dispose it at the single settle point, after evidence. `onData` feeds the door, calls
   `onOutputChunk` as today, and runs the sentinel carry. The ready gate keys on `door.model`: with
   a model, type on the first `ready`; without, today's floor-plus-marker. Keep `typeOnce`, the
   submit timer and the acceptance watch as they are. `consent` and `blocked` handling sits beside
   `stopForOutcome`; `blocked` passes `screen: { id }` through the requested outcome into
   `finish`'s resolved object.
5. **Evidence at the decision.** `stopForOutcome` takes `door.evidence()` before
   `terminateTreeExec`, unless the outcome is `done`. The unasked exits (`onExit` non-zero, the
   liveness probe with no requested stop) take it in the settle. A flag makes it once per
   invocation.
6. **Degrade key last.** `lastByCode` becomes keyed by `code` or `code + NUL + key`. Pass
   `screen` through to `sink.write` only when it is a plain object.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `node scripts/test.mjs --only` over every suite this
story writes or reads, and the standing controls the milestone's fitness section cites. Never the
impacted scope: new paths widen it to the whole suite. Then one zero-token probe
from a scratch directory: a real `claude` under an empty `CLAUDE_CONFIG_DIR`, driven through
`driveInteractiveClaudeSession` with `commandDelayMs` 5000 and `readyCapMs` 15000. It must type
nothing and stop `failed / timeout` at the cap, with a `screen-not-ready` line in `degrade.log`
whose rows are the theme picker. That proves the live model renders a real frame. A wrong build
shows as a paste into the picker, or as byte-tail evidence.

## Out of scope

- The `trust`, `mcp-approval`, `first-run` and `login` entries, their recordings, FF-13802, and the
  loop's narration of the id. All of that is story 01's.
- The mesh worker's status frame. It carries the driver's result as it stands, and nothing here
  edits `mesh/worker-execution.mjs`.
- Moving the root `terminal-*.mjs` modules into the family (ADR-001 §6).

## Known traps

- `reportDegrade` throttles per code for 5 s. Reset the sink in every case that asserts an event.
- xterm's `write` callback fires asynchronously. A test that asserts right after `emit` must
  await the settled frame, not a timer guess.
- The existing `2026-09-24`/`2026-09-27` driver cases emit byte strings that are never a REPL
  frame. Move them to the byte path by injection (task 03, QA 3), or they stop at the cap.
- `acd-no-new-silent-catch` counts `catch` blocks. The loader's catch reports
  `screen-model-unavailable`, and the model's own catches report too.
- The first-run fixture must not be what a cap case draws: story 01 registers it as blocking.
- `test/session` is at 37 of 37. Every new case goes in `test/terminal`.
