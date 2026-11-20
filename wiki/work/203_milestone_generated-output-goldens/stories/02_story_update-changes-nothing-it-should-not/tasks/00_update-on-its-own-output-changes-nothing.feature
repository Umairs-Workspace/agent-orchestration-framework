@executable @cli @assets @scaffold
Feature: Update on its own output changes nothing

  WHY. A user runs `aof work update` on a project that is already current far more often than on
  one that is behind. On a current tree it must change nothing. That is checked over every way a
  project can be initialised, against the same baselines the init lane holds (ADR-006 §1).

  Background:
    Given the "work-init" and "work-update" lanes are registered with the harness

  Rule: R1 · Update on a scenario's own output changes nothing

    Scenario Outline: update after init leaves each init scenario's tree as its baseline
      Given scenario "<scenario>" of lane "work-init" is run with "work update --json" added as a last step
      When its project and home trees are compared with the committed "work-init/<scenario>" baseline
      Then no file is added, removed or changed
      And the update step exits 0 with a summary of 0 created, 0 updated, 0 deleted and 0 drift-warning
      And every planned file is reported skipped

      Examples:
        | example | scenario      |
        | E1      | default       |
        | E2      | claude        |
        | E2      | codex         |
        | E2      | opencode      |
        | E2      | all-practices |
        | E2      | notion        |
        | E2      | hyperagent    |
        | E2      | customised    |

    Scenario: E3 · the rewritten lock compares equal, because only its instants moved
      Given scenario "default" of lane "work-init" is run with "work update --json" added as a last step
      When ".aof/aof.lock.json" after the update is normalised
      Then it equals the "work-init/default" baseline's lock

    Scenario: the check covers every init scenario, including ones added later
      When the idempotence cases are listed
      Then there is one per scenario that lane "work-init" declares, read from the lane, not listed again
