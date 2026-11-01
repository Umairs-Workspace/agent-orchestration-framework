@executable @cli @work @work-stream
Feature: the door answers --manual with the manual command, and manual never carries on a build

  WHY. Board and CLI still reach manual through `aof work continue <ref> --manual`. The door's
  refusals stay as 149 shipped them, codes included. A local answer now names `/aof:manual <ref>`,
  as a milestone continue names `/aof:autonomous` (ADR-002 §3). The manual command's first act is
  that door, so its refusals are code. It never walks the re-entry sweep, so it cannot carry on an
  agent lineage (ADR-003 §1–§2, spike 178 item 4). Rows land beside 149/01's in
  `test/surfaces/board-mesh-execution.test.mjs`. The prompt rows land in
  `test/loop/autonomous-shell-out-prompt.test.mjs`.

  Rule: R2 · The door answers --manual with the manual command

    Scenario: E3 · a local manual continue names the manual command and starts the story
      Given story 149 is `not-started` and nothing has run it
      When `aof work continue 149 --manual` runs
      Then it prints `Continue "149" here — run: /aof:manual 149`
      And its JSON `command` is `/aof:manual 149`
      And `aof work status 149` answers `in-progress`

    Scenario: E4 · a manual session on a milestone is refused at the door and names the ready stories
      When `packages/core/assets/commands/manual.md` is read
      Then it says its first act is `aof work continue <ref> --manual --json`
      And it says a `continue-manual-not-a-story` refusal for a milestone or span runs `aof work next <ref> --json` and names the ready stories to take one at a time
      And it says nothing is minted after a door refusal

    Scenario Outline: the door's manual refusals are unchanged
      Given <state>
      When the continue door is called with `{ ref: "<ref>", manual: true }`
      Then it is refused `<code>`, and nothing is minted, dispatched or moved

      Examples:
        | state                                               | ref | code                        |
        | story 149's last run was on node-2976, none active  | 149 | continue-manual-remote      |
        | milestone 148 has never run                         | 148 | continue-manual-not-a-story |
        | uat session 32 has never run                        | 32  | continue-manual-not-a-story |

    Scenario: a manual continue of a story already running on a worker answers where it runs
      Given milestone 148 is running on node-2976
      When the continue door is called with `{ ref: "148/01", manual: true }`
      Then it answers `running` on `node-2976`, exactly as without `manual`

  Rule: R3 · A manual session never carries on an agent build

    Scenario: E5 · a READY agent lineage is reported, never resumed
      When `packages/core/assets/commands/manual.md` is read
      Then it says the session does not walk the re-entry sweep and never runs `aof work resume`
      And it says a `duplicate-run` refusal from `aof work run-start <ref> --json` is reported and the session stops
      And it says a resumed session is not a manual session until `aof:manual <ref>` is invoked again
