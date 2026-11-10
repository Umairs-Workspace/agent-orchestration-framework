@cli @planning
Feature: Packages come only from the pinned commit

  WHY. Cowork's marketplace dialog follows a repository's default branch and cannot be pinned, so
  aof packages the planner itself. Provenance holds only if every package is built from the exact
  commit the lock will record. A tag that moved, a clone that failed, or a ref that is not a commit
  each produce nothing, and the temporary clone never outlives the run.

  Rule: R1 · Planner packages are built only from the pinned commit

    @executable
    Scenario: E1 · a clone at the recorded commit is packaged
      Given a planner source tree whose HEAD is "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      When the planner is packaged for sha "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      Then packaging succeeds
      And packages are produced for "pm-execution", "pm-product-discovery" and "pm-product-strategy"

    @executable
    Scenario: E2 · a tag that moved is refused, naming both commits
      Given a planner source tree whose HEAD is "9f1c0000000000000000000000000000000000aa"
      When the planner is packaged for sha "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      Then packaging is refused with reason "head-mismatch"
      And the message names "5042ff6169e0df49086c846f69bf7b6cdb67a6de" and "9f1c0000000000000000000000000000000000aa"
      And no package is produced

    @executable
    Scenario: E3 · a failed clone is refused
      Given the planner clone fails
      When the planner is packaged for sha "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      Then packaging is refused with reason "clone-failed"
      And no package is produced

    @executable
    Scenario Outline: E4 · a ref that is not a 40-hex commit is refused before any clone
      When the planner is packaged for sha "<ref>"
      Then packaging is refused with reason "sha-not-pinned"
      And no clone was attempted

      Examples:
        | example | ref                                       |
        | E4      | main                                      |
        |         | v2.0.0                                    |
        |         | 5042ff6                                   |
        |         | 5042FF6169E0DF49086C846F69BF7B6CDB67A6DE  |

  Rule: R4 · The clone leaves nothing behind

    @executable
    Scenario Outline: the temporary clone is removed whatever the outcome
      Given a live-path clone whose HEAD is "<head>"
      When the planner is packaged for sha "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      Then the outcome is "<outcome>"
      And the temporary clone directory no longer exists

      Examples:
        | example | head                                      | outcome   |
        | E9      | 5042ff6169e0df49086c846f69bf7b6cdb67a6de  | packaged  |
        | E10     | 9f1c0000000000000000000000000000000000aa  | refused   |

    @executable
    Scenario: an injected source tree is left in place
      Given a planner source tree whose HEAD is "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      When the planner is packaged for sha "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
      Then the injected source tree still exists

  # The live path: a real HTTPS clone of pm-skills at v2.0.0, checked against the commit the tag
  # resolves to. It needs a network and git on PATH, so a developer runs it and records the
  # resolved commit and the package names in VERIFICATION.md.
  @manual
  Scenario: the live clone at v2.0.0 packages the recorded commit
    Given a working network and git on PATH
    When the planner is packaged live for the sha that "refs/tags/v2.0.0" resolves to
    Then packaging succeeds
    And the clone's HEAD equals that sha
    And no temporary clone directory remains
