Feature: A selection launches its declared entry
  A project may declare the program a selection launches, separately from the one its whole-tree
  run launches. When it declares nothing, a selection launches exactly as it does today.

  @executable @cli @work @work-stream
  Scenario Outline: The selection argv a declaration composes
    Given work.test declares args <args>, selectArgs <selectArgs> and selectProgramArgs <selectProgramArgs>
    When aof test composes the launch for <files>
    Then the argument vector is <argv>

    Examples:
      | args                 | selectArgs           | selectProgramArgs           | files                  | argv                                                    |
      | ["scripts/test.mjs"] | ["{file}"]           | ["scripts/test-shard.mjs"]  | ["a.test.mjs"]         | ["scripts/test-shard.mjs", "a.test.mjs"]                |
      | ["scripts/test.mjs"] | ["{file}"]           | ["scripts/test-shard.mjs"]  | ["a.mjs", "b.mjs"]     | ["scripts/test-shard.mjs", "a.mjs", "b.mjs"]            |
      | ["scripts/test.mjs"] | ["--only", "{file}"] | absent                      | ["a.test.mjs"]         | ["scripts/test.mjs", "--only", "a.test.mjs"]            |
      | ["scripts/test.mjs"] | ["{file}"]           | ["scripts/test-shard.mjs"]  | []                     | ["scripts/test.mjs"]                                    |

  @executable @cli @work @work-stream
  Scenario: The whole-tree gate never launches the selection entry
    Given work.test declares selectProgramArgs ["scripts/test-shard.mjs"] and a gate with args ["scripts/test-sharded.mjs"]
    When the regression gate composes its launch
    Then the argument vector begins with "scripts/test-sharded.mjs"

  @executable @cli @work @work-stream
  Scenario Outline: A malformed selection entry is the toolchain's own refusal
    Given work.test declares selectProgramArgs <value>
    When aof test resolves the toolchain
    Then it refuses with "test-runner-declaration-invalid" keyed "work.test.selectProgramArgs"
    And the message says <why>

    Examples:
      | value                     | why                                      |
      | "scripts/test-shard.mjs"  | it must be an array, one argument each   |
      | ["scripts/x.mjs", 7]      | index 1 holds a non-string               |

  @executable @cli @work @work-stream
  Scenario: This repository declares the shard entry for selections
    When the repository's own .aof/aof.config.json is read
    Then work.test.selectProgramArgs is ["scripts/test-shard.mjs"] and work.test.selectArgs is ["{file}"]
    And work.test.args is still ["scripts/test.mjs"], which the census reads as the runner
