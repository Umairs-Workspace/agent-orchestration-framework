@executable @cli @work @work-stream
Feature: the loop hands a lane halt to a repair session

  WHY. A lane halt is about the loop's own records, not the code built, and today it stops the
  milestone until the operator notices. The three lane stops (`lane-open-failed`,
  `lane-merge-refused`, `lane-merge-conflict`, LOOP_STOPS 13-15) are now handed to a fresh session.
  Every other stop still ends the loop exactly as today.

  The engine declares the handed-over set as `REPAIRABLE_STOPS`, an export of its own, and decides
  the hand-over in a pure `decideHaltRepair`, which imports nothing. `LOOP_STOPS` is unchanged. The
  foreground launch (`runLoopLaunch`) acts on that decision. It writes the hand-over file under the
  aof home at `loop-repairs/<runId>.json`, never inside a checkout, and spawns
  `aof work drive repair <ref> --run <runId> --halt <file> --json` from the primary checkout,
  through the same child-drive seam the sequential drive uses.

  Repair is on unless the operator turns it off: `work.loop.repair` (declared in `loop-bounds`,
  default `true`) and the flag `--no-repair`, which lands in the command's schema, `cli.spec.flags`
  and `cli.argv`.

  Rule: R1 · A lane halt is handed to a fresh session to repair, unless repair is turned off

    Scenario: E1 · a merge-home conflict at 03/03 opens a repair session handed the halt
      Given a loop over milestone 03 whose wave merges lane 03/03 home and the merge conflicts
      When `aof work loop 03` halts `lane-merge-conflict` with producer `dispatch:merge-home:conflict`
      Then exactly one drive is spawned, from the primary checkout, with the arguments `work drive repair 03/03 --run <runId> --halt <file> --json`
      And `<file>` is `<aof home>/loop-repairs/<runId>.json`, and no file was written inside the primary or the lane
      And the hand-over file holds the keys `stop`, `producer`, `ref`, `details`, `diagLog`, `lane`, `branch`, `base`, `tip` and `scope`
      And its `details` is the halt line's `Details:` text exactly as the account printed it
      And its `diagLog` is this invocation's loop-diag log path

    Scenario: E2 · a lane that will not reopen opens a repair session with the same hand-over
      Given a loop over milestone 03 whose lane 03/02 cannot be reopened because its worktree is dirty
      When `aof work loop 03` halts `lane-open-failed` with producer `work:dispatch:assignment-gate-propagation-dirty-worktree`
      Then exactly one drive is spawned with the arguments `work drive repair 03/02 --run <runId> --halt <file> --json`
      And the hand-over file's `stop` is `lane-open-failed` and its `producer` is `work:dispatch:assignment-gate-propagation-dirty-worktree`

    Scenario Outline: each lane stop is handed over when repair is on
      Given repair is on
      When the loop halts `<stop>` at `03/03`
      Then a repair drive is spawned for `03/03`

      Examples:
        | stop                |
        | lane-open-failed    |
        | lane-merge-refused  |
        | lane-merge-conflict |

    Scenario Outline: repair turned off stops the loop exactly as today
      Given `work.loop.repair` is <config>
      When `aof work loop 03 <flags>` halts `<stop>` at `<ref>`
      Then no repair drive is spawned
      And the account's halt line is byte-identical to the one printed before this story
      And the `loop-halted` notification is sent once

      Examples:
        | example | config  | flags       | stop                | ref   |
        | E3      | unset   | --no-repair | lane-merge-conflict | 03/03 |
        | E4      | `false` |             | lane-open-failed    | 03/02 |
        |         | `true`  | --no-repair | lane-merge-refused  | 03/03 |

    Scenario Outline: a value of `work.loop.repair` that is not a boolean is refused before anything is driven
      Given `work.loop.repair` is <value>
      When `aof work loop 03` runs
      Then it is refused `loop-bound-unresolved`, naming `work.loop.repair`
      And no drive of any phase is spawned

      Examples:
        | value     |
        | `"false"` |
        | `0`       |
        | `null`    |

  Rule: R2 · Any other halt still stops for the operator

    Scenario: E5 · the loop reaches a UAT session and stops
      Given repair is on
      When the loop halts `uat-gate` at UAT session `32`
      Then no repair drive is spawned and the loop's account and notification are as before this story

    Scenario: E6 · a red grade on the code stops the loop
      Given repair is on
      When the loop halts `grade-indeterminate` at `03/02`
      Then no repair drive is spawned and the loop's account and notification are as before this story

    Scenario Outline: the engine hands over only the three lane stops
      When `decideHaltRepair` is asked about a halt `<stop>` with repair on and no earlier repair
      Then it answers `<answer>`

      Examples:
        | stop                | answer |
        | lane-open-failed    | repair |
        | lane-merge-refused  | repair |
        | lane-merge-conflict | repair |
        | uat-gate            | stop   |
        | dependency-blocked  | stop   |
        | cap-exhausted       | stop   |
        | deadline-exhausted  | stop   |
        | progress-exhausted  | stop   |
        | no-progress         | stop   |
        | grade-indeterminate | stop   |
        | session-needs-input | stop   |
        | run-not-retryable   | stop   |
        | retry-parked        | stop   |
        | unmapped-item-type  | stop   |
        | operator-interrupt  | stop   |

    Scenario: a halt that parked asks is never handed over
      Given repair is on
      When the loop halts `session-needs-input` with one parked ask
      Then no repair drive is spawned and the ask block is printed as before this story
