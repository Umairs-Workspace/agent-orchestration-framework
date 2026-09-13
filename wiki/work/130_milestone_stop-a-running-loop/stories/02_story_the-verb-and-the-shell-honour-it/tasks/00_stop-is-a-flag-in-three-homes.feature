@executable @cli @work @work-stream
Feature: --stop is a flag in three homes, never enters the foreground body, and the probe is byte-identical without it

  ADR-002 §1-§2, §8. 126/ADR-002 §6's rule: a flag lands in the closed input schema, in
  `cli.spec.flags` and in `cli.argv`, or it does not exist. `--stop` lands in all three and in the
  usage string. `launch` answers `null` for `--stop` exactly as it does for `--dry-run` — a stop
  never enters the foreground body, never installs the diag recorder and never reaches a PTY; it
  prints through `render`. `--stop` with `--resume` is refused, coded `loop-stop-exclusive` (400),
  before any read. `run` dispatches: `input.stop === true` → `stopLoopCommand`, otherwise the
  byte-identical `probeLoop` — FF-5304's ten-key read-only probe is not edited. `work:loop` stays
  in `BOARD_DEFERRED`: no `/api/work/loop` route exists after this task.

  RULINGS (QA, 2026-09-13). (1) The dispatch reads `stop` ALONE (ADR-002 §2): `--stop --dry-run`
  and `--stop --quiet` reach `stopLoopCommand` and WRITE the request — `dryRun` is the launch
  predicate's concern (it selects `run` over the body) and is not a guard on the write; there is
  no dry stop. (2) `stop: false` is the probe: the predicate is `=== true`, as `resume` and
  `dryRun` are. (3) `level` and `cap` play no part in a stop — the verb reads run records only
  (ADR-002 §7). (4) FF-12602 leg 4 pins the schema's property list and the flag count; both
  move by exactly `stop` (nine properties, eight flags) in the same diff.

  Background:
    Given the registered `work:loop` command from `src/command-core.mjs`
    And a loop fixture over stream `03` with a fake driver injected through `ctx.agentSessionDriverOptions`
    And an isolated aof home, so `loop-stops` under it is this test's alone

  Scenario: the three homes and the usage carry the flag
    Then `command.input.properties.stop` deep-equals `{ type: "boolean" }` and `additionalProperties` is still `false`
    And `command.input.required` is still exactly `["scope"]`
    And `command.cli.spec.flags.stop` is `{ type: "boolean", description: <a non-empty string> }`
    And `command.cli.spec.usage` contains `[--stop]`

  Scenario Outline: argv shapes the flag only when it is passed, as --resume and --dry-run are
    When `command.cli.argv(["03"], <options>)` is asked
    Then it deep-equals <input>

    Examples:
      | options                          | input                                        |
      | `{ stop: true }`                 | `{ scope: "03", stop: true }`                |
      | `{}`                             | `{ scope: "03" }`                            |
      | `{ stop: false }`                | `{ scope: "03" }`                            |
      | `{ stop: true, dryRun: true }`   | `{ scope: "03", stop: true, dryRun: true }`  |
      | `{ stop: true, resume: true }`   | `{ scope: "03", stop: true, resume: true }`  |

  Scenario Outline: launch keeps a stop on the probe side, as it keeps dry-run
    When `command.cli.launch(<options>)` is asked
    Then it answers <answer>

    Examples:
      | options                         | answer       |
      | `{ stop: true }`                | `null`       |
      | `{ dryRun: true }`              | `null`       |
      | `{ stop: true, dryRun: true }`  | `null`       |
      | `{ stop: true, quiet: true }`   | `null`       |
      | `{ stop: true, resume: true }`  | `null`       |
      | `{}`                            | a function   |
      | `{ resume: true }`              | a function   |
      | `{ quiet: true }`               | a function   |

  Scenario: stop with resume is refused by code before any read
    Given a `readRuns` spy on the fixture
    When `command.run({ scope: "03", stop: true, resume: true }, ctx)` is awaited
    Then it rejects with a `commandError` whose `code` is `"loop-stop-exclusive"` and `status` is 400
    And the spy recorded no read and no file under the aof home's `loop-stops` was written

  Scenario Outline: run dispatches on stop alone
    Given a declaration `D` with `loopRunId` `"L1"` on scope `"03"` whose latest run is `running` and fresh
    And `treeFiles(projectRoot)` is recorded before the call
    When `command.run(<input>, ctx)` is awaited
    Then it resolves <answer>
    And the aof home's `loop-stops` directory holds <files>
    And `treeFiles(projectRoot)` after the call deep-equals the recording
    And the fake driver's `spawnCalls` is empty

    Examples:
      | input                                                 | answer                                              | files                     |
      | `{ scope: "03" }`                                     | the ten `LoopState` keys in FF-5304's order         | nothing — the directory does not exist |
      | `{ scope: "03", stop: false }`                        | the ten `LoopState` keys in FF-5304's order         | nothing — the directory does not exist |
      | `{ scope: "03", stop: true }`                         | the seven-key document with `loopRunId: "L1"`       | exactly `L1.json`         |
      | `{ scope: "03", stop: true, dryRun: true }`           | the seven-key document with `loopRunId: "L1"`       | exactly `L1.json`         |
      | `{ scope: "03", stop: true, quiet: true }`            | the seven-key document with `loopRunId: "L1"`       | exactly `L1.json`         |
      | `{ scope: "03", stop: true, level: "L1", cap: 9 }`    | the same seven-key document as `{ scope: "03", stop: true }` | exactly `L1.json` |

  Scenario: the board route table is untouched
    When `test/arch/work/acd-work-command-route-coverage.test.mjs`'s `BOARD_DEFERRED` is read
    Then it still contains `"loop"`
    And `src/board-ui.mjs` contains no `"/api/work/loop"` literal

  Scenario: FF-12602 leg 4 admits the ninth property and the eighth flag
    When `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` leg 4 is run against the shell
    Then its expected property list is the eight it pinned plus `stop`, sorted, and its expected flag count is eight
    And `loopCommand.cli.launch({ dryRun: true })` and `loopCommand.cli.launch({ stop: true })` both answer `null` there
