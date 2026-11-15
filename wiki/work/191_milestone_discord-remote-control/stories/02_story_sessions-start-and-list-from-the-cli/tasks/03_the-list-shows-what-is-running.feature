@executable @cli @work @work-stream
Feature: the list shows what is running

  WHY. A session started from a phone is out of sight. The list is how the operator sees it, with
  the name the Claude app shows, before deciding to end it (ADR-003 §5).

  Background:
    Given a mesh status holding live sessions "s1" and "s2" in workspace "ws-a" ("aof") and "s3" in "ws-n" ("notes")

  Scenario: the list for every local project
    When `mesh:session-list` runs with no project
    Then it answers "s1", "s2" and "s3"

  Scenario: the list reads only
    When `mesh:session-list` runs
    Then nothing is pushed to the relay and no file is written

  Rule: R3 · The list shows only live sessions of the projects asked about

    Scenario: E7 · the list for one project shows only its sessions
      When `aof mesh session list aof --json` runs
      Then it answers "s1" and "s2", each with its node, its start time and its name
      And it does not answer "s3"

    Scenario: a session whose record has expired is not listed
      Given "s2"'s record is past its TTL
      When `mesh:session-list` runs with project "aof"
      Then it answers only "s1"
