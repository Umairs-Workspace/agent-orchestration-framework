@executable @cli @work @work-stream
Feature: one screen model renders what claude drew — a headless emulator loaded lazily, sized once, holding no history, and absent without harm

  ADR-001 §1 to §4, ADR-003 §7. `src/terminal/screen.mjs` answers `createScreen({ cols, rows,
  load })`, a promise of a model or of `null`. A model answers `write(chunk)`, a promise that
  settles once the emulator has parsed the chunk; `snapshot()`, which returns `{ buffer, cursor,
  rows }`; and `dispose()`. `@xterm/headless` is loaded through `load`, whose default is a dynamic
  `import("@xterm/headless")`, on the first call only. The recordings the suites replay live in
  `test/fixtures/claude-screens/<id>.json`.

  RULINGS (PO, 2026-09-27). (1) `buffer` is `"normal"` or `"alternate"`. `cursor` is
  `{ row, col }`, zero-based within the viewport. `rows` has exactly `rows` strings, each the
  viewport row's `translateToString(true)`. (2) The emulator is constructed with the given `cols`
  and `rows` and `scrollback: 0`. (3) A load that throws or rejects answers `null`, reports one
  `screen-model-unavailable` degrade naming the error's `name` and message, and is not retried in
  that process: the outcome is remembered per `load` function, so every later `createScreen` with
  the same `load` answers `null` at once and reports nothing, and a failing injected `load` never
  poisons the default one. (4) A
  fixture is `{ claude, cols, rows, chunks: [{ t, d }] }`: `t` is the offset in milliseconds from
  spawn, `d` the chunk exactly as `onData` delivered it. `claude` is the version recorded from,
  such as `"2.1.283"`, or, for a fixture no claude drew, a string beginning `synthetic:` that names
  its source. (5) This story lands three fixtures: `ready.json` (the REPL frame, RESEARCH Q2),
  `first-run.json` (the theme picker under an isolated `CLAUDE_CONFIG_DIR`) and `usage-limit.json`
  (`synthetic: 129/06 F-58`, the measured line drawn on a REPL frame). The two recordings follow
  RESEARCH Q2's recipe, zero-token, touching no real config. (6) claude's banner draws the cwd and
  the account's plan. A recording is scrubbed with the repository's own substitutions before it is
  committed, each replacement the same length as what it replaces so the frame renders the same,
  and `acd-no-internal-project-names` stays green.

  RULINGS (QA, 2026-09-27). (1) A suite replays a fixture by awaiting `write(d)` for each chunk in
  order, then taking one `snapshot()`; `t` is never waited on. (2) The load seam is how a suite
  proves the degrade: each case injects a fresh `load` function, so the memo needs no reset, and
  resets the degrade sink with `setDegradeSinkForTest` first. (3) "Holds no history" is proved from the constructed options (an injected `load` hands back a
  recording constructor) and from the rendered result: a line pushed off the top is on no row.

  Scenario: the REPL recording renders as the frame claude drew
    Given `test/fixtures/claude-screens/ready.json`
    When its chunks are written in order to `createScreen({ cols: 80, rows: 24 })` and a snapshot is taken
    Then `buffer` is `"alternate"`, `rows` has 24 entries, and the cursor's row begins with `❯` at column 0 with the cursor at column 2
    And the rows directly above and below the cursor's row are 80 `─` characters each

  Scenario: the first-run recording renders on the normal buffer
    Given `test/fixtures/claude-screens/first-run.json`
    When it is replayed through a model of its own `cols` and `rows`
    Then `buffer` is `"normal"`, one row holds ` ❯ 2. Dark mode ✔`, and one row is a run of `╌` characters

  Scenario: a write settles only after the chunk is parsed
    Given a fresh 80×24 model
    When `write("hello")` is awaited and a snapshot is taken at once
    Then row 0 is `hello` and `cursor` is `{ row: 0, col: 5 }`

  Scenario: the model holds no history
    Given an injected `load` whose `Terminal` records the options it was constructed with
    When `createScreen({ cols: 80, rows: 24, load })` is awaited
    Then the recorded options hold `cols` 80, `rows` 24 and `scrollback` 0

  Scenario: a line pushed off the top is gone
    Given a fresh 80×24 model
    When 30 lines `line 1` to `line 30`, each ended by `\r\n`, are written and a snapshot is taken
    Then no row is `line 7`, row 0 is `line 8`, row 22 is `line 30`, and row 23 is empty

  Scenario Outline: every fixture records its source and replays at its own size
    Given `test/fixtures/claude-screens/<fixture>`
    When it is read and replayed
    Then its `claude` field is <claude>, its `chunks` is a non-empty array of `{ t, d }` with `t` non-decreasing, and its snapshot has `rows` entries

    Examples:
      | fixture          | claude                                  |
      | ready.json       | a version string such as `2.1.283`      |
      | first-run.json   | a version string such as `2.1.283`      |
      | usage-limit.json | a string beginning `synthetic:`         |

  Scenario Outline: an absent emulator is no model, said once
    Given a fresh `load` function that <behaviour>, and the degrade sink is the injected test sink
    When `createScreen({ cols: 80, rows: 24, load })` is awaited twice, and then `createScreen({ cols: 80, rows: 24 })` once with the default load
    Then the first two answer `null`, none rejects, `load` was called once, and the sink received exactly one `screen-model-unavailable` event naming <named>
    And the third answers a live model

    Examples:
      | behaviour                                                     | named                          |
      | throws an `Error` whose `code` is `ERR_MODULE_NOT_FOUND`      | `Error` and its message        |
      | rejects with a `TypeError`                                    | `TypeError` and its message    |
      | answers a module with no `Terminal` export                    | the missing `Terminal` export  |

  Scenario: a disposed model is quiet
    Given a live 80×24 model
    When `dispose()` is called and then `write("late")` is called
    Then the write resolves without rejecting, and nothing is thrown
