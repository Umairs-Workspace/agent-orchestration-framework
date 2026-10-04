@executable @cli @work @work-stream
Feature: manual is one story, run here, at every door

  WHY. The operator is on this machine, so a manual continue can never be dispatched, and it guides
  one story at a time. The prompt says so for the slash command. The CLI door `work:continue`
  (`packages/work/src/commands/continue.mjs`), which the board and the fleet also go through, says
  so in code.

  The door takes a boolean input `manual`, declared only on the `continue` door: in its input
  schema, `cli.spec.flags`, `cli.argv` and the usage line
  `aof work continue <ref> [--node <id>] [--manual] [--json]`. The `refine` and `verify` doors are
  unchanged. A manual continue is checked after the backlog refusal and the `beforeBuild` checks,
  and before the overlay is read. A ref that is not a story or a task is refused
  `continue-manual-not-a-story`. Once the decision is made, a `remote` answer is refused
  `continue-manual-remote`, whether a `--node` asked for it or the last node did. Both refusals
  are 409, mint nothing, dispatch nothing and move no status. A `running` answer is returned as
  today. A `local` answer appends ` --manual` to the command and starts the story as any local
  continue does.

  The door's rows land in `test/surfaces/board-mesh-execution.test.mjs`, which owns the continue
  decision. The loop row lands in `test/loop/drive-command-phase-drivers.test.mjs`.

  Rule: R2 · Manual is one story, here, at every door

    Scenario: E5 · --manual with --solo is stopped as contradictory
      When the execution-mode paragraph of `packages/core/assets/commands/continue.md` is read
      Then it says `--manual` together with `--solo` or `--orchestrated` is contradictory
      And it says the session stops before any role runs and before any run is minted

    Scenario: E6 · a manual continue on a milestone is refused, naming its ready stories
      When the `<manual_mode>` region of `continue.md` is read
      Then it says a milestone or a `NN/MM-PP` span is refused before any run is minted
      And it says the refusal names the ready stories `aof work next <ref> --json` answers, to take one at a time

    Scenario: E7 · the CLI door answers the manual command here
      Given story 149 is `not-started` and no node has run it
      When `aof work continue 149 --manual --json` runs
      Then it answers `where` `local` and `command` `/aof:continue 149 --manual`
      And the rendered line is `Continue "149" here — run: /aof:continue 149 --manual`
      And story 149 is `in-progress`

    Scenario: E8 · the CLI door refuses a manual continue on another node
      Given story 149 is `not-started` and no node has run it
      When `aof work continue 149 --manual --node node-2976 --json` runs
      Then it is refused `continue-manual-remote`
      And no assignment exists for 149 and story 149 is still `not-started`

    Scenario Outline: the door refuses a manual continue it cannot run here
      Given <state>
      When `aof work continue <ref> --manual --json` runs
      Then it is refused `<code>`, nothing is minted or dispatched, and the item's status is unchanged

      Examples:
        | state                                                       | ref | code                       |
        | story 149's last run was on node-2976 and none is active    | 149 | continue-manual-remote     |
        | milestone 148 has never run                                 | 148 | continue-manual-not-a-story |
        | uat session 32 has never run                                | 32  | continue-manual-not-a-story |

    Scenario: a manual continue of a story already running on a worker answers where it runs
      Given milestone 148 is actively running on node-2976
      When `aof work continue 148/01 --manual --json` runs
      Then it answers `where` `running` and `node` `node-2976`, exactly as without `--manual`

    Scenario Outline: without --manual every door answers as before
      When `<command>` runs
      Then <outcome>

      Examples:
        | command                                   | outcome                                                          |
        | aof work continue 149 --json              | it answers `command` `/aof:continue 149`                         |
        | aof work refine 149 --manual --json       | it is refused as an unknown flag, and nothing moves              |
        | aof work verify 149 --manual --json       | it is refused as an unknown flag, and nothing moves              |

    Scenario: the command inventory carries the new input
      When `test/fixtures/application/command-inventory.json` is compared with the registry
      Then `work:continue` declares `manual` as a boolean and its usage reads `aof work continue <ref> [--node <id>] [--manual] [--json]`
      And `work:refine` and `work:verify` declare no `manual`

    Scenario: the loop never composes --manual
      Given `work.loop.agents.continue.mode` is `"manual"` in the project config
      When the loop drives a continue of `03/01`
      Then the typed command is `/aof:continue 03/01 --solo`
