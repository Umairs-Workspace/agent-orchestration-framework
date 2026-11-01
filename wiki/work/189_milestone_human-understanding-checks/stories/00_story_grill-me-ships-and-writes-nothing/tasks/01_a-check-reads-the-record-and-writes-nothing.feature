@executable @work @assets
Feature: a check reads the record and writes nothing

  WHY. A check that wrote anything could be read as evidence by something else, and a check that
  moved a status would become a gate (ADR-002). So `grill-me.md` holds `aof:explain`'s contract: it
  runs read verbs only, holds no `Edit` or `Write` tool, prints its exercises in the terminal and runs
  no project code. Its refusals are prose, because a wrong carry-on still writes nothing. FF-18901
  enforces the read-only half, in `test/arch/command/acd-grill-me-writes-nothing.test.mjs`. The
  prompt is cut into its marked regions, as `teach-frame.suite.mjs` cuts `teach.md`.

  Rule: R2 · A check writes nothing, so nothing it observes reaches a gate

    Scenario: E3 · the prompt promises no run, no status move and no file
      When the `<read_only>` region of `packages/learning/assets/commands/grill-me.md` is read
      Then it says the command mints no run, moves no status and writes no file
      And it says no review, `@uat` or `aof:verify` reads what a check observed
      And it says exercises are printed in the terminal and never written into the project

    Scenario: E4 · a milestone names its stories and is not checked
      When the `<process>` region is read
      Then a milestone ref runs `aof work list <ref>` and names its stories to check one at a time
      And no check is put for the milestone itself

    Scenario: E5 · an unrefined story is sent to refine
      When the `<process>` region is read
      Then a story with no `reads:`, or with untagged tasks, is sent to `aof:refine <ref>` and no check is put

    Scenario: FF-18901 · a check writes nothing
      When `test/arch/command/acd-grill-me-writes-nothing.test.mjs` runs
      Then it fails if `grill-me.md`'s `allowed-tools` holds `Edit` or `Write`
      And it fails if `grill-me.md` spells an `aof` verb other than `work find`, `work doc`, `work list` or `work tasks`

    Scenario Outline: FF-18901 · each write verb planted in the prompt turns the control red
      Given `grill-me.md` with `<planted>` added to its `<process>` region
      When the FF-18901 check runs over that text
      Then it reports `<planted>` as a verb a check may not run

      Examples:
        | planted                   |
        | aof work run-start <ref>  |
        | aof work run-complete <ref> |
        | aof work status <ref>     |
        | aof work continue <ref>   |
        | aof work feedback <ref>   |
        | aof test --scope impacted |

    Scenario: the check runs no project code
      When the `<read_only>` region is read
      Then it says the session runs no project code and no tests
      And it says a prediction is compared with the contract's example or with output the human produces by running the code themselves
