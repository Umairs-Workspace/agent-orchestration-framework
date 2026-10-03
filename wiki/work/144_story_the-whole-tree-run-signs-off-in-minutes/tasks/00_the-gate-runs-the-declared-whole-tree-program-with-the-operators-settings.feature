@executable @cli @work @work-stream
Feature: the gate runs the declared whole-tree program with the operator's settings

  `aof work regression-gate <ref>` still runs over `aof test`'s body at scope `all`. What changes is
  which program that body launches. A project may declare a whole-tree program for the gate under
  `work.test.gate`, with `args` (an argv vector that replaces `work.test.args` for the gate run
  only) and an optional `jobsArgs` (an argv template in which `{jobs}` expands once). This repo
  declares `scripts/test-sharded.mjs` there. With no `work.test.gate`, the gate runs `work.test`
  exactly as before, so another project's gate is unchanged.

  The operator passes the run's settings on the command line: `--serial` runs the plain
  `work.test` program, and `--jobs <N>` sets the worker count through `jobsArgs`. The scope stays
  `all`, the dirty-tree refusal still comes first, and no setting narrows what runs.

  Background:
    Given `work.test` declares `{ "command": "node", "args": ["scripts/test.mjs"] }`
    And `work.test.gate` declares `{ "args": ["scripts/test-sharded.mjs"], "jobsArgs": ["--jobs", "{jobs}"] }`
    And the checkout is clean at HEAD `abc1234`

  Scenario: a green sharded run is recorded as a gate that satisfies the door
    Given the declared gate program exits 0 and reports no failure
    When `aof work regression-gate 134 --json` runs
    Then it launched `node scripts/test-sharded.mjs`
    And `134`'s `REGRESSION.md` gains one row with commit `abc1234`, scope `all` and result `green`
    And the envelope's `satisfiesDoor` is `true`
    And no `--gate-override` is needed for `aof work status 134 done` to pass the regression door

  Scenario Outline: the operator's settings choose the program and the worker count
    When `aof work regression-gate 134 <flags>` runs
    Then it launched `<argv>`
    And the row's scope is `all`

    Examples:
      | flags            | argv                                     |
      |                  | node scripts/test-sharded.mjs            |
      | --jobs 8         | node scripts/test-sharded.mjs --jobs 8   |
      | --serial         | node scripts/test.mjs                    |

  Scenario: with no gate program declared the gate runs the test program as before
    Given `work.test.gate` is absent
    When `aof work regression-gate 134` runs
    Then it launched `node scripts/test.mjs`
    And the row's detail names the run as `serial`, as task 02 defines

  Scenario Outline: a setting the gate cannot honour is refused before anything runs
    Given `work.test.gate` is <gate>
    When `aof work regression-gate 134 <flags> --json` runs
    Then it refuses with the code `<code>`
    And no program was launched and `REGRESSION.md` is unchanged

    Examples:
      | gate                                                  | flags              | code                              |
      | as in the Background                                  | --serial --jobs 4  | regression-gate-settings-conflict |
      | as in the Background                                  | --jobs 0           | regression-gate-jobs-invalid      |
      | as in the Background                                  | --jobs many        | regression-gate-jobs-invalid      |
      | `{ "args": ["scripts/test-sharded.mjs"] }`            | --jobs 4           | regression-gate-jobs-undeclared   |
      | absent                                                | --jobs 4           | regression-gate-jobs-undeclared   |

  Scenario Outline: a malformed gate declaration is the toolchain's own refusal, recorded red
    Given `work.test.gate` declares <declared>
    When `aof work regression-gate 134 --json` runs
    Then no program was launched
    And the row it appends is `red` and its detail names `work.test.gate.<key>`

    Examples:
      | declared                                                        | key      |
      | `{ "args": "scripts/test-sharded.mjs" }`                        | args     |
      | `{ "args": ["scripts/test-sharded.mjs"], "jobsArgs": "--jobs" }`| jobsArgs |

  Scenario: settings never get past the dirty-tree refusal
    Given the checkout has an uncommitted change to `packages/work/src/grade.mjs`
    When `aof work regression-gate 134 --jobs 8 --json` runs
    Then it refuses with the code `regression-gate-dirty-tree`, naming `packages/work/src/grade.mjs`
    And no program was launched and `REGRESSION.md` is unchanged

  @docs
  Scenario: the usage and the operator guide name the settings
    When `aof work regression-gate --help` prints its usage
    Then it reads `aof work regression-gate <ref> [--serial] [--jobs N] [--json]`
    And `docs/acd.md` says the gate runs `work.test.gate` when declared, and names `--serial` and `--jobs`
