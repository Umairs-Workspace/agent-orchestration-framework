@executable @cli @work @work-stream
Feature: --teach is answered by the build door, with manual's refusals

  WHY. Teaching enters where manual enters, so it inherits the refusals 149 proved in code (spike 178
  Finding item 1). The door takes injected operator-led modes as `{ flag, command, description }`
  descriptors. `@aof/learning` supplies teach's, and core composes it (ADR-002, ADR-004 §3). Rows
  land beside 188/00's in `test/surfaces/board-mesh-execution.test.mjs`.

  Rule: R1 · A teaching continue is one story or task, started here

    Scenario: E1 · a local teaching continue names the teach command and starts the story
      Given story 188/01 is `not-started` and nothing has run it
      When `aof work continue 188/01 --teach` runs
      Then it prints `Continue "188/01" here — run: /aof:teach 188/01`
      And `aof work status 188/01` answers `in-progress`

    Scenario: E2 · a teaching continue of a milestone is refused before anything moves
      When `aof work continue 179 --teach --json` runs
      Then it exits non-zero with `continue-teach-not-a-story`
      And 179's status is unchanged

    Scenario: E3 · a teaching continue on another node is refused and mints nothing
      When `aof work continue 188/01 --teach --node node-2976 --json` runs
      Then it exits non-zero with `continue-teach-remote`
      And no assignment exists for 179

    Scenario Outline: teach is refused wherever manual is
      Given <state>
      When the continue door is called with `{ ref: "<ref>", teach: true }`
      Then it is refused `<code>`, and nothing is minted, dispatched or moved

      Examples:
        | state                                               | ref | code                       |
        | story 149's last run was on node-2976, none active  | 149 | continue-teach-remote      |
        | milestone 148 has never run                         | 148 | continue-teach-not-a-story |
        | uat session 32 has never run                        | 32  | continue-teach-not-a-story |

    Scenario: a teaching continue of a story already running on a worker answers where it runs
      Given milestone 148 is running on node-2976
      When the continue door is called with `{ ref: "148/01", teach: true }`
      Then it answers `running` on `node-2976`, exactly as without `teach`

  Rule: R2 · Teaching and manual never run together

    Scenario: E4 · manual and teach together are refused before anything moves
      Given story 188/01 is `not-started`
      When `aof work continue 188/01 --manual --teach --json` runs
      Then it exits non-zero with `continue-modes-exclusive`
      And `aof work status 188/01` answers `not-started`

    Scenario: E5 · refine and verify do not take --teach
      When `aof work refine 149 --teach --json` and `aof work verify 149 --teach --json` run
      Then each exits non-zero naming `Unknown flag "--teach"`

    Scenario: the loop never composes --teach
      When every phase command the loop composes is collected, as 149/01's control in `test/loop/drive-command-phase-drivers.test.mjs` collects them
      Then none carries `--teach`, as none carries `--manual`

    Scenario: the CLI usage and command inventory carry --teach
      When `aof work continue --help` is read
      Then its usage is `aof work continue <ref> [--node <id>] [--manual] [--teach] [--json]`
      And `test/fixtures/application/command-inventory.json` lists `teach` as a boolean input of `work:continue` only
