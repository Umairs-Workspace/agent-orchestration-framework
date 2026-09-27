# 01 · Blocking screens are named — build plan

## Mechanism

Recordings first (landed at `93039d9`, with the arrow probe in RESEARCH Q5), then the door's
consent navigation, then four registry entries, then three small pass-throughs in the loop
family. The driver is not touched: 00 wired every verdict kind.

1. **Capture before coding.** Done for the three recordings. The last `@manual` leg, the arrow order
   measured live, ran at the re-refine; paste its evidence into `VERIFICATION.md`.
1a. **Navigate by the screen (ADR-003 §4 as amended).**
    - `screen.mjs`'s snapshot adds `cursorKeys` from xterm's `modes.applicationCursorKeysMode`.
    - In the door, the consent state per id becomes a small machine: a key awaiting its frame, the
      highlight it left, the keys spent, then `entered`.
    - Each settled frame either confirms the last key (the highlight moved toward the option) or
      decides against it (moved away).
    - A `CONSENT_STEP_MS` timer, cleared on confirm and on dispose, names an arrow the screen never
      showed.
    - Read the menu's items as rows sharing the highlighted item's text column, so an option in
      the dialog's prose is never taken for an item.
2. **Recognisers from the frames, not from memory.** Render each recording and read its rows
   before writing its recogniser. Key each one on the buffer kind, the menu structure (an indented
   `❯`, dashed rules) and one line of the dialog's own words. Then check the entry against every
   other recording and against `ready.json` with its words quoted above the box. A recogniser
   that matches on words alone fails the quoted-words case.
3. **The loop only relays a name.** In `childDriveOutcome`, spread a sanitised `{ id }` when the
   document's `screen` passes the shape check. In the wave, both settle narrations read
   `phaseRun.outcome.screen?.id`. Where a halt is built from a failed run (the retry ladder's store
   stop, and the wave's not-done halt), add `screen: phaseRun.outcome.screen?.id` beside
   `failureReason`, leaving `reportFacts` to print it. Check the sequential shell's in-process drive
   keeps `screen` when it builds its outcome.
4. **The control last.** FF-13802 reuses task 01's replay helper. Its detector is a pure function
   over `{ registry, fixtures }`, so each plant is a copy, never an edit.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `node scripts/test.mjs --only` over the registry suite,
FF-13802, the three loop suites this story writes, 00's four `test/terminal` suites and FF-13801,
and `acd-loop-family-boundary`. Then one zero-token live check: a real `claude` under an empty
`CLAUDE_CONFIG_DIR`, driven through `driveInteractiveClaudeSession` from a scratch directory with
`commandDelayMs` 5000. It resolves `failed / blocked_screen` with `screen: { id: "first-run" }`
within seconds, not at the cap. A wrong build shows as `screen-not-ready` after 60 s, or as an
Enter sent into the theme picker.

## Out of scope

- Any change to the driver. The door and the model change only for the consent's navigation and
  its cursor-key mode (the operator's decision, 2026-09-27).
- An `update-notice` entry. Nothing was recorded (ADR-003 §2).
- Answering MCP approval from the checkout's settings (ADR-003, rejected for v1).
- The live proof on this node and the WSL node, which is 02's.

## Known traps

- The trust capture writes into the operator's real `~/.claude.json`, which live sessions share.
  Never rewrite the whole file from an old read; delete the two keys in one step.
- The MCP dialog comes after trust in an untrusted folder. Record it in a second launch, or the
  fixture holds two screens.
- `test/loop` suites spawn children and real git worktrees. Run them with `--only`, never under
  another suite's load.
- `reportFacts` prints a detail's value with `JSON.stringify` unless it is a string, so pass the id
  string, not the `{ id }` object.
