@executable @cli @planning
Feature: The plan-branch check extracts on Windows

  WHY. Git splits a checkout prefix into directories on forward slashes only, so a prefix built with
  the platform separator fails on Windows and the check can never run there.

  Rule: R1 · The temporary checkout is extracted whatever the platform separator

    Scenario: E1 · a plan branch with nested files is extracted and validated
      Given a plan branch that adds "wiki/work/backlog/milestone_x/SPEC.md"
      When "aof work integrations hyperagent check" runs on it
      Then the branch is extracted into a temporary checkout and validated, and the checkout is removed afterwards
